
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
  update_requirements_file:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3
      - name: Install Python and Poetry
        uses: birdcar/actions/dev/poetry_install@v0.4.0
      - name: Generate Requirements file with Poetry
        uses: birdcar/actions/poetry_export@v0.4.0
        with:
          gitUser: 'Birdcar (BOT)'
          gitEmail: '434063+birdcar@users.noreply.github.com'
```
