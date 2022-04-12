const fs = require('fs/promises');

const core = require('@actions/core');
const github = require('@actions/github');
const { parser } = require('keep-a-changelog');

async function run() {
  const ghToken = core.getInput('githubToken', { required: true });
  const changelogPath = core.getInput('changelogPath', { required: true });
  const octokit = github.getOctokit(ghToken, {
    userAgent: '@birdcar/actions/create_release',
    timezone: core.getInput('timezone')
  });
  const { owner, repo } = github.context.repo;
  const changelog = parser(await fs.readFile(changelogPath, 'utf8'));
  const tag_name = process.env.GITHUB_REF.replace(/^refs\/tags\/v/, '');

  for (let rel of changelog.releases) {
    // Only create from the release that matches the tag
    if (rel.version.raw !== tag_name) {
      continue;
    }

    // Remove the first line of the release notes (it matches the title)
    const body = rel.toString().split('\n').slice(1).join('\n');

    // Create the release
    await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name,
      name: `v${tag}`,
      body
    }).catch(core.error);

    core.success(`Created release ${tag_name}`);
  }

}

run()