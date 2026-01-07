/**
 * Mock utilities for @actions/core
 *
 * This module provides test doubles for the @actions/core module,
 * allowing you to test actions without side effects.
 */

import { mock } from 'bun:test'

export interface MockCoreState {
  inputs: Record<string, string>
  outputs: Record<string, string>
  exportedVars: Record<string, string>
  secrets: string[]
  paths: string[]
  failed: boolean
  failureMessage: string | null
  debugMessages: string[]
  infoMessages: string[]
  warningMessages: string[]
  errorMessages: string[]
}

export function createMockCoreState(): MockCoreState {
  return {
    inputs: {},
    outputs: {},
    exportedVars: {},
    secrets: [],
    paths: [],
    failed: false,
    failureMessage: null,
    debugMessages: [],
    infoMessages: [],
    warningMessages: [],
    errorMessages: [],
  }
}

export function createMockCore(state: MockCoreState = createMockCoreState()) {
  return {
    getInput: mock((name: string, options?: { required?: boolean }) => {
      const value = state.inputs[name] ?? ''
      if (options?.required && !value) {
        throw new Error(`Input required and not supplied: ${name}`)
      }
      return value
    }),

    getBooleanInput: mock((name: string, options?: { required?: boolean }) => {
      const value = state.inputs[name]?.toLowerCase() ?? ''
      if (options?.required && !value) {
        throw new Error(`Input required and not supplied: ${name}`)
      }
      if (value === 'true') return true
      if (value === 'false') return false
      if (!value) return false
      throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}`)
    }),

    getMultilineInput: mock((name: string, options?: { required?: boolean }) => {
      const value = state.inputs[name] ?? ''
      if (options?.required && !value) {
        throw new Error(`Input required and not supplied: ${name}`)
      }
      return value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    }),

    setOutput: mock((name: string, value: unknown) => {
      state.outputs[name] = String(value)
    }),

    exportVariable: mock((name: string, value: unknown) => {
      state.exportedVars[name] = String(value)
    }),

    setSecret: mock((secret: string) => {
      state.secrets.push(secret)
    }),

    addPath: mock((path: string) => {
      state.paths.push(path)
    }),

    setFailed: mock((message: string | Error) => {
      state.failed = true
      state.failureMessage = message instanceof Error ? message.message : message
    }),

    debug: mock((message: string) => {
      state.debugMessages.push(message)
    }),

    info: mock((message: string) => {
      state.infoMessages.push(message)
    }),

    warning: mock((message: string | Error) => {
      state.warningMessages.push(message instanceof Error ? message.message : message)
    }),

    error: mock((message: string | Error) => {
      state.errorMessages.push(message instanceof Error ? message.message : message)
    }),

    notice: mock(() => {}),
    startGroup: mock(() => {}),
    endGroup: mock(() => {}),
    group: mock(async <T>(_name: string, fn: () => Promise<T>) => fn()),
    isDebug: mock(() => false),
    setCommandEcho: mock(() => {}),
    saveState: mock(() => {}),
    getState: mock(() => ''),
  }
}

export type MockCore = ReturnType<typeof createMockCore>
