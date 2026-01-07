import { describe, expect, it } from 'bun:test'
import { buildDeployRefspec, buildHerokuUrl, generateNetrcContent } from './lib'

describe('generateNetrcContent', () => {
  it('should generate valid netrc content', () => {
    const content = generateNetrcContent('user@example.com', 'api-key-123')

    expect(content).toContain('machine api.heroku.com')
    expect(content).toContain('machine git.heroku.com')
    expect(content).toContain('login user@example.com')
    expect(content).toContain('password api-key-123')
  })

  it('should include both api and git machines', () => {
    const content = generateNetrcContent('user', 'key')

    const apiMachine = content.indexOf('machine api.heroku.com')
    const gitMachine = content.indexOf('machine git.heroku.com')

    expect(apiMachine).toBeGreaterThanOrEqual(0)
    expect(gitMachine).toBeGreaterThanOrEqual(0)
  })
})

describe('buildHerokuUrl', () => {
  it('should build correct Heroku URL', () => {
    expect(buildHerokuUrl('my-app')).toBe('https://my-app.herokuapp.com')
    expect(buildHerokuUrl('test-app-staging')).toBe('https://test-app-staging.herokuapp.com')
  })
})

describe('buildDeployRefspec', () => {
  it('should build correct refspec for main branch', () => {
    expect(buildDeployRefspec('abc123', 'main')).toBe('abc123:refs/heads/main')
  })

  it('should build correct refspec for master branch', () => {
    expect(buildDeployRefspec('def456', 'master')).toBe('def456:refs/heads/master')
  })

  it('should handle long SHA', () => {
    const sha = 'abc123def456789012345678901234567890abcd'
    expect(buildDeployRefspec(sha, 'main')).toBe(`${sha}:refs/heads/main`)
  })
})
