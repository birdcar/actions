# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 0.1.0 - 2022-04-11

First release of my personal actions repository. Read the [Added](#added) section to see the list of actions available in this release, along with a short description. For more information, see the README in each of the action folders.

### Added
- **New Action**: `create_release`. Have you _also_ written the same "Automatically publish a release when I create a new tag" GitHub action in almost every project you've created? Well now you don't have to! For the low, low price of "being forced to use keepachangelog's Changelog format" you, too can now stop worrying and just use this action.
- **New Action**: `setup_poetry`. Poetry is a wonderful package.. manager? Orchestrator? Project manager? Whatever it is, it makes working with Python dependencies more like using `npm`, `bundle`, or `cargo`. This action will help you take advantage of that and cache the dependencies as part of your GitHub Actions cache to speed up your test runs.
- **New Action**: `poetry_requirements`. Use Poetry, but need to generate a `requirements.txt` file for use with Heroku or some other PaaS? `poetry_requirements` will get you sorted
- **New Action**: `deploy_to_heroku`. Heroku has its own deployment pipeline, but if you want to use GitHub Actions for CI or control the flow inside of GitHub, you're out of luck. Fortunately, this action will allow you to control your Heroku application deployments inside GitHub actions.