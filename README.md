# Structured

> Linting your folders, files, imports and exports.

### [Warning: This package is in development. Please use freely, but be aware newer releases will likely contain breaking changes.]

## Features

- ✅ Lint folder names: enforce code base structure
- ✅ Lint file names: specify naming conventions
- ✅ Lint imports: whitelist/blacklist import paths
- ✅ Lint exports: define expected exports

## Examples

See [example directory](examples/all-features/) for the configuration options.

## Usage

```bash
yarn add --dev @hellotellow/structured

yarn structured init
edit .structuredrc.js

yarn structured lint

# That's it!
```

## Features To Consider

- Denying untracked imports
- Denying untracked exports

## Issues

Feel free to submit issues and enhancement requests.

## Contributing

Please refer to each project's style and contribution guidelines for submitting patches and additions. In general, we follow the "fork-and-pull" Git workflow.

1.  **Fork** the repo on GitHub
2.  **Clone** the project to your own machine
3.  **Commit** changes to your own branch
4.  **Push** your work back up to your fork
5.  Submit a **Pull request** so that we can review your changes

NOTE: Be sure to merge the latest from "upstream" before making a pull request!

## Copyright and licensing

This project is licensed under the terms of the [MIT license](./LICENSE).
