import { describe, expect, it, mock } from 'bun:test'
import type { ActionDependencies } from './run'
import { run } from './run'

const simpleChangelog = `# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0] - 2024-01-01

### Added
- Initial release
`

function createMockDeps(overrides: Partial<ActionDependencies> = {}): ActionDependencies {
  return {
    getInput: mock((name: string) => {
      const inputs: Record<string, string> = {
        githubToken: 'test-token',
        changelogPath: 'CHANGELOG.md',
        timezone: 'UTC',
        defaultBump: 'patch',
        majorLabels: 'major,breaking',
        minorLabels: 'minor,feature,enhancement',
        patchLabels: 'patch,fix,bugfix',
        skipLabels: 'skip-release,no-release',
      }
      return inputs[name] ?? ''
    }),
    setOutput: mock(() => {}),
    setFailed: mock(() => {}),
    debug: mock(() => {}),
    info: mock(() => {}),
    warning: mock(() => {}),
    readFile: mock(async () => simpleChangelog),
    writeFile: mock(async () => {}),
    getOctokit: mock(() => ({
      rest: {
        repos: {
          createRelease: mock(async () => ({
            data: { id: 123, html_url: 'https://github.com/test/test/releases/tag/v1.0.1' },
          })),
          listTags: mock(async () => ({
            data: [{ name: 'v1.0.0' }],
          })),
        },
        pulls: {
          list: mock(async () => ({
            data: [
              {
                number: 42,
                title: 'Fix critical bug',
                body: '### Fixed\n- Fixed a critical bug',
                labels: [{ name: 'fix' }],
                merge_commit_sha: 'test-sha-123',
                merged_at: '2024-01-15T10:00:00Z',
              },
            ],
          })),
        },
      },
    })),
    context: { owner: 'test-owner', repo: 'test-repo', sha: 'test-sha-123' },
    exec: mock(async () => ({ exitCode: 0, stdout: '', stderr: '' })),
    ...overrides,
  }
}

describe('auto-release run', () => {
  it('should create a release when PR is merged with fix label', async () => {
    const deps = createMockDeps()

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('version', 'v1.0.1')
    expect(deps.setOutput).toHaveBeenCalledWith('tag', 'v1.0.1')
    expect(deps.setOutput).toHaveBeenCalledWith('skipped', 'false')
    expect(deps.writeFile).toHaveBeenCalled()
  })

  it('should use default bump when no version label found', async () => {
    const deps = createMockDeps({
      getOctokit: mock(() => ({
        rest: {
          repos: {
            createRelease: mock(async () => ({
              data: { id: 123, html_url: 'https://github.com/test/test/releases/tag/v1.0.1' },
            })),
            listTags: mock(async () => ({
              data: [{ name: 'v1.0.0' }],
            })),
          },
          pulls: {
            list: mock(async () => ({
              data: [
                {
                  number: 42,
                  title: 'Update docs',
                  body: 'Updated documentation',
                  labels: [{ name: 'docs' }], // No version label
                  merge_commit_sha: 'test-sha-123',
                  merged_at: '2024-01-15T10:00:00Z',
                },
              ],
            })),
          },
        },
      })),
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.info).toHaveBeenCalledWith('No version label found, using default bump: patch')
    expect(deps.setOutput).toHaveBeenCalledWith('version', 'v1.0.1')
  })

  it('should skip release when no merged PR found', async () => {
    const deps = createMockDeps({
      getOctokit: mock(() => ({
        rest: {
          repos: {
            createRelease: mock(async () => ({
              data: { id: 123, html_url: '' },
            })),
            listTags: mock(async () => ({ data: [] })),
          },
          pulls: {
            list: mock(async () => ({ data: [] })),
          },
        },
      })),
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.info).toHaveBeenCalledWith('No merged PR found for this commit, skipping release')
    expect(deps.setOutput).toHaveBeenCalledWith('skipped', 'true')
  })

  it('should skip release when skip label is present', async () => {
    const deps = createMockDeps({
      getOctokit: mock(() => ({
        rest: {
          repos: {
            createRelease: mock(async () => ({
              data: { id: 123, html_url: '' },
            })),
            listTags: mock(async () => ({ data: [{ name: 'v1.0.0' }] })),
          },
          pulls: {
            list: mock(async () => ({
              data: [
                {
                  number: 42,
                  title: 'WIP: Feature',
                  body: 'Work in progress',
                  labels: [{ name: 'skip-release' }],
                  merge_commit_sha: 'test-sha-123',
                  merged_at: '2024-01-15T10:00:00Z',
                },
              ],
            })),
          },
        },
      })),
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.info).toHaveBeenCalledWith('Skipping release due to skip label on PR #42')
    expect(deps.setOutput).toHaveBeenCalledWith('skipped', 'true')
  })

  it('should perform minor bump for feature label', async () => {
    const createReleaseMock = mock(async () => ({
      data: { id: 456, html_url: 'https://github.com/test/test/releases/tag/v1.1.0' },
    }))

    const deps = createMockDeps({
      getOctokit: mock(() => ({
        rest: {
          repos: {
            createRelease: createReleaseMock,
            listTags: mock(async () => ({
              data: [{ name: 'v1.0.0' }],
            })),
          },
          pulls: {
            list: mock(async () => ({
              data: [
                {
                  number: 43,
                  title: 'Add new feature',
                  body: '### Added\n- New awesome feature',
                  labels: [{ name: 'feature' }],
                  merge_commit_sha: 'test-sha-123',
                  merged_at: '2024-01-15T10:00:00Z',
                },
              ],
            })),
          },
        },
      })),
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('version', 'v1.1.0')
  })

  it('should perform major bump for breaking label', async () => {
    const deps = createMockDeps({
      getOctokit: mock(() => ({
        rest: {
          repos: {
            createRelease: mock(async () => ({
              data: { id: 789, html_url: 'https://github.com/test/test/releases/tag/v2.0.0' },
            })),
            listTags: mock(async () => ({
              data: [{ name: 'v1.0.0' }],
            })),
          },
          pulls: {
            list: mock(async () => ({
              data: [
                {
                  number: 44,
                  title: 'Breaking change',
                  body: '### Changed\n- Breaking API change',
                  labels: [{ name: 'breaking' }],
                  merge_commit_sha: 'test-sha-123',
                  merged_at: '2024-01-15T10:00:00Z',
                },
              ],
            })),
          },
        },
      })),
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('version', 'v2.0.0')
  })

  it('should start from v0.0.1 when no tags exist', async () => {
    const deps = createMockDeps({
      getOctokit: mock(() => ({
        rest: {
          repos: {
            createRelease: mock(async () => ({
              data: { id: 123, html_url: 'https://github.com/test/test/releases/tag/v0.0.1' },
            })),
            listTags: mock(async () => ({ data: [] })),
          },
          pulls: {
            list: mock(async () => ({
              data: [
                {
                  number: 1,
                  title: 'Initial commit',
                  body: null,
                  labels: [{ name: 'patch' }],
                  merge_commit_sha: 'test-sha-123',
                  merged_at: '2024-01-15T10:00:00Z',
                },
              ],
            })),
          },
        },
      })),
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('version', 'v0.0.1')
  })

  it('should create changelog if not exists', async () => {
    const writeFileMock = mock(async () => {})
    const deps = createMockDeps({
      readFile: mock(async () => {
        throw new Error('File not found')
      }),
      writeFile: writeFileMock,
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.warning).toHaveBeenCalledWith(
      'Changelog not found at CHANGELOG.md, creating new one',
    )
    expect(writeFileMock).toHaveBeenCalled()
  })

  it('should fail when git operations fail', async () => {
    const deps = createMockDeps({
      exec: mock(async (_cmd: string, args: string[]) => {
        if (args.includes('push')) {
          return { exitCode: 1, stdout: '', stderr: 'Permission denied' }
        }
        return { exitCode: 0, stdout: '', stderr: '' }
      }),
    })

    await run(deps)

    expect(deps.setFailed).toHaveBeenCalledWith('Failed to push release changes: Permission denied')
  })

  it('should fail when invalid defaultBump provided', async () => {
    const deps = createMockDeps({
      getInput: mock((name: string) => {
        if (name === 'defaultBump') return 'invalid'
        const inputs: Record<string, string> = {
          githubToken: 'test-token',
          changelogPath: 'CHANGELOG.md',
          timezone: 'UTC',
          majorLabels: 'major',
          minorLabels: 'minor',
          patchLabels: 'patch',
          skipLabels: 'skip-release',
        }
        return inputs[name] ?? ''
      }),
    })

    await run(deps)

    expect(deps.setFailed).toHaveBeenCalledWith(
      'Invalid defaultBump value: invalid. Must be major, minor, or patch.',
    )
  })
})
