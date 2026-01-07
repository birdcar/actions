/**
 * Entry point for the auto-release action
 * Wires up real dependencies and runs the action
 */

import { readFile, writeFile } from 'node:fs/promises'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run'

async function exec(
  command: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve) => {
    const proc = spawn(command, args, { shell: false })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr })
    })

    proc.on('error', (err) => {
      resolve({ exitCode: 1, stdout: '', stderr: err.message })
    })
  })
}

run({
  getInput: core.getInput,
  setOutput: core.setOutput,
  setFailed: core.setFailed,
  debug: core.debug,
  info: core.info,
  warning: core.warning,
  readFile,
  writeFile: (path, content) => writeFile(path, content, 'utf8'),
  getOctokit: (token) =>
    github.getOctokit(token, {
      userAgent: '@birdcar/actions/auto-release',
    }),
  context: {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    sha: github.context.sha,
  },
  exec,
})
