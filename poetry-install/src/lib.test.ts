import { describe, expect, it } from 'bun:test'
import {
  buildCacheKey,
  buildCachePaths,
  buildPipxInstallArgs,
  computeHash,
  extractPoetryVersion,
  parseInstallArgs,
} from './lib'

describe('buildPipxInstallArgs', () => {
  it('should build args for latest version', () => {
    expect(buildPipxInstallArgs('latest')).toEqual(['install', 'poetry'])
  })

  it('should include version specifier for specific version', () => {
    expect(buildPipxInstallArgs('1.7.1')).toEqual(['install', 'poetry', '==1.7.1'])
  })
})

describe('extractPoetryVersion', () => {
  it('should extract version from poetry output', () => {
    expect(extractPoetryVersion('Poetry (version 1.7.1)')).toBe('1.7.1')
  })

  it('should extract version from alternative format', () => {
    expect(extractPoetryVersion('Poetry version 1.8.0')).toBe('1.8.0')
  })

  it('should return unknown for invalid format', () => {
    expect(extractPoetryVersion('Invalid output')).toBe('unknown')
  })
})

describe('buildCacheKey', () => {
  it('should build correct cache key', () => {
    const key = buildCacheKey('darwin', '3.11', 'abc123')
    expect(key).toBe('poetry-darwin-py3.11-abc123')
  })

  it('should handle different platforms', () => {
    expect(buildCacheKey('linux', '3.10', 'def456')).toBe('poetry-linux-py3.10-def456')
    expect(buildCacheKey('win32', '3.12', 'ghi789')).toBe('poetry-win32-py3.12-ghi789')
  })
})

describe('computeHash', () => {
  it('should return consistent hash for same content', () => {
    const hash1 = computeHash('test content')
    const hash2 = computeHash('test content')
    expect(hash1).toBe(hash2)
  })

  it('should return different hash for different content', () => {
    const hash1 = computeHash('content a')
    const hash2 = computeHash('content b')
    expect(hash1).not.toBe(hash2)
  })

  it('should return 16 character hash', () => {
    const hash = computeHash('any content')
    expect(hash.length).toBe(16)
  })
})

describe('parseInstallArgs', () => {
  it('should return empty array for empty string', () => {
    expect(parseInstallArgs('')).toEqual([])
  })

  it('should split space-separated args', () => {
    expect(parseInstallArgs('--no-dev --sync')).toEqual(['--no-dev', '--sync'])
  })

  it('should filter empty strings', () => {
    expect(parseInstallArgs('--no-dev  --sync')).toEqual(['--no-dev', '--sync'])
  })
})

describe('buildCachePaths', () => {
  it('should return venv path for working directory', () => {
    expect(buildCachePaths('.')).toEqual(['./.venv'])
  })

  it('should handle subdirectory', () => {
    expect(buildCachePaths('packages/core')).toEqual(['packages/core/.venv'])
  })
})
