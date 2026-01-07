#!/usr/bin/env bun
/**
 * Detects which actions have changed based on git diff.
 * Used by CI to run targeted tests with coverage.
 *
 * Usage:
 *   bun run scripts/detect-changes.ts [base-ref]
 *
 * If base-ref is not provided, defaults to 'origin/main'.
 * Set GITHUB_BASE_REF environment variable for PR contexts.
 */

import { existsSync, readdirSync } from 'node:fs'
import { $ } from 'bun'

interface ChangeDetectionResult {
  changedActions: string[]
  changedShared: boolean
  changedScripts: boolean
  changedRoot: boolean
  testAll: boolean
}

async function getChangedFiles(baseRef: string): Promise<string[]> {
  try {
    // For PRs, compare against base branch
    const result = await $`git diff --name-only ${baseRef}...HEAD`.text()
    return result.trim().split('\n').filter(Boolean)
  } catch {
    // Fallback: compare against HEAD~1 for direct pushes
    try {
      const result = await $`git diff --name-only HEAD~1`.text()
      return result.trim().split('\n').filter(Boolean)
    } catch {
      // If that fails too, return empty (will test all)
      return []
    }
  }
}

function getAllActions(): string[] {
  // Scan root directory for directories containing action.yml
  return readdirSync('.', { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && existsSync(`${dirent.name}/action.yml`))
    .map((dirent) => dirent.name)
}

function detectChanges(changedFiles: string[]): ChangeDetectionResult {
  const changedActions = new Set<string>()
  let changedShared = false
  let changedScripts = false
  let changedRoot = false

  // Get all action directories to check against
  const allActions = new Set(getAllActions())

  for (const file of changedFiles) {
    // Check for shared code changes
    if (file.startsWith('shared/')) {
      changedShared = true
      continue
    }

    // Check for script changes
    if (file.startsWith('scripts/')) {
      changedScripts = true
      continue
    }

    // Check for root config changes
    if (
      file === 'package.json' ||
      file === 'tsconfig.json' ||
      file === 'biome.json' ||
      file === 'bun.lock'
    ) {
      changedRoot = true
      continue
    }

    // Check if it's an action file (top-level directory that is an action)
    const dirMatch = file.match(/^([^/]+)\//)
    if (dirMatch && allActions.has(dirMatch[1])) {
      changedActions.add(dirMatch[1])
    }
  }

  // Test all actions if shared code, scripts, or root config changed
  const testAll = changedShared || changedScripts || changedRoot || changedFiles.length === 0

  return {
    changedActions: Array.from(changedActions),
    changedShared,
    changedScripts,
    changedRoot,
    testAll,
  }
}

async function main() {
  // Determine base ref
  const baseRef = process.argv[2] || process.env.GITHUB_BASE_REF || 'origin/main'

  console.error(`Comparing against: ${baseRef}`)

  const changedFiles = await getChangedFiles(baseRef)
  console.error(`Changed files: ${changedFiles.length}`)

  const result = detectChanges(changedFiles)
  const allActions = getAllActions()

  // Determine which actions to test
  const actionsToTest = result.testAll ? allActions : result.changedActions

  // Output for GitHub Actions
  const output = {
    actions: actionsToTest,
    testAll: result.testAll,
    changedShared: result.changedShared,
    changedScripts: result.changedScripts,
    changedRoot: result.changedRoot,
    changedActions: result.changedActions,
  }

  // Output as JSON for parsing
  console.log(JSON.stringify(output))

  // Also set GitHub Actions outputs if running in CI
  if (process.env.GITHUB_OUTPUT) {
    const outputFile = Bun.file(process.env.GITHUB_OUTPUT)
    const writer = outputFile.writer()

    writer.write(`actions=${JSON.stringify(actionsToTest)}\n`)
    writer.write(`test-all=${result.testAll}\n`)
    writer.write(`has-changes=${actionsToTest.length > 0}\n`)

    // For matrix strategy
    if (actionsToTest.length > 0) {
      writer.write(`matrix=${JSON.stringify({ action: actionsToTest })}\n`)
    }

    writer.end()
  }
}

main().catch((err) => {
  console.error('Error detecting changes:', err)
  process.exit(1)
})
