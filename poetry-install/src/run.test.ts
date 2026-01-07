import { describe, expect, it, mock } from 'bun:test'
import { samplePoetryLock } from '../../shared/testing/fixtures'
import type { ActionDependencies } from './run'
import {
  computeLockfileHash,
  configurePoetry,
  getVirtualenvPath,
  installDependencies,
  installPoetry,
  restoreDepsCache,
  run,
  saveDepsCache,
} from './run'

function createMockDeps(overrides: Partial<ActionDependencies> = {}): ActionDependencies {
  return {
    getInput: mock((name: string) => {
      const inputs: Record<string, string> = {
        'python-version': '3.11',
        'poetry-version': 'latest',
        'install-args': '',
        'working-directory': '.',
      }
      return inputs[name] ?? ''
    }),
    getBooleanInput: mock((name: string) => {
      const inputs: Record<string, boolean> = {
        'install-dependencies': true,
        'cache-dependencies': true,
      }
      return inputs[name] ?? false
    }),
    setOutput: mock(() => {}),
    setFailed: mock(() => {}),
    debug: mock(() => {}),
    info: mock(() => {}),
    warning: mock(() => {}),
    exec: mock(
      async (
        cmd: string,
        args: string[],
        options?: { listeners?: { stdout?: (data: Buffer) => void } },
      ) => {
        if (cmd === 'poetry' && args[0] === '--version' && options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from('Poetry (version 1.7.1)'))
        }
        return 0
      },
    ),
    saveCache: mock(async () => 1),
    restoreCache: mock(async () => undefined),
    readFile: mock(async () => samplePoetryLock),
    getPlatform: mock(() => 'linux'),
    joinPath: mock((...paths: string[]) => paths.join('/')),
    ...overrides,
  }
}

describe('installPoetry', () => {
  it('should install poetry and return version', async () => {
    const execMock = mock(
      async (
        cmd: string,
        args: string[],
        options?: { listeners?: { stdout?: (data: Buffer) => void } },
      ) => {
        if (cmd === 'poetry' && args[0] === '--version' && options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from('Poetry (version 1.7.1)'))
        }
        return 0
      },
    )

    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    const version = await installPoetry(deps, 'latest')

    expect(version).toBe('1.7.1')
    expect(execMock).toHaveBeenCalledWith('pipx', ['install', 'poetry'])
  })

  it('should install specific version', async () => {
    const execMock = mock(
      async (
        _cmd: string,
        _args: string[],
        options?: { listeners?: { stdout?: (data: Buffer) => void } },
      ) => {
        if (options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from('Poetry (version 1.6.0)'))
        }
        return 0
      },
    )

    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    await installPoetry(deps, '1.6.0')

    expect(execMock).toHaveBeenCalledWith('pipx', ['install', 'poetry', '==1.6.0'])
  })
})

describe('configurePoetry', () => {
  it('should configure virtualenv settings', async () => {
    const execMock = mock(async () => 0)
    const deps = { exec: execMock }

    await configurePoetry(deps, '3.11')

    expect(execMock).toHaveBeenCalledWith('poetry', ['config', 'virtualenvs.in-project', 'true'])
    expect(execMock).toHaveBeenCalledWith('poetry', ['env', 'use', '3.11'])
  })
})

describe('getVirtualenvPath', () => {
  it('should return virtualenv path from poetry', async () => {
    const execMock = mock(
      async (
        _cmd: string,
        _args: string[],
        options?: { listeners?: { stdout?: (data: Buffer) => void } },
      ) => {
        if (options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from('/project/.venv\n'))
        }
        return 0
      },
    )

    const deps = { exec: execMock }

    const path = await getVirtualenvPath(deps, '.')
    expect(path).toBe('/project/.venv')
  })
})

describe('computeLockfileHash', () => {
  it('should compute hash from lockfile content', async () => {
    const deps = {
      readFile: mock(async () => samplePoetryLock),
      warning: mock(() => {}),
      joinPath: mock((...paths: string[]) => paths.join('/')),
    }

    const hash = await computeLockfileHash(deps, '.')
    expect(hash.length).toBe(16)
  })

  it('should return no-lockfile when file not found', async () => {
    const warningMock = mock(() => {})
    const deps = {
      readFile: mock(async () => null),
      warning: warningMock,
      joinPath: mock((...paths: string[]) => paths.join('/')),
    }

    const hash = await computeLockfileHash(deps, '.')
    expect(hash).toBe('no-lockfile')
    expect(warningMock).toHaveBeenCalled()
  })
})

describe('restoreDepsCache', () => {
  it('should return hit=true when cache is restored', async () => {
    // Mock restoreCache to return whatever key is passed to it (simulating a cache hit)
    const restoreCacheMock = mock(async (_paths: string[], primaryKey: string) => primaryKey)

    const deps = {
      restoreCache: restoreCacheMock,
      readFile: mock(async () => 'lockfile content'),
      warning: mock(() => {}),
      joinPath: mock((...paths: string[]) => paths.join('/')),
      getPlatform: mock(() => 'linux'),
      info: mock(() => {}),
    }

    const result = await restoreDepsCache(deps, '.', '3.11')
    expect(result.hit).toBe(true)
    expect(result.key).toContain('poetry-linux-py3.11-')
  })

  it('should return hit=false when cache not found', async () => {
    const deps = {
      restoreCache: mock(async () => undefined),
      readFile: mock(async () => 'lockfile content'),
      warning: mock(() => {}),
      joinPath: mock((...paths: string[]) => paths.join('/')),
      getPlatform: mock(() => 'linux'),
      info: mock(() => {}),
    }

    const result = await restoreDepsCache(deps, '.', '3.11')
    expect(result.hit).toBe(false)
  })
})

describe('saveDepsCache', () => {
  it('should save cache successfully', async () => {
    const saveCacheMock = mock(async () => 1)
    const infoMock = mock(() => {})
    const deps = {
      saveCache: saveCacheMock,
      info: infoMock,
      warning: mock(() => {}),
    }

    await saveDepsCache(deps, '.', 'cache-key')

    expect(saveCacheMock).toHaveBeenCalledWith(['./.venv'], 'cache-key')
    expect(infoMock).toHaveBeenCalledWith('Cache saved successfully')
  })

  it('should handle cache already exists error', async () => {
    const infoMock = mock(() => {})
    const deps = {
      saveCache: mock(async () => {
        throw new Error('Cache entry already exists')
      }),
      info: infoMock,
      warning: mock(() => {}),
    }

    await saveDepsCache(deps, '.', 'cache-key')

    expect(infoMock).toHaveBeenCalledWith('Cache already exists, skipping save')
  })
})

describe('installDependencies', () => {
  it('should run poetry install', async () => {
    const execMock = mock(async () => 0)
    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    await installDependencies(deps, '.', '')

    expect(execMock).toHaveBeenCalledWith('poetry', ['install'], { cwd: '.' })
  })

  it('should pass install args', async () => {
    const execMock = mock(async () => 0)
    const deps = {
      exec: execMock,
      info: mock(() => {}),
    }

    await installDependencies(deps, '.', '--no-dev --sync')

    expect(execMock).toHaveBeenCalledWith('poetry', ['install', '--no-dev', '--sync'], { cwd: '.' })
  })
})

describe('run', () => {
  it('should complete full setup flow', async () => {
    const deps = createMockDeps()

    await run(deps)

    expect(deps.setFailed).not.toHaveBeenCalled()
    expect(deps.setOutput).toHaveBeenCalledWith('poetry-version', '1.7.1')
  })

  it('should skip cache when disabled', async () => {
    const restoreCacheMock = mock(async () => undefined)
    const deps = createMockDeps({
      getBooleanInput: mock((name: string) => {
        if (name === 'cache-dependencies') return false
        if (name === 'install-dependencies') return true
        return false
      }),
      restoreCache: restoreCacheMock,
    })

    await run(deps)

    expect(restoreCacheMock).not.toHaveBeenCalled()
  })

  it('should skip install when disabled', async () => {
    const execMock = mock(
      async (
        cmd: string,
        args: string[],
        options?: { listeners?: { stdout?: (data: Buffer) => void } },
      ) => {
        if (cmd === 'poetry' && args[0] === '--version' && options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from('Poetry (version 1.7.1)'))
        }
        return 0
      },
    )

    const deps = createMockDeps({
      getBooleanInput: mock((name: string) => {
        if (name === 'install-dependencies') return false
        return true
      }),
      exec: execMock,
    })

    await run(deps)

    // Should not have called poetry install
    const installCall = execMock.mock.calls.find(
      (call) => call[0] === 'poetry' && call[1][0] === 'install',
    )
    expect(installCall).toBeUndefined()
  })

  it('should save cache on miss', async () => {
    const saveCacheMock = mock(async () => 1)
    const deps = createMockDeps({
      restoreCache: mock(async () => undefined), // Cache miss
      saveCache: saveCacheMock,
    })

    await run(deps)

    expect(saveCacheMock).toHaveBeenCalled()
  })

  it('should not save cache on hit', async () => {
    const saveCacheMock = mock(async () => 1)
    const deps = createMockDeps({
      restoreCache: mock(async (_paths: string[], key: string) => key), // Cache hit
      saveCache: saveCacheMock,
    })

    await run(deps)

    expect(saveCacheMock).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const deps = createMockDeps({
      exec: mock(async () => {
        throw new Error('pipx not found')
      }),
    })

    await run(deps)

    expect(deps.setFailed).toHaveBeenCalledWith('pipx not found')
  })
})
