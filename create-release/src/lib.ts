/**
 * Pure business logic for create-release action
 * These functions have no side effects and are easily testable.
 */

export interface ChangelogRelease {
  version: string | { raw?: string; toString(): string }
  toString(): string
}

export interface Changelog {
  releases: ChangelogRelease[]
}

/**
 * Get the version string from a release (handles both string and object versions)
 */
export function getVersionString(release: ChangelogRelease): string {
  if (typeof release.version === 'string') {
    return release.version
  }
  return release.version.raw ?? release.version.toString()
}

/**
 * Extract the tag name from a GitHub ref (e.g., refs/tags/v1.0.0 -> v1.0.0)
 */
export function extractTagName(githubRef: string): string {
  return githubRef.replace(/^refs\/tags\//, '')
}

/**
 * Check if a tag represents a prerelease version
 * Matches patterns like: v1.0.0-beta.1, v2.0.0-alpha.0, v1.0.0-rc.1
 */
export function isPrerelease(tagName: string): boolean {
  return /v?\d+\.\d+\.\d+-\w+\.\d+/.test(tagName)
}

/**
 * Find a release in the changelog that matches the given tag
 */
export function findReleaseByTag(
  changelog: Changelog,
  tagName: string,
): ChangelogRelease | undefined {
  return changelog.releases.find((rel) => {
    const version = getVersionString(rel)
    return version.trim() === tagName.trim()
  })
}

/**
 * Extract the release body from a changelog release
 * Removes the first line (which is typically the version header)
 */
export function extractReleaseBody(release: ChangelogRelease): string {
  return release.toString().split('\n').slice(1).join('\n')
}

/**
 * Build the release parameters for the GitHub API
 */
export function buildReleaseParams(
  owner: string,
  repo: string,
  tagName: string,
  body: string,
): {
  owner: string
  repo: string
  tag_name: string
  name: string
  body: string
  draft: boolean
  prerelease: boolean
} {
  return {
    owner,
    repo,
    tag_name: tagName,
    name: tagName,
    body,
    draft: false,
    prerelease: isPrerelease(tagName),
  }
}
