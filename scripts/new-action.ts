#!/usr/bin/env bun
/**
 * Script to generate a new minimal GitHub Action
 *
 * Usage: bun run new <action-name>
 * Example: bun run new my-awesome-action
 */

import { exists, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT_DIR = join(import.meta.dir, '..')

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function generatePackageJson(name: string, description: string): string {
  return JSON.stringify(
    {
      name: `@birdcar/${name}`,
      version: '0.1.0',
      private: true,
      type: 'module',
      description,
      main: 'dist/index.js',
      scripts: {
        build: 'bun build src/index.ts --outfile=dist/index.js --target=node --minify',
        test: 'bun test',
      },
      dependencies: {
        '@actions/core': '^1.10.1',
        '@actions/github': '^6.0.0',
      },
    },
    null,
    2,
  )
}

function generateActionYml(name: string, description: string): string {
  const displayName = name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return `name: '${displayName}'
author: 'Nick Cannariato <devrel@birdcar.dev>'
description: '${description}'

inputs:
  github-token:
    required: true
    description: 'GitHub token for API access'
    default: \${{ github.token }}

outputs:
  result:
    description: 'Result of the action'

runs:
  using: 'node20'
  main: 'dist/index.js'
`
}

function generateIndexTs(name: string): string {
  const funcName = toPascalCase(name).replace(/^./, (c) => c.toLowerCase())

  return `import * as core from '@actions/core'
import * as github from '@actions/github'

async function ${funcName}(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true })
    const octokit = github.getOctokit(token)

    const { owner, repo } = github.context.repo
    core.debug(\`Running ${name} for \${owner}/\${repo}\`)

    // TODO: Implement your action logic here

    core.setOutput('result', 'success')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

${funcName}()
`
}

function generateTestTs(name: string): string {
  return `import { describe, expect, it } from 'bun:test'

describe('${name}', () => {
  it('should exist', () => {
    expect(true).toBe(true)
  })

  // TODO: Add actual tests for your action
})
`
}

async function createAction(rawName: string, description: string): Promise<void> {
  const name = toKebabCase(rawName)
  const actionDir = join(ROOT_DIR, name)
  const srcDir = join(actionDir, 'src')
  const distDir = join(actionDir, 'dist')

  // Check if action already exists
  if (await exists(actionDir)) {
    console.error(`Error: Action '${name}' already exists at ${actionDir}`)
    process.exit(1)
  }

  console.log(`Creating new action: ${name}`)
  console.log(`Location: ${actionDir}`)

  // Create directories
  await mkdir(srcDir, { recursive: true })
  await mkdir(distDir, { recursive: true })

  // Write files
  await Promise.all([
    writeFile(join(actionDir, 'package.json'), generatePackageJson(name, description)),
    writeFile(join(actionDir, 'action.yml'), generateActionYml(name, description)),
    writeFile(join(srcDir, 'index.ts'), generateIndexTs(name)),
    writeFile(join(srcDir, 'index.test.ts'), generateTestTs(name)),
    writeFile(join(distDir, '.gitkeep'), ''),
  ])

  console.log('')
  console.log('Action created successfully!')
  console.log('')
  console.log('Next steps:')
  console.log(`  1. cd ${name}`)
  console.log('  2. Edit src/index.ts to implement your action')
  console.log('  3. Add the action to workspaces in package.json')
  console.log('  4. Run "bun install" from the root to link the workspace')
  console.log('  5. Run "bun run build" to build all actions')
}

// Parse arguments
const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: bun run new <action-name> [description]

Arguments:
  action-name   Name for the new action (will be converted to kebab-case)
  description   Optional description for the action

Examples:
  bun run new my-action
  bun run new deploy-preview "Deploy preview environments"
  bun run new syncLabels "Sync issue labels across repos"
`)
  process.exit(0)
}

const actionName = args[0]
const description = args.slice(1).join(' ') || 'A custom GitHub Action'

await createAction(actionName, description)
