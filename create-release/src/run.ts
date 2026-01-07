/**
 * Action runner with dependency injection for testability
 */

import { parser } from 'keep-a-changelog'
import {
  type Changelog,
  buildReleaseParams,
  extractReleaseBody,
  extractTagName,
  findReleaseByTag,
} from './lib'

export interface ActionInputs {
  githubToken: string
  changelogPath: string
  timezone: string
}

export interface ActionContext {
  owner: string
  repo: string
  ref: string
}

export interface ActionDependencies {
  getInput: (name: string, options?: { required?: boolean }) => string
  setOutput: (name: string, value: unknown) => void
  setFailed: (message: string | Error) => void
  debug: (message: string) => void
  info: (message: string) => void
  readFile: (path: string, encoding: 'utf8') => Promise<string>
  getOctokit: (token: string) => OctokitLike
  context: ActionContext
  getEnv: (name: string) => string | undefined
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
    }
  }
}

export async function run(deps: ActionDependencies): Promise<void> {
  try {
    const githubToken = deps.getInput('githubToken', { required: true })
    const changelogPath = deps.getInput('changelogPath', { required: true })

    const octokit = deps.getOctokit(githubToken)
    const { owner, repo } = deps.context

    deps.debug(`Running create-release for ${owner}/${repo}`)

    const changelogContent = await deps.readFile(changelogPath, 'utf8')
    const changelog = parser(changelogContent) as Changelog

    const githubRef = deps.getEnv('GITHUB_REF')
    if (!githubRef) {
      throw new Error('GITHUB_REF environment variable is not set')
    }

    const tagName = extractTagName(githubRef)
    deps.debug(`Found tag_name: ${tagName}`)

    const release = findReleaseByTag(changelog, tagName)
    if (!release) {
      deps.info(`No changelog entry found for tag ${tagName}, skipping release creation`)
      return
    }

    const body = extractReleaseBody(release)
    const params = buildReleaseParams(owner, repo, tagName, body)

    deps.debug(`Creating release with params: ${JSON.stringify(params, null, 2)}`)

    const response = await octokit.rest.repos.createRelease(params)

    deps.debug(`Created release! -> ${JSON.stringify(response.data, null, 2)}`)
    deps.setOutput('release_id', response.data.id)
    deps.setOutput('release_url', response.data.html_url)
    deps.info(`Successfully created release ${tagName}`)
  } catch (error) {
    if (error instanceof Error) {
      deps.setFailed(error.message)
    } else {
      deps.setFailed('An unexpected error occurred')
    }
  }
}
