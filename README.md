<p align="center"><img src="static/logo.png" alt="Structured Logo" /></p>
<h3 align="center">Linting your folders, files, imports and exports.</h3>

---

<h3>
  Warning: This package is under development.<br />
  Please use freely, but be aware newer releases will likely contain breaking changes.
</h3>

---

## Features

- ✅ Lint folder names: enforce code base structure
- ✅ Lint file names: specify naming conventions
- ✅ Lint imports: whitelist/blacklist import paths and packages
- ✅ Lint exports: define expected export types and names

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
