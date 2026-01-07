/**
 * Test fixtures for GitHub Actions
 */

/**
 * Sample changelog in Keep a Changelog format
 */
export const sampleChangelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature in progress

## [v1.2.0] - 2024-01-15

### Added
- Added new feature X
- Added support for Y

### Changed
- Updated dependency Z

### Fixed
- Fixed bug in feature A

## [v1.1.0] - 2024-01-01

### Added
- Initial feature set

## [v1.0.0] - 2023-12-01

### Added
- First stable release
`

/**
 * Sample changelog with prerelease versions
 */
export const sampleChangelogWithPrerelease = `# Changelog

## [v2.0.0-beta.1] - 2024-02-01

### Added
- Beta feature for v2

## [v1.2.0] - 2024-01-15

### Added
- Stable feature
`

/**
 * Sample pyproject.toml for poetry tests
 */
export const samplePyprojectToml = `[tool.poetry]
name = "sample-project"
version = "0.1.0"
description = "A sample Python project"
authors = ["Test Author <test@example.com>"]

[tool.poetry.dependencies]
python = "^3.11"
requests = "^2.31.0"
pydantic = "^2.5.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
black = "^23.12.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
`

/**
 * Sample poetry.lock content (simplified)
 */
export const samplePoetryLock = `[[package]]
name = "requests"
version = "2.31.0"
description = "Python HTTP for Humans."
category = "main"
optional = false
python-versions = ">=3.7"

[[package]]
name = "pydantic"
version = "2.5.0"
description = "Data validation using Python type hints"
category = "main"
optional = false
python-versions = ">=3.8"

[metadata]
lock-version = "2.0"
python-versions = "^3.11"
content-hash = "abc123def456789"
`

/**
 * Sample requirements.txt output
 */
export const sampleRequirementsTxt = `requests==2.31.0
pydantic==2.5.0
`

/**
 * GitHub webhook payload fixtures
 */
export const webhookPayloads = {
  push: {
    ref: 'refs/heads/main',
    before: '0000000000000000000000000000000000000000',
    after: 'abc123def456789',
    repository: {
      id: 12345,
      name: 'test-repo',
      full_name: 'test-owner/test-repo',
      owner: {
        login: 'test-owner',
        name: 'Test Owner',
      },
      html_url: 'https://github.com/test-owner/test-repo',
    },
    pusher: {
      name: 'test-actor',
      email: 'test@example.com',
    },
    sender: {
      login: 'test-actor',
      type: 'User',
    },
  },

  release: {
    action: 'published',
    release: {
      id: 1,
      tag_name: 'v1.0.0',
      name: 'v1.0.0',
      body: 'Release notes',
      draft: false,
      prerelease: false,
      html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
    },
    repository: {
      id: 12345,
      name: 'test-repo',
      full_name: 'test-owner/test-repo',
      owner: {
        login: 'test-owner',
      },
    },
  },

  pullRequest: {
    action: 'opened',
    number: 42,
    pull_request: {
      id: 1,
      number: 42,
      title: 'Test PR',
      body: 'Test PR body',
      html_url: 'https://github.com/test-owner/test-repo/pull/42',
      head: {
        ref: 'feature-branch',
        sha: 'abc123',
      },
      base: {
        ref: 'main',
        sha: 'def456',
      },
    },
    repository: {
      id: 12345,
      name: 'test-repo',
      full_name: 'test-owner/test-repo',
      owner: {
        login: 'test-owner',
      },
    },
  },
}
