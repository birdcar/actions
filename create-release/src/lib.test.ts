import { describe, expect, it } from 'bun:test'
import {
  buildReleaseParams,
  extractReleaseBody,
  extractTagName,
  findReleaseByTag,
  getVersionString,
  isPrerelease,
} from './lib'

describe('extractTagName', () => {
  it('should extract tag name from refs/tags/ prefix', () => {
    expect(extractTagName('refs/tags/v1.0.0')).toBe('v1.0.0')
    expect(extractTagName('refs/tags/v2.3.4-beta.1')).toBe('v2.3.4-beta.1')
  })

  it('should return string unchanged if no refs/tags/ prefix', () => {
    expect(extractTagName('v1.0.0')).toBe('v1.0.0')
    expect(extractTagName('main')).toBe('main')
  })
})

describe('isPrerelease', () => {
  it('should return true for prerelease versions', () => {
    expect(isPrerelease('v1.0.0-beta.1')).toBe(true)
    expect(isPrerelease('v2.3.4-alpha.0')).toBe(true)
    expect(isPrerelease('v1.0.0-rc.1')).toBe(true)
    expect(isPrerelease('1.0.0-beta.1')).toBe(true)
  })

  it('should return false for stable versions', () => {
    expect(isPrerelease('v1.0.0')).toBe(false)
    expect(isPrerelease('v2.3.4')).toBe(false)
    expect(isPrerelease('1.0.0')).toBe(false)
  })

  it('should return false for malformed versions', () => {
    expect(isPrerelease('v1.0.0-beta')).toBe(false) // missing number after suffix
    expect(isPrerelease('release-1')).toBe(false)
  })
})

describe('getVersionString', () => {
  it('should return string version as-is', () => {
    const release = { version: '1.2.0', toString: () => '' }
    expect(getVersionString(release)).toBe('1.2.0')
  })

  it('should return raw from object version', () => {
    const release = { version: { raw: 'v1.2.0', toString: () => 'v1.2.0' }, toString: () => '' }
    expect(getVersionString(release)).toBe('v1.2.0')
  })

  it('should use toString if raw is undefined', () => {
    const release = { version: { toString: () => '1.2.0' }, toString: () => '' }
    expect(getVersionString(release)).toBe('1.2.0')
  })
})

describe('findReleaseByTag', () => {
  // Test with string versions (what keep-a-changelog actually returns)
  const mockChangelogStringVersions = {
    releases: [
      { version: '1.2.0', toString: () => '## [1.2.0]\n\n- Feature A' },
      { version: '1.1.0', toString: () => '## [1.1.0]\n\n- Feature B' },
      { version: '1.0.0', toString: () => '## [1.0.0]\n\n- Initial release' },
    ],
  }

  // Test with object versions (for backwards compatibility)
  const mockChangelogObjectVersions = {
    releases: [
      { version: { raw: 'v1.2.0', toString: () => 'v1.2.0' }, toString: () => '## v1.2.0' },
      { version: { raw: 'v1.1.0', toString: () => 'v1.1.0' }, toString: () => '## v1.1.0' },
    ],
  }

  it('should find release matching tag name (string versions)', () => {
    const result = findReleaseByTag(mockChangelogStringVersions, '1.1.0')
    expect(result).toBeDefined()
    if (result) {
      expect(getVersionString(result)).toBe('1.1.0')
    }
  })

  it('should find release matching tag name (object versions)', () => {
    const result = findReleaseByTag(mockChangelogObjectVersions, 'v1.1.0')
    expect(result).toBeDefined()
    if (result) {
      expect(getVersionString(result)).toBe('v1.1.0')
    }
  })

  it('should return undefined for non-existent tag', () => {
    const result = findReleaseByTag(mockChangelogStringVersions, '9.9.9')
    expect(result).toBeUndefined()
  })

  it('should handle whitespace in tag names', () => {
    const result = findReleaseByTag(mockChangelogStringVersions, ' 1.0.0 ')
    expect(result).toBeDefined()
  })
})

describe('extractReleaseBody', () => {
  it('should remove first line from release string', () => {
    const release = {
      version: '1.0.0',
      toString: () => '## [1.0.0]\n\n- Feature A\n- Feature B',
    }

    const body = extractReleaseBody(release)
    expect(body).toBe('\n- Feature A\n- Feature B')
  })

  it('should handle single line release', () => {
    const release = {
      version: '1.0.0',
      toString: () => '## [1.0.0]',
    }

    const body = extractReleaseBody(release)
    expect(body).toBe('')
  })
})

describe('buildReleaseParams', () => {
  it('should build release params for stable version', () => {
    const params = buildReleaseParams('owner', 'repo', 'v1.0.0', 'Release notes')

    expect(params).toEqual({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'v1.0.0',
      body: 'Release notes',
      draft: false,
      prerelease: false,
    })
  })

  it('should set prerelease flag for prerelease versions', () => {
    const params = buildReleaseParams('owner', 'repo', 'v1.0.0-beta.1', 'Beta notes')

    expect(params.prerelease).toBe(true)
  })
})
