
# Create Release

This action automates the creation of GitHub Releases, including release notes, upon the creation of a SemVer tag.

The action is opinionated, and assumes that you will be versioning using SemVer and that your changelog notes will be kept in a specific changelog file formatted to comply with [the KeepAChangelog standard](https://keepachangelog.com/en/1.0.0/).

## Inputs

- `githubToken`: Either the `GITHUB_TOKEN` provided by GitHub Actions for your repository, or an alternate bot token you'd like to provide
- `timezone` (optional): A valid Timezone string from [the Olsen database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- `changelogPath` (optional): The path to a specific Changelog file you'd like parsed for the release notes. Defaults to a file named `CHANGELOG.md` in the root of the repository.

## Example Usage

Below you'll find a complete and ideal example. Copy and paste this into a file named something like `release.yml` and you'll be all set!

```yaml
on:
  push:
    tags:
      - v*

jobs:
  create_release_from_new_tag:
    runs-on: ubuntu-latest
    steps:
      - name: "Checkout repository"
        uses: actions/checkout@v3
      - name: "Create release from new SemVer tag"
        uses: birdcar/actions/dev/create_release@v0.4.0
        with:
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          timezone: 'America/Chicago'
```
