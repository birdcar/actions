const fs = require('fs/promises')
const util = require('util')

const core = require('@actions/core')
const github = require('@actions/github')
const { parser } = require('keep-a-changelog')

async function run () {
  const ghToken = core.getInput('githubToken', { required: true })
  const changelogPath = core.getInput('changelogPath', { required: true })
  const octokit = github.getOctokit(ghToken, {
    userAgent: '@birdcar/actions/create_release',
    timezone: core.getInput('timezone')
  })
  const { owner, repo } = github.context.repo
  core.debug(`context: ${JSON.stringify(github.context, null, 2)}`)

  const changelog = parser(await fs.readFile(changelogPath, 'utf8'))
  const tag_name = process.env.GITHUB_REF.replace(/^refs\/tags\//, '')
  core.debug(`Found tag_name: ${util.inspect(tag_name)}`)

  for (const rel of changelog.releases) {
    // Only create from the release that matches the tag
    core.debug(`rel.version.raw: ${util.inspect(rel.version.raw)}`)
    if (rel.version.raw.trim() != tag_name.trim()) {
      core.debug(`Skipping release: ${rel.version.raw} -> ${util.inspect(rel.version.raw)} != ${util.inspect(tag_name)}`)
      continue
    }

    // Remove the first line of the release notes (it matches the title)
    const body = rel.toString().split('\n').slice(1).join('\n')

    // Create the release
    const res = await octokit.rest.repos.createRelease({
      owner,
      repo,
      body,
      tag_name,
      name: tag_name,
      draft: false,
      prerelease: Boolean(tag_name.match(/v\d.\d.\d-\w*.\d/)),
    }).catch(core.error)
    core.debug(`created release! -> ${JSON.stringify(res.data, null, 2)}`)
  }
}

run()
