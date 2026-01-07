/**
 * Pure business logic for deploy-to-heroku action
 */

/**
 * Generate the content for a .netrc file with Heroku credentials
 */
export function generateNetrcContent(username: string, apiKey: string): string {
  return `machine api.heroku.com
  login ${username}
  password ${apiKey}
machine git.heroku.com
  login ${username}
  password ${apiKey}
`
}

/**
 * Build the Heroku app URL from the app name
 */
export function buildHerokuUrl(appName: string): string {
  return `https://${appName}.herokuapp.com`
}

/**
 * Build the git push refspec for deploying to Heroku
 */
export function buildDeployRefspec(sha: string, branch: string): string {
  return `${sha}:refs/heads/${branch}`
}
