/**
 * Mock utilities for @actions/cache
 */

import { mock } from 'bun:test'

export interface MockCacheState {
  cache: Map<string, { paths: string[]; key: string }>
  saveCalls: Array<{ paths: string[]; key: string }>
  restoreCalls: Array<{ paths: string[]; primaryKey: string; restoreKeys?: string[] }>
}

export function createMockCacheState(): MockCacheState {
  return {
    cache: new Map(),
    saveCalls: [],
    restoreCalls: [],
  }
}

export function createMockCache(state: MockCacheState = createMockCacheState()) {
  return {
    saveCache: mock(async (paths: string[], key: string): Promise<number> => {
      state.saveCalls.push({ paths, key })

      if (state.cache.has(key)) {
        throw new Error(`Cache entry with key '${key}' already exists`)
      }

      state.cache.set(key, { paths, key })
      return state.cache.size
    }),

    restoreCache: mock(
      async (
        paths: string[],
        primaryKey: string,
        restoreKeys?: string[],
      ): Promise<string | undefined> => {
        state.restoreCalls.push({ paths, primaryKey, restoreKeys })

        // Check primary key first
        if (state.cache.has(primaryKey)) {
          return primaryKey
        }

        // Check restore keys
        if (restoreKeys) {
          for (const key of restoreKeys) {
            for (const cachedKey of state.cache.keys()) {
              if (cachedKey.startsWith(key)) {
                return cachedKey
              }
            }
          }
        }

        return undefined
      },
    ),

    isFeatureAvailable: mock(() => true),
  }
}

export type MockCache = ReturnType<typeof createMockCache>
