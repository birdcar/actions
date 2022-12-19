
# Poetry install



## Inputs

- `pythonVersion` (optional): The specific Python version you'd like to use (defaults to latest version available on Heroku)

## Example Usage

In addition to being useful for testing, etc, my primary use case for this was to automatically generate the requirements.txt file needed by Heroku. That action [_also_ exists in this repository](../poetry_export/README.md), but the relevant section that shows **this** action in use is below:

```yaml
runs:
  using: composite
  steps:
    - name: Checkout repository
      uses: actions/checkout@v3
    - name: Install Python and Poetry
      uses: birdcar/actions/dev/poetry_install@v0.4.0
      with:
        pythonVersion: 3.9.9
```
