/**
 * Entry point for the poetry-install action
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as cache from '@actions/cache'
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
  debug: core.debug,
  info: core.info,
  warning: core.warning,
  exec: exec.exec,
  saveCache: cache.saveCache,
  restoreCache: cache.restoreCache,
  readFile: safeReadFile,
  getPlatform: () => process.platform,
  joinPath: join,
})
