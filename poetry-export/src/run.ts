/**
 * Action runner with dependency injection for testability
 */

import { type ExportOptions, buildExportArgs, hasFileChanged, parseExtras } from './lib'

export interface ExecOptions {
  ignoreReturnCode?: boolean
}

export interface ActionDependencies {
  getInput: (name: string, options?: { required?: boolean }) => string
  getBooleanInput: (name: string) => boolean
  setOutput: (name: string, value: unknown) => void
  setFailed: (message: string | Error) => void
  info: (message: string) => void
  readFile: (path: string) => Promise<string | null>
  exec: (command: string, args: string[], options?: ExecOptions) => Promise<number>
}

export async function exportRequirements(
  deps: Pick<ActionDependencies, 'exec' | 'info'>,
  options: ExportOptions,
): Promise<void> {
  const args = buildExportArgs(options)
  deps.info(`Running: poetry ${args.join(' ')}`)
  await deps.exec('poetry', args)
}

export async function commitChanges(
  deps: Pick<ActionDependencies, 'exec' | 'info'>,
  outputFile: string,
  userName: string,
  userEmail: string,
  message: string,
): Promise<void> {
  await deps.exec('git', ['config', 'user.name', userName])
  await deps.exec('git', ['config', 'user.email', userEmail])
  await deps.exec('git', ['add', outputFile])

  // Check if there are changes to commit (exit code 1 means changes exist)
  const exitCode = await deps.exec('git', ['diff', '--cached', '--quiet'], {
    ignoreReturnCode: true,
  })
  const hasChanges = exitCode !== 0

  if (hasChanges) {
    await deps.exec('git', ['commit', '-m', message])
    await deps.exec('git', ['push'])
    deps.info('Changes committed and pushed')
  } else {
    deps.info('No changes to commit')
  }
}

export async function run(deps: ActionDependencies): Promise<void> {
  try {
    const outputFile = deps.getInput('output-file') || 'requirements.txt'
    const extras = parseExtras(deps.getInput('extras'))
    const withoutHashes = deps.getBooleanInput('without-hashes')
    const includeDev = deps.getBooleanInput('dev')
    const shouldCommit = deps.getBooleanInput('commit')
    const gitUserName = deps.getInput('git-user-name')
    const gitUserEmail = deps.getInput('git-user-email')
    const commitMessage = deps.getInput('commit-message')

    // Get content before export to detect changes
    const beforeContent = await deps.readFile(outputFile)

    deps.info(`Exporting Poetry dependencies to ${outputFile}`)
    await exportRequirements(deps, { outputFile, extras, withoutHashes, includeDev })

    // Check if file changed
    const afterContent = await deps.readFile(outputFile)
    const changed = hasFileChanged(beforeContent, afterContent)

    deps.setOutput('output-path', outputFile)
    deps.setOutput('changed', changed.toString())

    if (changed) {
      deps.info(`Generated ${outputFile}`)
    } else {
      deps.info(`${outputFile} is already up to date`)
    }

    if (shouldCommit && changed) {
      await commitChanges(deps, outputFile, gitUserName, gitUserEmail, commitMessage)
    }
  } catch (error) {
    if (error instanceof Error) {
      deps.setFailed(error.message)
    } else {
      deps.setFailed('An unexpected error occurred')
    }
  }
}
