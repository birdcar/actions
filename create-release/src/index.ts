/**
 * Entry point for the create-release action
 * Wires up real dependencies and runs the action
 */

import { readFile } from 'node:fs/promises'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run'

run({
  getInput: core.getInput,
  setOutput: core.setOutput,
  setFailed: core.setFailed,
  debug: core.debug,
  info: core.info,
  readFile,
  getOctokit: (token) =>
    github.getOctokit(token, {
      userAgent: '@birdcar/actions/create-release',
    }),
  context: {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.ref,
  },
  getEnv: (name) => process.env[name],
})
