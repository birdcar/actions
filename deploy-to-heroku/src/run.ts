/**
 * Action runner with dependency injection for testability
 */

import { buildDeployRefspec, buildHerokuUrl, generateNetrcContent } from './lib'

export interface ActionInputs {
  herokuUsername: string
  herokuApiKey: string
  herokuAppName: string
  heartbeatUrl: string
  branch: string
}

export interface ActionDependencies {
  getInput: (name: string, options?: { required?: boolean }) => string
  setOutput: (name: string, value: unknown) => void
  setFailed: (message: string | Error) => void
  debug: (message: string) => void
  info: (message: string) => void
  writeFile: (path: string, content: string, options?: { mode?: number }) => Promise<void>
  exec: (command: string, args: string[]) => Promise<number>
  fetch: (url: string) => Promise<Response>
  getEnv: (name: string) => string | undefined
  getNetrcPath: () => string
}

export async function setupHerokuAuth(
  deps: Pick<ActionDependencies, 'writeFile' | 'debug' | 'getNetrcPath'>,
  username: string,
  apiKey: string,
): Promise<void> {
  const netrcPath = deps.getNetrcPath()
  const netrcContent = generateNetrcContent(username, apiKey)

  await deps.writeFile(netrcPath, netrcContent, { mode: 0o600 })
  deps.debug('Heroku credentials configured in .netrc')
}

export async function addHerokuRemote(
  deps: Pick<ActionDependencies, 'exec' | 'debug'>,
  appName: string,
): Promise<void> {
  await deps.exec('heroku', ['git:remote', '--remote', 'heroku', '--app', appName])
  deps.debug(`Added Heroku remote for app: ${appName}`)
}

export async function deployToHeroku(
  deps: Pick<ActionDependencies, 'exec' | 'info' | 'getEnv'>,
  branch: string,
): Promise<void> {
  const sha = deps.getEnv('GITHUB_SHA')
  if (!sha) {
    throw new Error('GITHUB_SHA environment variable is not set')
  }

  deps.info(`Deploying commit ${sha} to Heroku...`)
  const refspec = buildDeployRefspec(sha, branch)
  await deps.exec('git', ['push', '-f', 'heroku', refspec])
}

export async function checkHeartbeat(
  deps: Pick<ActionDependencies, 'fetch' | 'debug' | 'info'>,
  url: string,
): Promise<void> {
  if (!url) {
    deps.debug('No heartbeat URL provided, skipping health check')
    return
  }

  deps.info(`Checking heartbeat at ${url}...`)

  const response = await deps.fetch(url)
  if (!response.ok) {
    throw new Error(`Heartbeat check failed: ${response.status} ${response.statusText}`)
  }

  deps.info('Heartbeat check passed')
}

export async function run(deps: ActionDependencies): Promise<void> {
  try {
    const username = deps.getInput('heroku-username', { required: true })
    const apiKey = deps.getInput('heroku-api-key', { required: true })
    const appName = deps.getInput('heroku-app-name', { required: true })
    const heartbeatUrl = deps.getInput('heartbeat-url')
    const branch = deps.getInput('branch') || 'main'

    deps.info(`Deploying to Heroku app: ${appName}`)

    await setupHerokuAuth(deps, username, apiKey)
    await addHerokuRemote(deps, appName)
    await deployToHeroku(deps, branch)
    await checkHeartbeat(deps, heartbeatUrl)

    const deployUrl = buildHerokuUrl(appName)
    deps.setOutput('deploy-url', deployUrl)
    deps.info(`Successfully deployed to ${deployUrl}`)
  } catch (error) {
    if (error instanceof Error) {
      deps.setFailed(error.message)
    } else {
      deps.setFailed('An unexpected error occurred')
    }
  }
}
