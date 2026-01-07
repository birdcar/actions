import { describe, expect, it } from 'bun:test'
import { buildExportArgs, hasFileChanged, parseExtras } from './lib'

describe('buildExportArgs', () => {
  it('should build basic export args', () => {
    const args = buildExportArgs({
      outputFile: 'requirements.txt',
      extras: [],
      withoutHashes: false,
      includeDev: false,
    })

    expect(args).toEqual(['export', '-f', 'requirements.txt', '-o', 'requirements.txt'])
  })

  it('should add --without-hashes when specified', () => {
    const args = buildExportArgs({
      outputFile: 'requirements.txt',
      extras: [],
      withoutHashes: true,
      includeDev: false,
    })

    expect(args).toContain('--without-hashes')
  })

  it('should add --with dev when includeDev is true', () => {
    const args = buildExportArgs({
      outputFile: 'requirements.txt',
      extras: [],
      withoutHashes: false,
      includeDev: true,
    })

    expect(args).toContain('--with')
    expect(args).toContain('dev')
  })

  it('should add extras arguments', () => {
    const args = buildExportArgs({
      outputFile: 'requirements.txt',
      extras: ['test', 'docs'],
      withoutHashes: false,
      includeDev: false,
    })

    expect(args).toContain('--extras')
    expect(args).toContain('test')
    expect(args).toContain('docs')
  })

  it('should handle custom output file', () => {
    const args = buildExportArgs({
      outputFile: 'deps/requirements-prod.txt',
      extras: [],
      withoutHashes: false,
      includeDev: false,
    })

    expect(args).toContain('deps/requirements-prod.txt')
  })
})

describe('parseExtras', () => {
  it('should return empty array for empty string', () => {
    expect(parseExtras('')).toEqual([])
  })

  it('should parse comma-separated extras', () => {
    expect(parseExtras('test,docs')).toEqual(['test', 'docs'])
  })

  it('should trim whitespace from extras', () => {
    expect(parseExtras('test , docs , dev')).toEqual(['test', 'docs', 'dev'])
  })

  it('should handle single extra', () => {
    expect(parseExtras('test')).toEqual(['test'])
  })
})

describe('hasFileChanged', () => {
  it('should return true when content differs', () => {
    expect(hasFileChanged('old content', 'new content')).toBe(true)
  })

  it('should return false when content is same', () => {
    expect(hasFileChanged('same', 'same')).toBe(false)
  })

  it('should return true when file did not exist before', () => {
    expect(hasFileChanged(null, 'new content')).toBe(true)
  })

  it('should return true when file was deleted', () => {
    expect(hasFileChanged('old content', null)).toBe(true)
  })

  it('should return false when both are null', () => {
    expect(hasFileChanged(null, null)).toBe(false)
  })
})
