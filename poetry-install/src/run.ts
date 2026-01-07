/**
 * Action runner with dependency injection for testability
 */

import {
  buildCacheKey,
  buildCachePaths,
  buildPipxInstallArgs,
  computeHash,
  extractPoetryVersion,
  parseInstallArgs,
} from './lib'

export interface ExecOptions {
  cwd?: string
  listeners?: {
    stdout?: (data: Buffer) => void
  }
}

export interface ActionDependencies {
  getInput: (name: string, options?: { required?: boolean }) => string
  getBooleanInput: (name: string) => boolean
  setOutput: (name: string, value: unknown) => void
  setFailed: (message: string | Error) => void
  debug: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  exec: (command: string, args: string[], options?: ExecOptions) => Promise<number>
  saveCache: (paths: string[], key: string) => Promise<number>
  restoreCache: (paths: string[], primaryKey: string) => Promise<string | undefined>
  readFile: (path: string) => Promise<string | null>
  getPlatform: () => string
  joinPath: (...paths: string[]) => string
}

export async function installPoetry(
  deps: Pick<ActionDependencies, 'exec' | 'info'>,
  version: string,
): Promise<string> {
  deps.info(`Installing Poetry${version !== 'latest' ? ` version ${version}` : ''}...`)

  const installArgs = buildPipxInstallArgs(version)
  await deps.exec('pipx', installArgs)

  // Get installed version
  let installedVersion = ''
  await deps.exec('poetry', ['--version'], {
    listeners: {
      stdout: (data) => {
        installedVersion += data.toString()
      },
    },
  })

  return extractPoetryVersion(installedVersion)
}

export async function configurePoetry(
  deps: Pick<ActionDependencies, 'exec'>,
  pythonVersion: string,
): Promise<void> {
  await deps.exec('poetry', ['config', 'virtualenvs.in-project', 'true'])
  await deps.exec('poetry', ['env', 'use', pythonVersion])
}

export async function getVirtualenvPath(
  deps: Pick<ActionDependencies, 'exec'>,
  workingDirectory: string,
): Promise<string> {
  let venvPath = ''
  await deps.exec('poetry', ['env', 'info', '--path'], {
    cwd: workingDirectory,
    listeners: {
      stdout: (data) => {
        venvPath += data.toString()
      },
    },
  })
  return venvPath.trim()
}

export async function computeLockfileHash(
  deps: Pick<ActionDependencies, 'readFile' | 'warning' | 'joinPath'>,
  workingDirectory: string,
): Promise<string> {
  const lockfilePath = deps.joinPath(workingDirectory, 'poetry.lock')
  const content = await deps.readFile(lockfilePath)

  if (content === null) {
    deps.warning('poetry.lock not found, cache will not be effective')
    return 'no-lockfile'
  }

  return computeHash(content)
}

export async function restoreDepsCache(
  deps: Pick<
    ActionDependencies,
    'restoreCache' | 'info' | 'readFile' | 'warning' | 'joinPath' | 'getPlatform'
  >,
  workingDirectory: string,
  pythonVersion: string,
): Promise<{ hit: boolean; key: string }> {
  const lockfileHash = await computeLockfileHash(deps, workingDirectory)
  const platform = deps.getPlatform()
  const cacheKey = buildCacheKey(platform, pythonVersion, lockfileHash)
  const cachePaths = buildCachePaths(workingDirectory)

  deps.info(`Attempting to restore cache with key: ${cacheKey}`)

  const restoredKey = await deps.restoreCache(cachePaths, cacheKey)

  return {
    hit: restoredKey === cacheKey,
    key: cacheKey,
  }
}

export async function saveDepsCache(
  deps: Pick<ActionDependencies, 'saveCache' | 'info' | 'warning'>,
  workingDirectory: string,
  cacheKey: string,
): Promise<void> {
  const cachePaths = buildCachePaths(workingDirectory)

  try {
    await deps.saveCache(cachePaths, cacheKey)
    deps.info('Cache saved successfully')
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      deps.info('Cache already exists, skipping save')
    } else {
      deps.warning(`Failed to save cache: ${error}`)
    }
  }
}

export async function installDependencies(
  deps: Pick<ActionDependencies, 'exec' | 'info'>,
  workingDirectory: string,
  installArgsStr: string,
): Promise<void> {
  const args = ['install', ...parseInstallArgs(installArgsStr)]
  deps.info(`Running: poetry ${args.join(' ')}`)
  await deps.exec('poetry', args, { cwd: workingDirectory })
}

export async function run(deps: ActionDependencies): Promise<void> {
  try {
    const pythonVersion = deps.getInput('python-version') || '3.11'
    const poetryVersion = deps.getInput('poetry-version') || 'latest'
    const shouldInstall = deps.getBooleanInput('install-dependencies')
    const installArgsStr = deps.getInput('install-args')
    const shouldCache = deps.getBooleanInput('cache-dependencies')
    const workingDirectory = deps.getInput('working-directory') || '.'

    // Install Poetry
    const installedVersion = await installPoetry(deps, poetryVersion)
    deps.setOutput('poetry-version', installedVersion)
    deps.info(`Poetry ${installedVersion} installed`)

    // Configure Poetry
    await configurePoetry(deps, pythonVersion)

    let cacheHit = false
    let cacheKey = ''

    // Restore cache if enabled
    if (shouldCache && shouldInstall) {
      const cacheResult = await restoreDepsCache(deps, workingDirectory, pythonVersion)
      cacheHit = cacheResult.hit
      cacheKey = cacheResult.key
      deps.setOutput('cache-hit', cacheHit.toString())

      if (cacheHit) {
        deps.info('Cache restored successfully')
      }
    }

    // Install dependencies if requested
    if (shouldInstall) {
      await installDependencies(deps, workingDirectory, installArgsStr)

      // Save cache if it wasn't a hit
      if (shouldCache && !cacheHit) {
        await saveDepsCache(deps, workingDirectory, cacheKey)
      }
    }

    // Get virtualenv path
    try {
      const venvPath = await getVirtualenvPath(deps, workingDirectory)
      deps.setOutput('virtualenv-path', venvPath)
    } catch {
      deps.debug('Could not determine virtualenv path')
    }

    deps.info('Poetry setup complete')
  } catch (error) {
    if (error instanceof Error) {
      deps.setFailed(error.message)
    } else {
      deps.setFailed('An unexpected error occurred')
    }
  }
}
