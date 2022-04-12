
# Poetry install



## Inputs

- `pythonVersion` (optional): The specific Python version you'd like to use (defaults to latest version available on Heroku)
- `poetryDev` (optional): Whether or not to install dev dependencies (defaults to 'true', must be a string due to GitHub Actions limitations)
- `poetryRoot` (optional): Whether or not to install the root package (defaults to 'true', must be a string due to GitHub Actions limitations)

## Example Usage

In addition to being useful for testing, etc, my primary use case for this was to automatically generate the requirements.txt file needed by Heroku. That action [_also_ exists in this repository](../poetry_export/README.md), but the relevant section that shows **this** action in use is below:

```yaml
runs:
  using: composite
  steps:
    - name: Checkout repository
      uses: actions/checkout@v3
    - name: Install Poetry and cache production dependencies
      uses: birdcar/actions/poetry_install@v0.2.0
      with:
        poetryDev: 'false'
        poetryRoot: 'false'
```