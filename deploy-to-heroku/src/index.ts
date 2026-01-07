/**
 * Entry point for the deploy-to-heroku action
 */

import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { run } from './run'

run({
  getInput: core.getInput,
  setOutput: core.setOutput,
  setFailed: core.setFailed,
  debug: core.debug,
  info: core.info,
  writeFile,
  exec: exec.exec,
  fetch: globalThis.fetch,
  getEnv: (name) => process.env[name],
  getNetrcPath: () => join(homedir(), '.netrc'),
})
