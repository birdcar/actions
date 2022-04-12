
# Poetry Export

Automatically generate a `requirements.txt` file based on your `poetry.lock` file for use with PaaS like Heroku

## Inputs

- `gitUser`: The `user.name` value you'd like to pass to Git to commit with
- `gitEmail`: The `user.email` value you'd like to pass to Git to commit with

## Example Usage

```yaml
on:
  push:
    branches:
      - main
    pathspec:
      - poetry.lock
jobs:
  generate_requirements_file:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3
      - name: Generate Requirements file with Poetry
        uses: birdcar/actions/poetry_export@v0.2.0
        with:
          gitUser: 'Birdcar (BOT)'
          gitEmail: '434063+birdcar@users.noreply.github.com'
  deploy_to_staging:
    runs-on: ubuntu-latest
    needs: [generate_requirements_file]
    steps:
      - name: Deploy to Staging
        uses: birdcar/actions/deploy_to_heroku@v0.2.0
        with:
          herokuUsername: ${{ secrets.HEROKU_USER }}
          herokuAPIKey: ${{ secrets.HEROKU_API_KEY }}
          herokuAppName: birdcar-staging
          herokuAppHeartbeatUrl: https://birdcar-staging.herokuapp.com/up
```
