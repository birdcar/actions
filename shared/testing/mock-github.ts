/**
 * Mock utilities for @actions/github
 */

import { mock } from 'bun:test'

export interface MockGitHubContext {
  payload: Record<string, unknown>
  eventName: string
  sha: string
  ref: string
  workflow: string
  action: string
  actor: string
  job: string
  runAttempt: number
  runNumber: number
  runId: number
  apiUrl: string
  serverUrl: string
  graphqlUrl: string
  repo: { owner: string; repo: string }
  issue: { owner: string; repo: string; number: number }
}

export function createMockContext(overrides: Partial<MockGitHubContext> = {}): MockGitHubContext {
  const repo = overrides.repo ?? { owner: 'test-owner', repo: 'test-repo' }
  return {
    payload: {},
    eventName: 'push',
    sha: 'abc123def456',
    ref: 'refs/heads/main',
    workflow: 'test-workflow',
    action: 'test-action',
    actor: 'test-actor',
    job: 'test-job',
    runAttempt: 1,
    runNumber: 1,
    runId: 12345,
    apiUrl: 'https://api.github.com',
    serverUrl: 'https://github.com',
    graphqlUrl: 'https://api.github.com/graphql',
    repo,
    issue: { ...repo, number: 1 },
    ...overrides,
  }
}

export interface MockRelease {
  id: number
  html_url: string
  tag_name: string
  name: string
  body: string
  draft: boolean
  prerelease: boolean
}

export interface MockOctokitState {
  releases: MockRelease[]
  createReleaseCalls: Array<{
    owner: string
    repo: string
    tag_name: string
    name?: string
    body?: string
    draft?: boolean
    prerelease?: boolean
  }>
}

export function createMockOctokitState(): MockOctokitState {
  return {
    releases: [],
    createReleaseCalls: [],
  }
}

export function createMockOctokit(state: MockOctokitState = createMockOctokitState()) {
  return {
    rest: {
      repos: {
        createRelease: mock(
          async (params: {
            owner: string
            repo: string
            tag_name: string
            name?: string
            body?: string
            draft?: boolean
            prerelease?: boolean
          }) => {
            state.createReleaseCalls.push(params)

            const release: MockRelease = {
              id: state.releases.length + 1,
              html_url: `https://github.com/${params.owner}/${params.repo}/releases/tag/${params.tag_name}`,
              tag_name: params.tag_name,
              name: params.name ?? params.tag_name,
              body: params.body ?? '',
              draft: params.draft ?? false,
              prerelease: params.prerelease ?? false,
            }

            state.releases.push(release)

            return { data: release }
          },
        ),
        listReleases: mock(async () => ({ data: state.releases })),
      },
    },
  }
}

export type MockOctokit = ReturnType<typeof createMockOctokit>

export function createMockGitHub(
  context: MockGitHubContext = createMockContext(),
  octokitState: MockOctokitState = createMockOctokitState(),
) {
  return {
    context,
    getOctokit: mock((_token: string) => createMockOctokit(octokitState)),
  }
}

export type MockGitHub = ReturnType<typeof createMockGitHub>
