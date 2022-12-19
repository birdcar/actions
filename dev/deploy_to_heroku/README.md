# Deploy to Heroku

An action to deploy apps to Heroku from GitHub (i.e. not with Heroku's default)

## Inputs

- `herokuUsername` (required): The username of the Heroku account -- typically a bot user -- you want to use for the deploy
- `herokuAPIKey` (required): The API key associated with the account you specified in `herokuUsername`
- `herokuAppName` (required): The name of the heroku app (e.g. `super-cool-app-staging`)
- `herokuAppHeartbeatUrl` (required): After a git-based deploy to Heroku, the action will `curl -f` this URL, which will throw an error and make the action's exit status non-zero.

## Example Usage

```yaml
steps:
  - name: Deploy staging to Heroku
    uses: birdcar/actions/deploy_to_heroku@v0.4.0
    with:
      herokuUsername: ${{ secrets.HEROKU_USERNAME }}
      herokuAPIKey: ${{ secrets.HEROKU_API_KEY }}
      herokuAppHeartbeatUrl: https://super-cool-app-staging.herokuapp.com/up
```
