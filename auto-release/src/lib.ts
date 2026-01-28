/**
 * Pure business logic for auto-release action
 * These functions have no side effects and are easily testable.
 */

import { parser, Release, type Changelog } from 'keep-a-changelog'

export type BumpType = 'major' | 'minor' | 'patch'

export interface Version {
  major: number
  minor: number
  patch: number
  prerelease?: string
}

export interface PullRequest {
  number: number
  title: string
  body: string | null
  labels: string[]
  mergeCommitSha: string | null
}

export interface ChangelogEntry {
  version: string
  date: string
  content: string
}

/**
 * Parse a version string into its components
 * Supports formats: v1.2.3, 1.2.3, v1.2.3-beta.1
 */
export function parseVersion(version: string): Version | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/)
  if (!match) return null

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4],
  }
}

/**
 * Format a version object back to a string
 */
export function formatVersion(version: Version, includeV = true): string {
  const base = `${version.major}.${version.minor}.${version.patch}`
  const pre = version.prerelease ? `-${version.prerelease}` : ''
  return includeV ? `v${base}${pre}` : `${base}${pre}`
}

/**
 * Bump a version by the specified type
 */
export function bumpVersion(version: Version, bump: BumpType): Version {
  switch (bump) {
    case 'major':
      return { major: version.major + 1, minor: 0, patch: 0 }
    case 'minor':
      return { major: version.major, minor: version.minor + 1, patch: 0 }
    case 'patch':
      return { major: version.major, minor: version.minor, patch: version.patch + 1 }
  }
}

/**
 * Parse a comma-separated label list into an array
 */
export function parseLabels(labelString: string): string[] {
  return labelString
    .split(',')
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l.length > 0)
}

/**
 * Determine the bump type from PR labels
 * Returns null if no matching label found
 */
export function determineBumpType(
  prLabels: string[],
  majorLabels: string[],
  minorLabels: string[],
  patchLabels: string[],
): BumpType | null {
  const normalizedPrLabels = prLabels.map((l) => l.toLowerCase())

  // Check in order of precedence: major > minor > patch
  if (majorLabels.some((l) => normalizedPrLabels.includes(l))) {
    return 'major'
  }
  if (minorLabels.some((l) => normalizedPrLabels.includes(l))) {
    return 'minor'
  }
  if (patchLabels.some((l) => normalizedPrLabels.includes(l))) {
    return 'patch'
  }

  return null
}

/**
 * Check if release should be skipped based on labels
 */
export function shouldSkipRelease(prLabels: string[], skipLabels: string[]): boolean {
  const normalizedPrLabels = prLabels.map((l) => l.toLowerCase())
  return skipLabels.some((l) => normalizedPrLabels.includes(l))
}

/**
 * Extract the latest version from a changelog content
 */
export function extractLatestVersion(changelogContent: string): string | null {
  // Match version headers like: ## [v1.2.3] or ## [1.2.3]
  const versionMatch = changelogContent.match(/^##\s*\[v?(\d+\.\d+\.\d+(?:-[^\]]+)?)\]/m)
  if (!versionMatch) return null

  // Return with v prefix for consistency
  const version = versionMatch[1]
  return version.startsWith('v') ? version : `v${version}`
}

/**
 * Categorize changes from PR body into keep-a-changelog sections
 * Looks for markdown headers or bullet points with conventional prefixes
 */
export function categorizeChanges(prBody: string | null): Map<string, string[]> {
  const categories = new Map<string, string[]>([
    ['Added', []],
    ['Changed', []],
    ['Deprecated', []],
    ['Removed', []],
    ['Fixed', []],
    ['Security', []],
  ])

  if (!prBody) return categories

  const lines = prBody.split('\n')
  let currentSection: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Check for section headers (### Added, ## Changed, etc.)
    const headerMatch = trimmed.match(
      /^#+\s*(Added|Changed|Deprecated|Removed|Fixed|Security)\s*$/i,
    )
    if (headerMatch) {
      currentSection =
        headerMatch[1].charAt(0).toUpperCase() + headerMatch[1].slice(1).toLowerCase()
      continue
    }

    // Check for bullet points with conventional commit prefixes
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      const content = bulletMatch[1]

      // If we're in a section, add to that section
      if (currentSection && categories.has(currentSection)) {
        categories.get(currentSection)?.push(content)
        continue
      }

      // Try to auto-categorize based on prefixes
      const lowerContent = content.toLowerCase()
      if (lowerContent.startsWith('feat:') || lowerContent.startsWith('add:')) {
        categories.get('Added')?.push(content.replace(/^(feat|add):\s*/i, ''))
      } else if (lowerContent.startsWith('fix:') || lowerContent.startsWith('bug:')) {
        categories.get('Fixed')?.push(content.replace(/^(fix|bug):\s*/i, ''))
      } else if (lowerContent.startsWith('remove:') || lowerContent.startsWith('delete:')) {
        categories.get('Removed')?.push(content.replace(/^(remove|delete):\s*/i, ''))
      } else if (lowerContent.startsWith('deprecate:')) {
        categories.get('Deprecated')?.push(content.replace(/^deprecate:\s*/i, ''))
      } else if (lowerContent.startsWith('security:')) {
        categories.get('Security')?.push(content.replace(/^security:\s*/i, ''))
      } else if (currentSection) {
        // If in a section but no prefix, add to current section
        categories.get(currentSection)?.push(content)
      } else {
        // Default to Changed for untagged items
        categories.get('Changed')?.push(content)
      }
    }
  }

  return categories
}

/**
 * Generate changelog entry content from PR information
 */
export function generateChangelogEntry(
  pr: PullRequest,
  version: string,
  date: string,
): ChangelogEntry {
  const categories = categorizeChanges(pr.body)

  // Build the changelog content
  const sections: string[] = []

  // If no categorized changes found, use the PR title as the main change
  let hasChanges = false
  for (const items of categories.values()) {
    if (items.length > 0) {
      hasChanges = true
      break
    }
  }

  if (!hasChanges) {
    // Use PR title as the change description
    categories.get('Changed')?.push(pr.title)
  }

  // Build sections
  for (const [section, items] of categories) {
    if (items.length > 0) {
      sections.push(`### ${section}\n`)
      for (const item of items) {
        sections.push(`- ${item}`)
      }
      sections.push('')
    }
  }

  return {
    version,
    date,
    content: sections.join('\n').trim(),
  }
}

/**
 * Format a changelog entry as markdown
 */
export function formatChangelogEntry(entry: ChangelogEntry): string {
  return `## [${entry.version}] - ${entry.date}\n\n${entry.content}`
}

/**
 * Insert a new changelog entry after the header
 */
export function insertChangelogEntry(changelog: string, entry: ChangelogEntry): string {
  const entryText = formatChangelogEntry(entry)

  // Find the first version header
  const firstVersionMatch = changelog.match(/^(##\s*\[v?\d+)/m)

  if (firstVersionMatch?.index !== undefined) {
    // Insert before the first version
    const before = changelog.slice(0, firstVersionMatch.index)
    const after = changelog.slice(firstVersionMatch.index)
    return `${before}${entryText}\n\n${after}`
  }

  // No existing versions, append after any header content
  // Look for the end of the header section (after "Keep a Changelog" line or similar)
  const headerEndMatch = changelog.match(/^(#[^#].*\n(?:.*\n)*?)\n/m)
  if (headerEndMatch) {
    const headerEnd = headerEndMatch[0].length
    const before = changelog.slice(0, headerEnd)
    const after = changelog.slice(headerEnd)
    return `${before}\n${entryText}\n${after}`
  }

  // Just append
  return `${changelog}\n\n${entryText}`
}

/**
 * Get current date in ISO format for the given timezone
 */
export function getCurrentDate(timezone: string): string {
  const now = new Date()
  // Use Intl.DateTimeFormat to handle timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

/**
 * Check if a tag represents a prerelease version
 */
export function isPrerelease(tagName: string): boolean {
  return /v?\d+\.\d+\.\d+-\w+/.test(tagName)
}

/**
 * Update changelog using keep-a-changelog library
 * Merges [Unreleased] entries + PR-generated entries into the new version
 * If version already exists (manual entry), merges with it instead of replacing
 */
export function updateChangelog(
  changelogContent: string,
  version: string,
  date: string,
  prChanges: Map<string, string[]>,
): string {
  let changelog: Changelog

  try {
    changelog = parser(changelogContent)
  } catch {
    // If parsing fails, create a new changelog
    const { Changelog } = require('keep-a-changelog')
    changelog = new Changelog('Changelog')
  }

  // Strip 'v' prefix for keep-a-changelog (it uses bare versions)
  const bareVersion = version.replace(/^v/, '')

  // Check if version already exists (manual entry)
  let release = changelog.releases.find((r: Release) => r.version?.toString() === bareVersion)
  const isNewRelease = !release

  if (isNewRelease) {
    release = new Release(bareVersion, date)
    changelog.addRelease(release)
  }

  // Get content from [Unreleased] section and merge
  const unreleasedIndex = changelog.releases.findIndex((r: Release) => !r.version)
  if (unreleasedIndex !== -1) {
    const unreleased = changelog.releases[unreleasedIndex]
    // Concatenate unreleased entries into the release
    const changes = unreleased.changes as Map<string, Array<{ title: string }>>
    for (const [type, items] of changes) {
      for (const item of items) {
        const methodName = type.toLowerCase() as 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security'
        if (typeof release[methodName] === 'function') {
          release[methodName](item.title)
        }
      }
    }
    // Clear unreleased by replacing with a fresh Release (no version = unreleased)
    changelog.releases[unreleasedIndex] = new Release()
  }

  // Add PR-generated entries (concatenate, don't replace)
  for (const [category, items] of prChanges) {
    for (const item of items) {
      const methodName = category.toLowerCase() as 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security'
      if (typeof release[methodName] === 'function') {
        release[methodName](item)
      }
    }
  }

  // Convert to string and add brackets around versions for compatibility
  let result = changelog.toString()

  // Add brackets around version numbers in headers: "## 1.0.0" -> "## [1.0.0]"
  result = result.replace(/^(## )(\d+\.\d+\.\d+(?:-[^\s]+)?)/gm, '$1[$2]')

  return result
}
