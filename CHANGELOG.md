# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 0.2.1 - 2022-04-13

Some days, you realize that you wrote a bunch of stuff and never tested it. This is one of those days.

### Changed

- **Bugfix**: The `poetry_install` action failed to set the poetry env correctly, resulting in an inability to then use that env for commands later. The reason for this is that I was relying on the output from the `setup-python` step to set the poetry envrionment version. However, I've now shifted to just using the same input value that `setup-python` is relying on, making it simpler and less likely to fail (I hope).
- **Updated Action**: `poetry_install` will now _only_ install and configure Python and Poetry, but will not take the extra step of installing the dependencies itself.
- **Updated Action**: `poetry_export` once leveraged `poetry_install` as its first step to simplify production deployments to SaaS but combining the install of production dependencies with the requirements.txt output, but that turns out to not be necessary since `poetry export` outputs the production requirements without needing additional configuration. Right now I'm not going to support the `extras` flag which adds value to this action, but I may consider doing that in the future

## 0.2.0 - 2022-04-12

Another day, another release of birdcar/actions.

### Added
- **New Action**: `poetry_install`. Poetry is a way of managing python packages, and this action automate the setup and caching of Python, Poetry, and the dependencies specified in your `poetry.lock` file. 
- **New Action**: `poetry_export`. A significant amount of both my side projects and the internal tools I develop professionally are deployed on Heroku. At the moment, Heroku requires all Python projects to have a `requirements.txt` file in the root of the project repository for dependencies to be installed (though that looks to be changing with their move to CloudNativeBuildpacks in the near term future 🤞🏽). This action will use Poetry to generate the `requirements.txt` file for you, and then commit it to the repository to ensure that you don't need to manage it.

### Changed
- **Updated Action**: `deploy_to_heroku`. Initially, the `deploy_to_heroku` action would also checkout the repository for you. This is actually not great for composing actions together; resulting in either duplicate work (i.e. checking the repository out twice) or odd environmental changes. This update will remove the checkout step and leave that up to the consumer.

### Removed
- **Deleted Action**: `setup_poetry`. As it turns out, the `actions/setup-python` action has built in dependency caching! It needs to be composed with a few other steps to be useful, but the bulk of the work in the `setup_poetry` was manually performing that caching step, so it's no longer needed. Use `poetry_install` moving forward, and see the readme in that directory for usage instructions.

## 0.1.0 - 2022-04-11

First release of my personal actions repository. Read the [Added](#added) section to see the list of actions available in this release, along with a short description. For more information, see the README in each of the action folders.

### Added
- **New Action**: `create_release`. Have you _also_ written the same "Automatically publish a release when I create a new tag" GitHub action in almost every project you've created? Well now you don't have to! For the low, low price of "being forced to use keepachangelog's Changelog format" you, too can now stop worrying and just use this action.
- **New Action**: `setup_poetry`. Poetry is a wonderful package.. manager? Orchestrator? Project manager? Whatever it is, it makes working with Python dependencies more like using `npm`, `bundle`, or `cargo`. This action will help you take advantage of that and cache the dependencies as part of your GitHub Actions cache to speed up your test runs.
- **New Action**: `poetry_requirements`. Use Poetry, but need to generate a `requirements.txt` file for use with Heroku or some other PaaS? `poetry_requirements` will get you sorted
- **New Action**: `deploy_to_heroku`. Heroku has its own deployment pipeline, but if you want to use GitHub Actions for CI or control the flow inside of GitHub, you're out of luck. Fortunately, this action will allow you to control your Heroku application deployments inside GitHub actions.
