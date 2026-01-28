import { describe, expect, it } from 'bun:test'
import {
  bumpVersion,
  categorizeChanges,
  determineBumpType,
  extractLatestVersion,
  formatChangelogEntry,
  formatVersion,
  generateChangelogEntry,
  getCurrentDate,
  insertChangelogEntry,
  isPrerelease,
  parseLabels,
  parseVersion,
  shouldSkipRelease,
  updateChangelog,
} from './lib'

describe('parseVersion', () => {
  it('should parse version with v prefix', () => {
    expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
  })

  it('should parse version without v prefix', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 })
  })

  it('should parse prerelease version', () => {
    expect(parseVersion('v1.2.3-beta.1')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'beta.1',
    })
  })

  it('should return null for invalid version', () => {
    expect(parseVersion('invalid')).toBeNull()
    expect(parseVersion('v1.2')).toBeNull()
    expect(parseVersion('')).toBeNull()
  })
})

describe('formatVersion', () => {
  it('should format version with v prefix by default', () => {
    expect(formatVersion({ major: 1, minor: 2, patch: 3 })).toBe('v1.2.3')
  })

  it('should format version without v prefix when specified', () => {
    expect(formatVersion({ major: 1, minor: 2, patch: 3 }, false)).toBe('1.2.3')
  })

  it('should include prerelease suffix', () => {
    expect(formatVersion({ major: 1, minor: 2, patch: 3, prerelease: 'beta.1' })).toBe(
      'v1.2.3-beta.1',
    )
  })
})

describe('bumpVersion', () => {
  const base = { major: 1, minor: 2, patch: 3 }

  it('should bump major version and reset minor/patch', () => {
    expect(bumpVersion(base, 'major')).toEqual({ major: 2, minor: 0, patch: 0 })
  })

  it('should bump minor version and reset patch', () => {
    expect(bumpVersion(base, 'minor')).toEqual({ major: 1, minor: 3, patch: 0 })
  })

  it('should bump patch version', () => {
    expect(bumpVersion(base, 'patch')).toEqual({ major: 1, minor: 2, patch: 4 })
  })
})

describe('parseLabels', () => {
  it('should parse comma-separated labels', () => {
    expect(parseLabels('major,minor,patch')).toEqual(['major', 'minor', 'patch'])
  })

  it('should trim whitespace', () => {
    expect(parseLabels(' major , minor , patch ')).toEqual(['major', 'minor', 'patch'])
  })

  it('should lowercase labels', () => {
    expect(parseLabels('MAJOR,Minor,PaTcH')).toEqual(['major', 'minor', 'patch'])
  })

  it('should filter empty strings', () => {
    expect(parseLabels('major,,patch')).toEqual(['major', 'patch'])
  })
})

describe('determineBumpType', () => {
  const majorLabels = ['major', 'breaking']
  const minorLabels = ['minor', 'feature']
  const patchLabels = ['patch', 'fix']

  it('should return major for major labels', () => {
    expect(determineBumpType(['breaking'], majorLabels, minorLabels, patchLabels)).toBe('major')
    expect(determineBumpType(['MAJOR'], majorLabels, minorLabels, patchLabels)).toBe('major')
  })

  it('should return minor for minor labels', () => {
    expect(determineBumpType(['feature'], majorLabels, minorLabels, patchLabels)).toBe('minor')
  })

  it('should return patch for patch labels', () => {
    expect(determineBumpType(['fix'], majorLabels, minorLabels, patchLabels)).toBe('patch')
  })

  it('should return null for no matching labels', () => {
    expect(determineBumpType(['docs', 'ci'], majorLabels, minorLabels, patchLabels)).toBeNull()
  })

  it('should prioritize major over minor over patch', () => {
    expect(
      determineBumpType(['major', 'minor', 'patch'], majorLabels, minorLabels, patchLabels),
    ).toBe('major')
    expect(determineBumpType(['minor', 'patch'], majorLabels, minorLabels, patchLabels)).toBe(
      'minor',
    )
  })
})

describe('shouldSkipRelease', () => {
  const skipLabels = ['skip-release', 'no-release']

  it('should return true when skip label is present', () => {
    expect(shouldSkipRelease(['skip-release', 'feature'], skipLabels)).toBe(true)
    expect(shouldSkipRelease(['NO-RELEASE'], skipLabels)).toBe(true)
  })

  it('should return false when no skip label is present', () => {
    expect(shouldSkipRelease(['feature', 'docs'], skipLabels)).toBe(false)
  })
})

describe('extractLatestVersion', () => {
  it('should extract version from changelog', () => {
    const changelog = '# Changelog\n\n## [v1.2.3] - 2024-01-01\n\nChanges...'
    expect(extractLatestVersion(changelog)).toBe('v1.2.3')
  })

  it('should extract version without v prefix', () => {
    const changelog = '# Changelog\n\n## [1.2.3] - 2024-01-01\n\nChanges...'
    expect(extractLatestVersion(changelog)).toBe('v1.2.3')
  })

  it('should return null when no version found', () => {
    const changelog = '# Changelog\n\nNo versions yet.'
    expect(extractLatestVersion(changelog)).toBeNull()
  })
})

describe('categorizeChanges', () => {
  it('should categorize changes by section headers', () => {
    const body = '### Added\n- New feature\n\n### Fixed\n- Bug fix'
    const categories = categorizeChanges(body)

    expect(categories.get('Added')).toEqual(['New feature'])
    expect(categories.get('Fixed')).toEqual(['Bug fix'])
  })

  it('should auto-categorize by prefix', () => {
    const body = '- feat: New feature\n- fix: Bug fix\n- remove: Old code'
    const categories = categorizeChanges(body)

    expect(categories.get('Added')).toEqual(['New feature'])
    expect(categories.get('Fixed')).toEqual(['Bug fix'])
    expect(categories.get('Removed')).toEqual(['Old code'])
  })

  it('should default uncategorized items to Changed', () => {
    const body = '- Some change without prefix'
    const categories = categorizeChanges(body)

    expect(categories.get('Changed')).toEqual(['Some change without prefix'])
  })

  it('should handle null body', () => {
    const categories = categorizeChanges(null)
    expect(categories.get('Added')).toEqual([])
  })
})

describe('generateChangelogEntry', () => {
  it('should generate entry from PR with body', () => {
    const pr = {
      number: 42,
      title: 'Add new feature',
      body: '### Added\n- New feature X',
      labels: ['feature'],
      mergeCommitSha: 'abc123',
    }

    const entry = generateChangelogEntry(pr, 'v1.2.3', '2024-01-15')

    expect(entry.version).toBe('v1.2.3')
    expect(entry.date).toBe('2024-01-15')
    expect(entry.content).toContain('### Added')
    expect(entry.content).toContain('New feature X')
  })

  it('should use PR title when no body', () => {
    const pr = {
      number: 42,
      title: 'Fix critical bug',
      body: null,
      labels: ['fix'],
      mergeCommitSha: 'abc123',
    }

    const entry = generateChangelogEntry(pr, 'v1.2.4', '2024-01-15')

    expect(entry.content).toContain('Fix critical bug')
  })
})

describe('formatChangelogEntry', () => {
  it('should format entry as markdown', () => {
    const entry = {
      version: 'v1.2.3',
      date: '2024-01-15',
      content: '### Added\n\n- New feature',
    }

    const formatted = formatChangelogEntry(entry)

    expect(formatted).toBe('## [v1.2.3] - 2024-01-15\n\n### Added\n\n- New feature')
  })
})

describe('insertChangelogEntry', () => {
  it('should insert entry before first version', () => {
    const changelog = `# Changelog

## [v1.0.0] - 2024-01-01

- Initial release`

    const entry = {
      version: 'v1.1.0',
      date: '2024-01-15',
      content: '### Added\n\n- New feature',
    }

    const result = insertChangelogEntry(changelog, entry)

    expect(result).toContain('## [v1.1.0] - 2024-01-15')
    expect(result.indexOf('v1.1.0')).toBeLessThan(result.indexOf('v1.0.0'))
  })

  it('should handle changelog with no existing versions', () => {
    const changelog = '# Changelog\n\nNo releases yet.'

    const entry = {
      version: 'v1.0.0',
      date: '2024-01-15',
      content: '### Added\n\n- Initial release',
    }

    const result = insertChangelogEntry(changelog, entry)

    expect(result).toContain('## [v1.0.0] - 2024-01-15')
  })
})

describe('getCurrentDate', () => {
  it('should return date in ISO format', () => {
    const date = getCurrentDate('UTC')
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isPrerelease', () => {
  it('should return true for prerelease versions', () => {
    expect(isPrerelease('v1.0.0-beta')).toBe(true)
    expect(isPrerelease('v1.0.0-alpha.1')).toBe(true)
    expect(isPrerelease('1.0.0-rc.1')).toBe(true)
  })

  it('should return false for stable versions', () => {
    expect(isPrerelease('v1.0.0')).toBe(false)
    expect(isPrerelease('1.0.0')).toBe(false)
  })
})

describe('updateChangelog', () => {
  it('should add a new release to the changelog', () => {
    const changelog = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.0.0] - 2024-01-01

### Added

- Initial release
`
    const prChanges = new Map([
      ['Added', ['New feature X']],
      ['Fixed', ['Bug Y']],
    ])

    const result = updateChangelog(changelog, 'v1.1.0', '2024-01-15', prChanges)

    expect(result).toContain('## [1.1.0]')
    expect(result).toContain('New feature X')
    expect(result).toContain('Bug Y')
  })

  it('should merge [Unreleased] entries with PR changes', () => {
    const changelog = `# Changelog

## [Unreleased]

### Added

- Manual entry from unreleased

## [1.0.0] - 2024-01-01

- Initial release
`
    const prChanges = new Map([
      ['Added', ['PR-generated entry']],
    ])

    const result = updateChangelog(changelog, 'v1.1.0', '2024-01-15', prChanges)

    // Both entries should be present
    expect(result).toContain('Manual entry from unreleased')
    expect(result).toContain('PR-generated entry')
    // [Unreleased] should be cleared
    expect(result).not.toMatch(/## \[Unreleased\][\s\S]*Manual entry/)
  })

  it('should merge with existing version entry (not replace)', () => {
    const changelog = `# Changelog

## [1.1.0] - 2024-01-15

### Added

- Manual entry already in 1.1.0

## [1.0.0] - 2024-01-01

- Initial release
`
    const prChanges = new Map([
      ['Added', ['Another entry for 1.1.0']],
    ])

    const result = updateChangelog(changelog, 'v1.1.0', '2024-01-15', prChanges)

    // Both entries should be present in the same version
    expect(result).toContain('Manual entry already in 1.1.0')
    expect(result).toContain('Another entry for 1.1.0')
  })

  it('should handle empty PR changes', () => {
    const changelog = `# Changelog

## [Unreleased]

### Fixed

- Unreleased fix

## [1.0.0] - 2024-01-01

- Initial release
`
    const prChanges = new Map<string, string[]>([
      ['Added', []],
      ['Changed', []],
    ])

    const result = updateChangelog(changelog, 'v1.1.0', '2024-01-15', prChanges)

    // Unreleased entry should still be merged
    expect(result).toContain('Unreleased fix')
    expect(result).toContain('## [1.1.0]')
  })

  it('should create valid changelog from scratch', () => {
    const changelog = '# Changelog\n\nNo releases yet.\n'
    const prChanges = new Map([
      ['Added', ['First feature']],
    ])

    const result = updateChangelog(changelog, 'v1.0.0', '2024-01-15', prChanges)

    expect(result).toContain('## [1.0.0]')
    expect(result).toContain('First feature')
  })
})
