#!/usr/bin/env bun
/**
 * Build script for all GitHub Actions in this repository
 *
 * Usage:
 *   bun run build              - Build all actions as bundled JS
 *   bun run build --compile    - Also compile to native executables
 *   bun run build --watch      - Watch mode for development
 *   bun run build <name>       - Build a specific action
 */

import { watch } from 'node:fs'
import { exists, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT_DIR = join(import.meta.dir, '..')

interface BuildOptions {
  compile: boolean
  watch: boolean
  target?: string
}

interface ActionInfo {
  name: string
  dir: string
  srcFile: string
  distDir: string
}

async function findActions(): Promise<ActionInfo[]> {
  const actions: ActionInfo[] = []

  try {
    const entries = await readdir(ROOT_DIR, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const actionDir = join(ROOT_DIR, entry.name)
      const actionYml = join(actionDir, 'action.yml')
      const srcFile = join(actionDir, 'src', 'index.ts')
      const distDir = join(actionDir, 'dist')

      // Only include directories that have action.yml (are GitHub Actions)
      if ((await exists(actionYml)) && (await exists(srcFile))) {
        actions.push({
          name: entry.name,
          dir: actionDir,
          srcFile,
          distDir,
        })
      }
    }
  } catch {
    // Root directory doesn't exist (unlikely)
  }

  return actions
}

async function buildAction(action: ActionInfo, options: BuildOptions): Promise<boolean> {
  const startTime = performance.now()

  console.log(`Building ${action.name}...`)

  try {
    // Ensure dist directory exists
    await mkdir(action.distDir, { recursive: true })

    // Build the bundled JavaScript
    const result = await Bun.build({
      entrypoints: [action.srcFile],
      outdir: action.distDir,
      target: 'node',
      minify: true,
      sourcemap: 'external',
      naming: 'index.js',
    })

    if (!result.success) {
      console.error(`  Failed to build ${action.name}:`)
      for (const log of result.logs) {
        console.error(`    ${log}`)
      }
      return false
    }

    const duration = (performance.now() - startTime).toFixed(0)
    console.log(`  Built ${action.name} in ${duration}ms`)

    // Optionally compile to native executables
    if (options.compile) {
      await compileExecutables(action)
    }

    return true
  } catch (error) {
    console.error(`  Error building ${action.name}:`, error)
    return false
  }
}

async function compileExecutables(action: ActionInfo): Promise<void> {
  const targets = [
    { name: 'linux-x64', target: 'bun-linux-x64' as const },
    { name: 'linux-arm64', target: 'bun-linux-arm64' as const },
    { name: 'darwin-x64', target: 'bun-darwin-x64' as const },
    { name: 'darwin-arm64', target: 'bun-darwin-arm64' as const },
  ]

  const binDir = join(action.distDir, 'bin')
  await mkdir(binDir, { recursive: true })

  console.log('  Compiling native executables...')

  for (const { name, target } of targets) {
    const outPath = join(binDir, `${action.name}-${name}`)

    try {
      const proc = Bun.spawn(
        ['bun', 'build', action.srcFile, '--compile', '--target', target, '--outfile', outPath],
        {
          cwd: action.dir,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      )

      const exitCode = await proc.exited

      if (exitCode === 0) {
        console.log(`    Compiled ${name}`)
      } else {
        const stderr = await new Response(proc.stderr).text()
        console.error(`    Failed to compile ${name}: ${stderr}`)
      }
    } catch (error) {
      console.error(`    Failed to compile ${name}:`, error)
    }
  }
}

async function cleanAction(action: ActionInfo): Promise<void> {
  try {
    await rm(action.distDir, { recursive: true, force: true })
    await mkdir(action.distDir, { recursive: true })
  } catch {
    // Ignore errors
  }
}

async function watchActions(actions: ActionInfo[], options: BuildOptions): Promise<void> {
  console.log('Watching for changes...')

  // Initial build
  for (const action of actions) {
    await buildAction(action, { ...options, compile: false })
  }

  // Watch each action's src directory
  for (const action of actions) {
    const srcDir = join(action.dir, 'src')

    watch(srcDir, { recursive: true }, async (_eventType, filename) => {
      if (filename?.endsWith('.ts') || filename?.endsWith('.tsx')) {
        console.log(`\nChange detected in ${action.name}/${filename}`)
        await buildAction(action, { ...options, compile: false })
      }
    })

    console.log(`  Watching ${action.name}/src/`)
  }

  // Keep the process running
  await new Promise(() => {})
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const options: BuildOptions = {
    compile: args.includes('--compile'),
    watch: args.includes('--watch'),
  }

  // Remove flags from args to get action name if specified
  const targetAction = args.find((arg) => !arg.startsWith('--'))

  const actions = await findActions()

  if (actions.length === 0) {
    console.log('No actions found to build.')
    console.log('Create a new action with: bun run new <action-name>')
    process.exit(0)
  }

  // Filter to specific action if requested
  const actionsToBuild = targetAction ? actions.filter((a) => a.name === targetAction) : actions

  if (targetAction && actionsToBuild.length === 0) {
    console.error(`Action '${targetAction}' not found.`)
    console.log('Available actions:')
    for (const action of actions) {
      console.log(`  - ${action.name}`)
    }
    process.exit(1)
  }

  console.log(`Found ${actionsToBuild.length} action(s) to build\n`)

  if (options.watch) {
    await watchActions(actionsToBuild, options)
    return
  }

  // Clean and build all actions
  let successCount = 0
  let failCount = 0

  for (const action of actionsToBuild) {
    await cleanAction(action)
    const success = await buildAction(action, options)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log('')
  console.log(`Build complete: ${successCount} succeeded, ${failCount} failed`)

  if (failCount > 0) {
    process.exit(1)
  }
}

main()
