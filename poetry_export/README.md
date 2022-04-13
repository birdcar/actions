
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
    paths:
      - poetry.lock
jobs:
  generate_requirements_file:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3
      - name: Install Python and Poetry
        uses: birdcar/actions/poetry_install@v0.2.1
      - name: Install Production dependencies
        shell: bash
        runs: poetry install --no-dev -E prod
      - name: Generate Requirements file with Poetry
        uses: birdcar/actions/poetry_export@v0.2.1
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
