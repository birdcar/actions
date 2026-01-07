/**
 * Action runner with dependency injection for testability
 */

import {
  type BumpType,
  type PullRequest,
  bumpVersion,
  determineBumpType,
  formatVersion,
  generateChangelogEntry,
  getCurrentDate,
  insertChangelogEntry,
  isPrerelease,
  parseLabels,
  parseVersion,
  shouldSkipRelease,
} from './lib'

export interface ActionInputs {
  githubToken: string
  changelogPath: string
  timezone: string
  defaultBump: BumpType
  majorLabels: string[]
  minorLabels: string[]
  patchLabels: string[]
  skipLabels: string[]
}

export interface ActionContext {
  owner: string
  repo: string
  sha: string
}

export interface ActionDependencies {
  getInput: (name: string, options?: { required?: boolean }) => string
  setOutput: (name: string, value: unknown) => void
  setFailed: (message: string | Error) => void
  debug: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  readFile: (path: string, encoding: 'utf8') => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  getOctokit: (token: string) => OctokitLike
  context: ActionContext
  exec: (
    command: string,
    args: string[],
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>
}

export interface OctokitLike {
  rest: {
    repos: {
      createRelease: (params: {
        owner: string
        repo: string
        tag_name: string
        name: string
        body: string
        draft: boolean
        prerelease: boolean
      }) => Promise<{ data: { id: number; html_url: string } }>
      listTags: (params: {
        owner: string
        repo: string
        per_page: number
      }) => Promise<{ data: Array<{ name: string }> }>
    }
    pulls: {
      list: (params: {
        owner: string
        repo: string
        state: 'closed'
        sort: 'updated'
        direction: 'desc'
        per_page: number
      }) => Promise<{
        data: Array<{
          number: number
          title: string
          body: string | null
          labels: Array<{ name: string }>
          merge_commit_sha: string | null
          merged_at: string | null
        }>
      }>
    }
  }
}

function getInputs(deps: ActionDependencies): ActionInputs {
  const defaultBump = deps.getInput('defaultBump') as BumpType
  if (!['major', 'minor', 'patch'].includes(defaultBump)) {
    throw new Error(`Invalid defaultBump value: ${defaultBump}. Must be major, minor, or patch.`)
  }

  return {
    githubToken: deps.getInput('githubToken', { required: true }),
    changelogPath: deps.getInput('changelogPath'),
    timezone: deps.getInput('timezone'),
    defaultBump,
    majorLabels: parseLabels(deps.getInput('majorLabels')),
    minorLabels: parseLabels(deps.getInput('minorLabels')),
    patchLabels: parseLabels(deps.getInput('patchLabels')),
    skipLabels: parseLabels(deps.getInput('skipLabels')),
  }
}

async function findMergedPR(
  deps: ActionDependencies,
  octokit: OctokitLike,
  owner: string,
  repo: string,
  sha: string,
): Promise<PullRequest | null> {
  deps.debug(`Looking for merged PR with commit SHA: ${sha}`)

  const { data: prs } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 30,
  })

  for (const pr of prs) {
    if (pr.merge_commit_sha === sha && pr.merged_at) {
      deps.debug(`Found merged PR #${pr.number}: ${pr.title}`)
      return {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        labels: pr.labels.map((l) => l.name),
        mergeCommitSha: pr.merge_commit_sha,
      }
    }
  }

  return null
}

async function getLatestTag(
  deps: ActionDependencies,
  octokit: OctokitLike,
  owner: string,
  repo: string,
): Promise<string | null> {
  deps.debug('Fetching latest tags from repository')

  const { data: tags } = await octokit.rest.repos.listTags({
    owner,
    repo,
    per_page: 100,
  })

  // Find the latest semver tag
  for (const tag of tags) {
    if (/^v?\d+\.\d+\.\d+/.test(tag.name)) {
      deps.debug(`Found latest tag: ${tag.name}`)
      return tag.name
    }
  }

  deps.debug('No existing semver tags found')
  return null
}

async function createTag(
  deps: ActionDependencies,
  tagName: string,
  message: string,
): Promise<void> {
  deps.debug(`Creating tag: ${tagName}`)

  // Configure git
  await deps.exec('git', ['config', 'user.name', 'github-actions[bot]'])
  await deps.exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'])

  // Create and push tag
  const { exitCode, stderr } = await deps.exec('git', ['tag', '-a', tagName, '-m', message])
  if (exitCode !== 0) {
    throw new Error(`Failed to create tag: ${stderr}`)
  }

  const pushResult = await deps.exec('git', ['push', 'origin', tagName])
  if (pushResult.exitCode !== 0) {
    throw new Error(`Failed to push tag: ${pushResult.stderr}`)
  }

  deps.info(`Created and pushed tag: ${tagName}`)
}

async function commitReleaseChanges(
  deps: ActionDependencies,
  changelogPath: string,
  version: string,
): Promise<void> {
  deps.debug(`Committing release changes for ${version}`)

  await deps.exec('git', ['config', 'user.name', 'github-actions[bot]'])
  await deps.exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'])

  // Add changelog
  await deps.exec('git', ['add', changelogPath])

  // Add built dist files (force-add in case they're gitignored)
  await deps.exec('git', ['add', '-f', '*/dist/'])

  const { exitCode, stderr } = await deps.exec('git', ['commit', '-m', `chore: release ${version}`])
  if (exitCode !== 0) {
    throw new Error(`Failed to commit release changes: ${stderr}`)
  }

  const pushResult = await deps.exec('git', ['push'])
  if (pushResult.exitCode !== 0) {
    throw new Error(`Failed to push release changes: ${pushResult.stderr}`)
  }

  deps.info('Committed and pushed release changes')
}

export async function run(deps: ActionDependencies): Promise<void> {
  try {
    const inputs = getInputs(deps)
    const octokit = deps.getOctokit(inputs.githubToken)
    const { owner, repo, sha } = deps.context

    deps.debug(`Running auto-release for ${owner}/${repo} at ${sha}`)

    // Find the merged PR
    const pr = await findMergedPR(deps, octokit, owner, repo, sha)
    if (!pr) {
      deps.info('No merged PR found for this commit, skipping release')
      deps.setOutput('skipped', 'true')
      return
    }

    deps.info(`Processing PR #${pr.number}: ${pr.title}`)

    // Check if release should be skipped
    if (shouldSkipRelease(pr.labels, inputs.skipLabels)) {
      deps.info(`Skipping release due to skip label on PR #${pr.number}`)
      deps.setOutput('skipped', 'true')
      return
    }

    // Determine version bump
    let bumpType = determineBumpType(
      pr.labels,
      inputs.majorLabels,
      inputs.minorLabels,
      inputs.patchLabels,
    )

    if (!bumpType) {
      deps.info(`No version label found, using default bump: ${inputs.defaultBump}`)
      bumpType = inputs.defaultBump
    } else {
      deps.info(`Version bump from labels: ${bumpType}`)
    }

    // Get current version
    const latestTag = await getLatestTag(deps, octokit, owner, repo)
    let currentVersion = parseVersion(latestTag ?? 'v0.0.0')

    if (!currentVersion) {
      deps.warning(`Could not parse version from tag: ${latestTag}, starting from v0.0.0`)
      currentVersion = { major: 0, minor: 0, patch: 0 }
    }

    // Calculate new version
    const newVersion = bumpVersion(currentVersion, bumpType)
    const newTag = formatVersion(newVersion, true)

    deps.info(`Bumping version: ${latestTag ?? 'v0.0.0'} -> ${newTag}`)

    // Read and update changelog
    let changelog: string
    try {
      changelog = await deps.readFile(inputs.changelogPath, 'utf8')
    } catch {
      deps.warning(`Changelog not found at ${inputs.changelogPath}, creating new one`)
      changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

`
    }

    // Generate changelog entry
    const date = getCurrentDate(inputs.timezone)
    const entry = generateChangelogEntry(pr, newTag, date)
    const updatedChangelog = insertChangelogEntry(changelog, entry)

    // Write updated changelog
    await deps.writeFile(inputs.changelogPath, updatedChangelog)
    deps.info(`Updated ${inputs.changelogPath}`)

    // Commit release changes (changelog + dist files)
    await commitReleaseChanges(deps, inputs.changelogPath, newTag)

    // Create and push tag
    await createTag(deps, newTag, `Release ${newTag}`)

    // Create GitHub release
    const releaseBody = entry.content
    const response = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: newTag,
      name: newTag,
      body: releaseBody,
      draft: false,
      prerelease: isPrerelease(newTag),
    })

    deps.info(`Created release: ${response.data.html_url}`)

    // Set outputs
    deps.setOutput('version', newTag)
    deps.setOutput('tag', newTag)
    deps.setOutput('release_url', response.data.html_url)
    deps.setOutput('skipped', 'false')
  } catch (error) {
    if (error instanceof Error) {
      deps.setFailed(error.message)
    } else {
      deps.setFailed('An unexpected error occurred')
    }
  }
}
