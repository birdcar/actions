# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.2] - 2026-01-28
### Changed
- Stop parsing at `---` separator - content after is ignored (test plans, notes, etc.)
- Skip task checkbox items (`- [ ]` and `- [x]`) - these are test checklists, not changelog entries

## [1.0.1] - 2026-01-28
### Changed
- Replace manual changelog parsing with `keep-a-changelog` SDK
- Merge `[Unreleased]` entries with PR-generated changes automatically
- Concatenate entries when version already exists (supports manual pre-entries)
- Handle all changelog categories (Added, Changed, Fixed, Removed, Deprecated, Security)
- [x] Unit tests pass (`bun test`)
- [ ] Integration test with birdhouse repo release
