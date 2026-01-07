/**
 * Pure business logic for poetry-install action
 */

import { createHash } from 'node:crypto'

/**
 * Build the pipx install arguments for Poetry
 */
export function buildPipxInstallArgs(version: string): string[] {
  const args = ['install', 'poetry']
  if (version !== 'latest') {
    args.push(`==${version}`)
  }
  return args
}

/**
 * Extract version number from poetry --version output
 * e.g., "Poetry (version 1.7.1)" -> "1.7.1"
 */
export function extractPoetryVersion(versionOutput: string): string {
  const match = versionOutput.match(/(\d+\.\d+\.\d+)/)
  return match ? match[1] : 'unknown'
}

/**
 * Build the cache key for Poetry dependencies
 */
export function buildCacheKey(
  platform: string,
  pythonVersion: string,
  lockfileHash: string,
): string {
  return `poetry-${platform}-py${pythonVersion}-${lockfileHash}`
}

/**
 * Compute SHA256 hash of content (first 16 chars)
 */
export function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16)
}

/**
 * Parse install args string into array
 */
export function parseInstallArgs(installArgs: string): string[] {
  if (!installArgs) {
    return []
  }
  return installArgs.split(' ').filter(Boolean)
}

/**
 * Build the cache paths for a working directory
 */
export function buildCachePaths(workingDirectory: string): string[] {
  return [`${workingDirectory}/.venv`]
}
