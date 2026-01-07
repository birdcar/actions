# AGENTS.md

This document provides comprehensive guidance for AI agents and developers working with the `@birdcar/actions` repository.

## Repository Overview

This is a private monorepo containing reusable GitHub Actions, built with:

- **Runtime:** Bun (JavaScript/TypeScript runtime)
- **Language:** TypeScript with strict type checking
- **Linting:** Biome (Rust-based linter/formatter)
- **Versioning:** Semantic Versioning with Keep a Changelog format
- **Target:** Node 20 runtime for all actions

## Repository Structure

```
actions/                        # Repository root
├── auto-release/              # Auto-creates releases from merged PRs
├── create-release/            # Creates releases from pushed tags
├── deploy-to-heroku/          # Deploys apps to Heroku
├── poetry-install/            # Installs Poetry with caching
├── poetry-export/             # Exports poetry.lock to requirements.txt
├── shared/                    # Shared utilities across actions
│   └── action-utils.ts
├── scripts/                   # Build and development scripts
│   ├── build.ts              # Compiles actions to dist/
│   ├── new-action.ts         # Scaffolds new actions
│   └── detect-changes.ts     # CI change detection
├── .github/
│   └── workflows/
│       ├── ci.yml            # Continuous integration
│       ├── auto-release.yml  # Automatic release on PR merge
│       └── release.yml       # Release creation on tag push
├── CHANGELOG.md              # Version history (Keep a Changelog format)
├── package.json              # Workspace configuration
├── tsconfig.json             # TypeScript configuration
└── biome.json                # Linter configuration
```

## Working with the Repository

### Initial Setup

```bash
# Install dependencies
bun install
```

### Building Actions

```bash
# Build all actions
bun run build

# Build specific action
bun run build <action-name>

# Watch mode for development
bun run build --watch

# Build with native executables (cross-platform)
bun run build --compile
```

Each action compiles from `<name>/src/index.ts` to `<name>/dist/index.js`.

### Testing

```bash
# Run all tests
bun test

# Run tests for specific action
bun test <action-name>
```

### Linting

```bash
# Check for lint/format issues
bun run lint

# Auto-fix issues
bun run lint:fix
```

### Creating New Actions

```bash
bun run new <action-name>
```

This generates a scaffold with:
- `package.json` with dependencies
- `action.yml` with input/output schema
- `src/index.ts` entry point
- `src/index.test.ts` test template
- `dist/.gitkeep` for build artifacts

## Action Architecture

All actions follow a consistent pattern:

```
<name>/
├── action.yml           # GitHub Action metadata
├── package.json         # Dependencies
├── src/
│   ├── index.ts        # Entry point (minimal, calls run.ts)
│   ├── run.ts          # Main logic with dependency injection
│   ├── lib.ts          # Pure business logic functions
│   ├── run.test.ts     # Integration tests
│   └── lib.test.ts     # Unit tests for pure functions
└── dist/
    ├── index.js        # Compiled bundle
    └── index.js.map    # Source map
```

**Key principles:**

1. **Dependency injection:** `run.ts` accepts injected dependencies (GitHub client, file system, etc.) for testability
2. **Pure functions:** `lib.ts` contains side-effect-free business logic
3. **Separation of concerns:** Entry point is minimal; logic is in separate files
4. **Comprehensive testing:** Both unit tests (lib) and integration tests (run)

## Release System

This repository uses an automated release system based on PR labels.

### How Releases Work

1. **PR is merged to main** - Triggers the auto-release workflow
2. **Labels determine version bump** - PR labels control whether it's major, minor, or patch
3. **Changelog is updated** - Changes extracted from PR body are added to CHANGELOG.md
4. **Tag is created** - New semver tag pushed to repository
5. **Release is published** - GitHub release created with changelog notes

### Release Labels

All release labels use the `release.` prefix:

| Bump Type | Labels | When to Use |
|-----------|--------|-------------|
| **Major** | `release.major`, `release.breaking` | Breaking changes, incompatible API changes |
| **Minor** | `release.minor`, `release.feature`, `release.enhancement` | New features, backwards-compatible additions |
| **Patch** | `release.patch`, `release.fix`, `release.bugfix`, `release.bug` | Bug fixes, minor corrections |
| **Skip** | `release.skip`, `release.docs`, `release.dependencies`, `release.ci` | No release needed (docs, deps, CI changes) |

**Default behavior:** If no release label is present, defaults to `patch`.

### Label Precedence

Labels are checked in order: **major > minor > patch > skip**

If a PR has both `release.major` and `release.fix`, it will be a major release.

## Opening Pull Requests

### PR Title

Use a clear, descriptive title that summarizes the change:

```
Add timezone support to create-release action
Fix changelog parsing for empty sections
Update dependencies to latest versions
```

### PR Body Format

Structure your PR body with changelog sections to enable automatic changelog generation:

```markdown
## Summary

Brief description of what this PR does.

### Added
- New feature or capability
- Another new thing

### Changed
- Modified behavior or updated functionality
- Breaking change (use with release.major label)

### Fixed
- Bug that was fixed
- Another fix

### Deprecated
- Feature marked for future removal

### Removed
- Feature or code that was removed

### Security
- Security-related fix or improvement
```

**Alternative format** - Use prefixed bullet points anywhere in the body:

```markdown
- feat: Add new timezone input parameter
- fix: Correct date formatting for UTC
- remove: Drop deprecated `legacyMode` option
- deprecate: Mark `oldMethod()` for removal in v2
- security: Sanitize user input in tag names
```

### Mapping Prefixes to Changelog Sections

| Prefix | Changelog Section |
|--------|-------------------|
| `feat:`, `add:` | Added |
| `change:`, `update:` | Changed |
| `deprecate:` | Deprecated |
| `remove:` | Removed |
| `fix:` | Fixed |
| `security:` | Security |

### Example PR for a Feature Release

**Title:** Add heartbeat retry configuration to deploy-to-heroku

**Labels:** `release.feature`

**Body:**
```markdown
## Summary

Adds configurable retry attempts and delay for the heartbeat check after Heroku deployment.

### Added
- `heartbeat-retries` input to configure number of retry attempts (default: 3)
- `heartbeat-delay` input to configure delay between retries in ms (default: 5000)

### Changed
- Heartbeat check now logs each retry attempt for better debugging
```

### Example PR for a Bug Fix

**Title:** Fix changelog entry insertion for new repositories

**Labels:** `release.fix`

**Body:**
```markdown
## Summary

Fixes an issue where the auto-release action would fail on repositories without an existing CHANGELOG.md file.

### Fixed
- Create CHANGELOG.md with Keep a Changelog template if file doesn't exist
- Handle empty changelog file gracefully
```

### Example PR for Documentation Only

**Title:** Update README with new action examples

**Labels:** `release.docs`

**Body:**
```markdown
## Summary

Updates documentation with examples for the new timezone configuration options.

No code changes - documentation only.
```

This PR will **not** trigger a release due to the `release.docs` label.

## Writing Effective Changelogs

### Keep a Changelog Format

This repository follows [Keep a Changelog](https://keepachangelog.com/) conventions:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.2.0] - 2026-01-07

### Added
- New feature description

### Changed
- Modified behavior description

### Fixed
- Bug fix description

## [v1.1.0] - 2026-01-01
...
```

### Changelog Entry Guidelines

**DO:**

- Write entries from the user's perspective
- Be specific about what changed and why it matters
- Use present tense ("Add feature" not "Added feature")
- Include relevant context for breaking changes
- Group related changes together

**DON'T:**

- Include internal implementation details unless relevant to users
- Use vague descriptions like "Various improvements"
- Duplicate the git commit history
- Include changes that don't affect users (internal refactors without behavior changes)

### Good Changelog Entries

```markdown
### Added
- Timezone input parameter for date formatting in release notes
- Support for prerelease version detection (e.g., v1.0.0-beta.1)

### Changed
- Default branch detection now uses GitHub API instead of assuming 'main'
- Heartbeat check timeout increased from 30s to 60s for slower deployments

### Fixed
- Changelog parsing no longer fails on entries with empty sections
- Git tag creation works correctly when repository has no prior tags

### Security
- Sanitize tag names to prevent command injection in git operations
```

### Bad Changelog Entries

```markdown
### Changed
- Updated code
- Fixed stuff
- Improvements
- Refactored internals
- Bumped dependencies
```

### Breaking Changes

When introducing breaking changes:

1. Use the `release.major` or `release.breaking` label
2. Clearly document the breaking change in the PR body
3. Provide migration guidance if applicable

```markdown
### Changed
- **BREAKING:** Renamed `github-token` input to `githubToken` for consistency
  - Migration: Update your workflow files to use the new input name
- **BREAKING:** Minimum Node version increased to 20
  - Migration: Ensure your runner uses Node 20+
```

## CI/CD Pipeline

### Continuous Integration (`ci.yml`)

Runs on every push to main and PR to main:

1. **detect-changes** - Identifies which actions changed
2. **lint** - Biome linter check
3. **build** - Compiles all actions, verifies dist files committed
4. **test** - Runs test suite with coverage reporting
5. **test-actions** - Verifies compiled dist files are valid Node.js modules

### Auto Release (`auto-release.yml`)

Runs when a PR is merged to main:

1. Checks out repository with full git history
2. Builds all actions
3. Determines version bump from PR labels
4. Updates CHANGELOG.md
5. Creates and pushes git tag
6. Commits changelog changes

### Release (`release.yml`)

Runs when a `v*` tag is pushed:

1. Builds all actions
2. Extracts release notes from CHANGELOG.md
3. Creates GitHub release with notes

## Common Tasks

### Adding a New Input to an Action

1. Update `action.yml` with the new input definition
2. Update `run.ts` to read and use the input
3. Add tests for the new functionality
4. Build: `bun run build <action-name>`
5. Open PR with `release.feature` label

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug in the appropriate file
3. Verify the test passes
4. Build: `bun run build <action-name>`
5. Open PR with `release.fix` label

### Updating Dependencies

1. Update versions in `package.json`
2. Run `bun install`
3. Run tests to ensure nothing broke
4. Rebuild all actions: `bun run build`
5. Open PR with `release.dependencies` label (no release)

### Making a Breaking Change

1. Implement the change
2. Update all tests
3. Document migration path in PR body
4. Build all affected actions
5. Open PR with `release.breaking` label

## Troubleshooting

### Build fails in CI

The CI runs `bun run build` to verify the build succeeds. Dist files are **not** committed in PRs - they are automatically built and committed by the auto-release workflow when a PR is merged.

If the build fails, fix the TypeScript errors and push again.

### Tests fail after updating dependencies

Clear the build cache and rebuild:

```bash
bun run clean
bun install
bun run build
bun test
```

### Release was skipped unexpectedly

Check that your PR:
1. Was actually merged (not just closed)
2. Doesn't have a skip label (`release.skip`, `release.docs`, `release.dependencies`, `release.ci`)
3. Was merged to the `main` branch

### Changelog entry not generated correctly

Ensure your PR body uses the correct format:
- Use `### Added`, `### Changed`, etc. headings
- Or use prefixed bullets: `- feat:`, `- fix:`, etc.
- If no recognized format, the PR title becomes the changelog entry
