import { describe, expect, it, mock } from 'bun:test'
import type { ActionDependencies } from './run'
import { addHerokuRemote, checkHeartbeat, deployToHeroku, run, setupHerokuAuth } from './run'

function createMockDeps(overrides: Partial<ActionDependencies> = {}): ActionDependencies {
  return {
    getInput: mock((name: string) => {
      const inputs: Record<string, string> = {
        'heroku-username': 'test-user',
        'heroku-api-key': 'test-key',
        'heroku-app-name': 'test-app',
        'heartbeat-url': '',
        branch: 'main',
      }
      return inputs[name] ?? ''
    }),
    setOutput: mock(() => {}),
    setFailed: mock(() => {}),
    debug: mock(() => {}),
    info: mock(() => {}),
    writeFile: mock(async () => {}),
    exec: mock(async () => 0),
    fetch: mock(async () => new Response('OK', { status: 200 })),
    getEnv: mock((name: string) => {
      if (name === 'GITHUB_SHA') return 'abc123def456'
      return undefined
    }),
    getNetrcPath: mock(() => '/home/runner/.netrc'),
    ...overrides,
  }
}

describe('setupHerokuAuth', () => {
  it('should write netrc file with correct content', async () => {
    const writeFileMock = mock(async () => {})
    const deps = {
      writeFile: writeFileMock,
      debug: mock(() => {}),
      getNetrcPath: mock(() => '/home/user/.netrc'),
    }

    await setupHerokuAuth(deps, 'test-user', 'test-key')

    expect(writeFileMock).toHaveBeenCalled()
    const [path, content, options] = writeFileMock.mock.calls[0]
    expect(path).toBe('/home/user/.netrc')
    expect(content).toContain('test-user')
    expect(content).toContain('test-key')
    expect(options).toEqual({ mode: 0o600 })
  })
})

describe('addHerokuRemote', () => {
  it('should call heroku git:remote with correct args', async () => {
    const execMock = mock(async () => 0)
    const deps = {
      exec: execMock,
      debug: mock(() => {}),
    }

    await addHerokuRemote(deps, 'my-app')

    expect(execMock).toHaveBeenCalledWith('heroku', [
      'git:remote',
      '--remote',
      'heroku',
      '--app',
      'my-app',
    ])
  })
})

describe('deployToHeroku', () => {
  it('should push to heroku with correct refspec', async () => {
    const execMock = mock(async () => 0)
    const deps = {
      exec: execMock,
      info: mock(() => {}),
      getEnv: mock((name: string) => (name === 'GITHUB_SHA' ? 'abc123' : undefined)),
    }

    await deployToHeroku(deps, 'main')

    expect(execMock).toHaveBeenCalledWith('git', ['push', '-f', 'heroku', 'abc123:refs/heads/main'])
  })

  it('should throw when GITHUB_SHA is not set', async () => {
    const deps = {
      exec: mock(async () => 0),
      info: mock(() => {}),
      getEnv: mock(() => undefined),
    }

    await expect(deployToHeroku(deps, 'main')).rejects.toThrow(
      'GITHUB_SHA environment variable is not set',
    )
  })
})

describe('checkHeartbeat', () => {
  it('should skip check when URL is empty', async () => {
    const fetchMock = mock(async () => new Response())
    const deps = {
      fetch: fetchMock,
      debug: mock(() => {}),
      info: mock(() => {}),
    }

    await checkHeartbeat(deps, '')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should pass when response is OK', async () => {
    const deps = {
      fetch: mock(async () => new Response('OK', { status: 200 })),
      debug: mock(() => {}),
      info: mock(() => {}),
    }

    await expect(checkHeartbeat(deps, 'https://example.com/health')).resolves.toBeUndefined()
  })

  it('should throw when response is not OK', async () => {
    const deps = {
      fetch: mock(async () => new Response('Not Found', { status: 404, statusText: 'Not Found' })),
      debug: mock(() => {}),
      info: mock(() => {}),
    }

    await expect(checkHeartbeat(deps, 'https://example.com/health')).rejects.toThrow(
      'Heartbeat check failed: 404 Not Found',
    )
  })
})

describe('run', () => {
  it('should complete full deployment flow', async () => {
    const deps = createMockDeps()

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('deploy-url', 'https://test-app.herokuapp.com')
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

  it('should use custom branch when specified', async () => {
    const execMock = mock(async () => 0)
    const deps = createMockDeps({
      getInput: mock((name: string) => {
        if (name === 'branch') return 'master'
        if (name === 'heroku-username') return 'user'
        if (name === 'heroku-api-key') return 'key'
        if (name === 'heroku-app-name') return 'app'
        return ''
      }),
      exec: execMock,
    })

    await run(deps)

    // Find the git push call
    const pushCall = execMock.mock.calls.find((call) => call[0] === 'git' && call[1][0] === 'push')
    expect(pushCall).toBeDefined()
    expect(pushCall?.[1][3]).toContain('refs/heads/master')
  })

  it('should check heartbeat when URL provided', async () => {
    const fetchMock = mock(async () => new Response('OK', { status: 200 }))
    const deps = createMockDeps({
      getInput: mock((name: string) => {
        if (name === 'heartbeat-url') return 'https://app.com/health'
        if (name === 'heroku-username') return 'user'
        if (name === 'heroku-api-key') return 'key'
        if (name === 'heroku-app-name') return 'app'
        return ''
      }),
      fetch: fetchMock,
    })

    await run(deps)

    expect(fetchMock).toHaveBeenCalledWith('https://app.com/health')
  })
})
