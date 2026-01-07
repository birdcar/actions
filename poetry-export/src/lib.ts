/**
 * Pure business logic for poetry-export action
 */

export interface ExportOptions {
  outputFile: string
  extras: string[]
  withoutHashes: boolean
  includeDev: boolean
}

/**
 * Build the poetry export command arguments
 */
export function buildExportArgs(options: ExportOptions): string[] {
  const args = ['export', '-f', 'requirements.txt', '-o', options.outputFile]

  if (options.withoutHashes) {
    args.push('--without-hashes')
  }

  if (options.includeDev) {
    args.push('--with', 'dev')
  }

  for (const extra of options.extras) {
    args.push('--extras', extra.trim())
  }

  return args
}

/**
 * Parse comma-separated extras into an array
 */
export function parseExtras(extrasInput: string): string[] {
  if (!extrasInput) {
    return []
  }
  return extrasInput.split(',').map((e) => e.trim())
}

/**
 * Determine if file content has changed
 */
export function hasFileChanged(beforeContent: string | null, afterContent: string | null): boolean {
  return beforeContent !== afterContent
}
