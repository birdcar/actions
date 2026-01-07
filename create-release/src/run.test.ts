import { describe, expect, it, mock } from 'bun:test'
import type { ActionDependencies } from './run'
import { run } from './run'

// Simple changelog format that keep-a-changelog parser understands
const simpleChangelog = `# Changelog

## [1.2.0] - 2024-01-15

### Added
- New feature

## [1.1.0] - 2024-01-01

### Fixed
- Bug fix
`

const prereleaseChangelog = `# Changelog

## [2.0.0-beta.1] - 2024-02-01

### Added
- Beta feature
`

function createMockDeps(overrides: Partial<ActionDependencies> = {}): ActionDependencies {
  return {
    getInput: mock((name: string) => {
      const inputs: Record<string, string> = {
        githubToken: 'test-token',
        changelogPath: 'CHANGELOG.md',
        timezone: 'UTC',
      }
      return inputs[name] ?? ''
    }),
    setOutput: mock(() => {}),
    setFailed: mock(() => {}),
    debug: mock(() => {}),
    info: mock(() => {}),
    readFile: mock(async () => simpleChangelog),
    getOctokit: mock(() => ({
      rest: {
        repos: {
          createRelease: mock(async () => ({
            data: { id: 123, html_url: 'https://github.com/test/test/releases/tag/1.2.0' },
          })),
        },
      },
    })),
    context: { owner: 'test-owner', repo: 'test-repo', ref: 'refs/tags/1.2.0' },
    getEnv: mock((name: string) => {
      if (name === 'GITHUB_REF') return 'refs/tags/1.2.0'
      return undefined
    }),
    ...overrides,
  }
}

describe('create-release run', () => {
  it('should create a release for matching tag', async () => {
    const deps = createMockDeps()

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('release_id', 123)
    expect(deps.setOutput).toHaveBeenCalledWith(
      'release_url',
      'https://github.com/test/test/releases/tag/1.2.0',
    )
  })

  it('should skip release creation when no matching tag in changelog', async () => {
    const deps = createMockDeps({
      getEnv: mock((name: string) => {
        if (name === 'GITHUB_REF') return 'refs/tags/9.9.9'
        return undefined
      }),
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.info).toHaveBeenCalledWith(
      'No changelog entry found for tag 9.9.9, skipping release creation',
    )
  })

  it('should fail when GITHUB_REF is not set', async () => {
    const deps = createMockDeps({
      getEnv: mock(() => undefined),
    })

    await run(deps)

    expect(deps.setFailed).toHaveBeenCalledWith('GITHUB_REF environment variable is not set')
  })

  it('should fail when required input is missing', async () => {
    const deps = createMockDeps({
      getInput: mock((name: string, options?: { required?: boolean }) => {
        if (options?.required) throw new Error(`Input required: ${name}`)
        return ''
      }),
    })

    await run(deps)

    expect(deps.setFailed).toHaveBeenCalled()
  })

  it('should mark prerelease for beta versions', async () => {
    const createReleaseMock = mock(async () => ({
      data: { id: 456, html_url: 'https://github.com/test/test/releases/tag/2.0.0-beta.1' },
    }))

    const deps = createMockDeps({
      readFile: mock(async () => prereleaseChangelog),
      getEnv: mock((name: string) => {
        if (name === 'GITHUB_REF') return 'refs/tags/2.0.0-beta.1'
        return undefined
      }),
      getOctokit: mock(() => ({
        rest: {
          repos: {
            createRelease: createReleaseMock,
          },
        },
      })),
    })

    await run(deps)

    expect(createReleaseMock).toHaveBeenCalled()
    const callArgs = createReleaseMock.mock.calls[0][0] as { prerelease: boolean }
    expect(callArgs.prerelease).toBe(true)
  })

  it('should read changelog from specified path', async () => {
    const readFileMock = mock(async () => simpleChangelog)
    const deps = createMockDeps({
      getInput: mock((name: string) => {
        if (name === 'changelogPath') return 'docs/CHANGELOG.md'
        if (name === 'githubToken') return 'test-token'
        return ''
      }),
      readFile: readFileMock,
    })

    await run(deps)

    expect(readFileMock).toHaveBeenCalledWith('docs/CHANGELOG.md', 'utf8')
  })
})
