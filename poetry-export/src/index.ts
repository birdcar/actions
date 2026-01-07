/**
 * Entry point for the poetry-export action
 */

import { readFile } from 'node:fs/promises'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { run } from './run'

async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

run({
  getInput: core.getInput,
  getBooleanInput: core.getBooleanInput,
  setOutput: core.setOutput,
  setFailed: core.setFailed,
  info: core.info,
  readFile: safeReadFile,
  exec: exec.exec,
})
