# Contributing to Graph Compose

Thanks for your interest in contributing to Graph Compose! This document covers the process and legal requirements for contributing.

## Contributor License Agreement (CLA)

**All contributors must sign a Contributor License Agreement before any pull request can be merged.**

When you open your first pull request, the CLA Assistant bot will automatically comment with a link to sign. The process takes about a minute and only needs to be done once.

### Why a CLA?

Graph Compose uses a **dual-license model**:

- The public codebase is licensed under **AGPL-3.0** (see [LICENSE](./LICENSE))
- A **commercial license** is available for organizations that need an alternative to AGPL

The CLA grants the project maintainers the right to distribute your contributions under both licenses. Without it, we legally cannot include your code in the commercial offering, which would fragment the project.

Your CLA does **not** transfer ownership of your contributions — you retain full copyright. It only grants a license to distribute your work as part of this project.

## Getting Started

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run the test suite: `pnpm test`
5. Run the linter: `pnpm lint`
6. Open a pull request against `main`

## Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests across all packages
pnpm test
```

## Code Style

- TypeScript for all source code
- Follow existing patterns in the codebase
- Run `pnpm lint` before submitting

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update documentation if your change affects public APIs
- Reference any related issues in the PR description

## Reporting Issues

Open an issue on GitHub with:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)

## License

By contributing to Graph Compose, you agree that your contributions will be licensed under the project's [AGPL-3.0 License](./LICENSE), subject to the terms of the CLA.
