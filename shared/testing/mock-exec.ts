/**
 * Mock utilities for @actions/exec
 */

import { mock } from 'bun:test'

export interface ExecCall {
  command: string
  args: string[]
  options?: ExecOptions
}

export interface ExecOptions {
  cwd?: string
  env?: Record<string, string>
  silent?: boolean
  ignoreReturnCode?: boolean
  listeners?: {
    stdout?: (data: Buffer) => void
    stderr?: (data: Buffer) => void
  }
}

export interface MockExecState {
  calls: ExecCall[]
  mockResults: Map<string, { exitCode: number; stdout?: string; stderr?: string }>
  defaultExitCode: number
}

export function createMockExecState(): MockExecState {
  return {
    calls: [],
    mockResults: new Map(),
    defaultExitCode: 0,
  }
}

export function createMockExec(state: MockExecState = createMockExecState()) {
  const execFn = mock(
    async (command: string, args: string[] = [], options: ExecOptions = {}): Promise<number> => {
      state.calls.push({ command, args, options })

      const key = `${command} ${args.join(' ')}`.trim()
      const result = state.mockResults.get(key)

      if (result) {
        if (result.stdout && options.listeners?.stdout) {
          options.listeners.stdout(Buffer.from(result.stdout))
        }
        if (result.stderr && options.listeners?.stderr) {
          options.listeners.stderr(Buffer.from(result.stderr))
        }
        return result.exitCode
      }

      return state.defaultExitCode
    },
  )

  return {
    exec: execFn,
    getExecOutput: mock(
      async (
        command: string,
        args: string[] = [],
        options: ExecOptions = {},
      ): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
        state.calls.push({ command, args, options })

        const key = `${command} ${args.join(' ')}`.trim()
        const result = state.mockResults.get(key)

        return {
          exitCode: result?.exitCode ?? state.defaultExitCode,
          stdout: result?.stdout ?? '',
          stderr: result?.stderr ?? '',
        }
      },
    ),
  }
}

export type MockExec = ReturnType<typeof createMockExec>

/**
 * Helper to set up a mock result for a specific command
 */
export function mockExecResult(
  state: MockExecState,
  command: string,
  args: string[],
  result: { exitCode: number; stdout?: string; stderr?: string },
): void {
  const key = `${command} ${args.join(' ')}`.trim()
  state.mockResults.set(key, result)
}
