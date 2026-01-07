/**
 * Shared utilities for GitHub Actions
 */

import * as core from '@actions/core'

/**
 * Wrapper for action main functions that handles errors consistently
 */
export async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

/**
 * Get a required input or throw an error
 */
export function getRequiredInput(name: string): string {
  const value = core.getInput(name, { required: true })
  if (!value) {
    throw new Error(`Required input '${name}' is missing`)
  }
  return value
}

/**
 * Get an optional input with a default value
 */
export function getOptionalInput(name: string, defaultValue: string): string {
  return core.getInput(name) || defaultValue
}

/**
 * Get the current GitHub ref tag name (strips refs/tags/ prefix)
 */
export function getTagName(): string {
  const githubRef = process.env.GITHUB_REF
  if (!githubRef) {
    throw new Error('GITHUB_REF environment variable is not set')
  }
  return githubRef.replace(/^refs\/tags\//, '')
}

/**
 * Check if a tag represents a prerelease version
 */
export function isPrerelease(tagName: string): boolean {
  return /v?\d+\.\d+\.\d+-\w+(\.\d+)?/.test(tagName)
}
