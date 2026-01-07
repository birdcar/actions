import { describe, expect, it, mock } from 'bun:test'
import type { ActionDependencies } from './run'
import { commitChanges, exportRequirements, run } from './run'

function createMockDeps(overrides: Partial<ActionDependencies> = {}): ActionDependencies {
  return {
    getInput: mock((name: string) => {
      const inputs: Record<string, string> = {
        'output-file': 'requirements.txt',
        extras: '',
        'git-user-name': 'github-actions[bot]',
        'git-user-email': 'github-actions[bot]@users.noreply.github.com',
        'commit-message': 'chore: update requirements.txt',
      }
      return inputs[name] ?? ''
    }),
    getBooleanInput: mock((name: string) => {
      const inputs: Record<string, boolean> = {
        'without-hashes': false,
        dev: false,
        commit: false,
      }
      return inputs[name] ?? false
    }),
    setOutput: mock(() => {}),
    setFailed: mock(() => {}),
    info: mock(() => {}),
    readFile: mock(async () => null),
    exec: mock(async () => 0),
    ...overrides,
  }
}

describe('exportRequirements', () => {
  it('should run poetry export with correct args', async () => {
    const execMock = mock(async () => 0)
    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    await exportRequirements(deps, {
      outputFile: 'requirements.txt',
      extras: [],
      withoutHashes: false,
      includeDev: false,
    })

    expect(execMock).toHaveBeenCalledWith('poetry', [
      'export',
      '-f',
      'requirements.txt',
      '-o',
      'requirements.txt',
    ])
  })

  it('should include extras in command', async () => {
    const execMock = mock(async () => 0)
    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    await exportRequirements(deps, {
      outputFile: 'requirements.txt',
      extras: ['test', 'docs'],
      withoutHashes: true,
      includeDev: true,
    })

    const [, args] = execMock.mock.calls[0]
    expect(args).toContain('--without-hashes')
    expect(args).toContain('--with')
    expect(args).toContain('dev')
    expect(args).toContain('--extras')
  })
})

describe('commitChanges', () => {
  it('should configure git and commit changes', async () => {
    const execMock = mock(async () => 1) // Non-zero means changes exist
    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    await commitChanges(deps, 'requirements.txt', 'bot', 'bot@example.com', 'commit message')

    const calls = execMock.mock.calls
    expect(calls[0]).toEqual(['git', ['config', 'user.name', 'bot']])
    expect(calls[1]).toEqual(['git', ['config', 'user.email', 'bot@example.com']])
    expect(calls[2]).toEqual(['git', ['add', 'requirements.txt']])
  })

  it('should skip commit when no changes', async () => {
    const execMock = mock(async () => 0) // Zero means no changes
    const infoMock = mock(() => {})
    const deps = {
      exec: execMock,
      info: infoMock,
    }

    await commitChanges(deps, 'requirements.txt', 'bot', 'bot@example.com', 'commit message')

    // Should not have called git commit
    const commitCall = execMock.mock.calls.find(
      (call) => call[0] === 'git' && call[1][0] === 'commit',
    )
    expect(commitCall).toBeUndefined()
    expect(infoMock).toHaveBeenCalledWith('No changes to commit')
  })

  it('should commit and push when changes exist', async () => {
    // Return 1 for diff (has changes), 0 for others
    const execMock = mock(async (cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'diff') return 1
      return 0
    })
    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    await commitChanges(deps, 'requirements.txt', 'bot', 'bot@example.com', 'commit message')

    const commitCall = execMock.mock.calls.find(
      (call) => call[0] === 'git' && call[1][0] === 'commit',
    )
    const pushCall = execMock.mock.calls.find((call) => call[0] === 'git' && call[1][0] === 'push')

    expect(commitCall).toBeDefined()
    expect(pushCall).toBeDefined()
  })
})

describe('run', () => {
  it('should export requirements and set outputs', async () => {
    const deps = createMockDeps({
      readFile: mock(async (path: string) => {
        // Simulate file change
        if (path === 'requirements.txt') return null // First read - file doesn't exist
        return 'requests==2.31.0' // After export
      }),
    })

    // Simulate file creation
    let fileContent: string | null = null
    deps.readFile = mock(async () => {
      const result = fileContent
      fileContent = 'requests==2.31.0' // Set for next read
      return result
    })

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('output-path', 'requirements.txt')
    expect(deps.setOutput).toHaveBeenCalledWith('changed', 'true')
  })

  it('should detect when file has not changed', async () => {
    const content = 'requests==2.31.0'
    const deps = createMockDeps({
      readFile: mock(async () => content),
    })

    await run(deps)

    expect(deps.setOutput).toHaveBeenCalledWith('changed', 'false')
  })

  it('should commit when commit option is true and file changed', async () => {
    let fileContent: string | null = null
    const execMock = mock(async (cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'diff') return 1 // Has changes
      return 0
    })

    const deps = createMockDeps({
      getBooleanInput: mock((name: string) => {
        if (name === 'commit') return true
        return false
      }),
      readFile: mock(async () => {
        const result = fileContent
        fileContent = 'new content'
        return result
      }),
      exec: execMock,
    })

    await run(deps)

    const commitCall = execMock.mock.calls.find(
      (call) => call[0] === 'git' && call[1][0] === 'commit',
    )
    expect(commitCall).toBeDefined()
  })

  it('should not commit when file has not changed', async () => {
    const content = 'requests==2.31.0'
    const execMock = mock(async () => 0)

    const deps = createMockDeps({
      getBooleanInput: mock((name: string) => {
        if (name === 'commit') return true
        return false
      }),
      readFile: mock(async () => content),
      exec: execMock,
    })

    await run(deps)

    // Should only have poetry export, no git commit
    const commitCall = execMock.mock.calls.find(
      (call) => call[0] === 'git' && call[1][0] === 'commit',
    )
    expect(commitCall).toBeUndefined()
  })

  it('should handle errors gracefully', async () => {
    const deps = createMockDeps({
      exec: mock(async () => {
        throw new Error('Poetry not found')
      }),
    })

    await run(deps)

    expect(deps.setFailed).toHaveBeenCalledWith('Poetry not found')
  })
})
