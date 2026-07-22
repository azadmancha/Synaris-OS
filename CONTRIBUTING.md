# Contributing to Synaris

First, thank you for considering contributing to Synaris. Every contribution — whether code, documentation, design, or ideas — helps us build a better learning system.

## Code of Conduct

All contributors must adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, constructive, and inclusive.

## How to Contribute

### 1. Understand the Mission

Before contributing, read [WHY.md](WHY.md). Synaris is not just a technical project — it's a mission to create better thinkers. Every contribution should align with this mission.

### 2. Start Here

- **Good First Issues**: Look for issues labeled `good-first-issue` or `help-wanted`
- **Documentation**: Improvements to docs are always welcome
- **Bugs**: Found a bug? Open an issue first, then submit a fix

### 3. Development Process

```bash
# 1. Fork and clone
git clone https://github.com/your-username/synaris.git
cd synaris

# 2. Create a branch
git checkout -b feature/your-feature-name

# 3. Set up development environment
cp .env.example .env
docker compose up -d  # or install manually

# 4. Make your changes
# Write tests for your changes
# Ensure all tests pass

# 5. Commit using conventional commits
git commit -m "feat: add adaptive depth selector UI"

# 6. Push and open a pull request
git push origin feature/your-feature-name
```

### 4. Pull Request Guidelines

- **One feature per PR** — Keep changes focused
- **Write tests** — Every feature needs tests
- **Update documentation** — README, API docs, or inline docs as needed
- **Follow the style guide** — See [STYLE_GUIDE.md](STYLE_GUIDE.md)
- **Link the issue** — Reference the issue your PR addresses
- **Keep PRs small** — Large changes should be broken into multiple PRs

### 5. Code Review Process

All PRs require:
1. **Automated checks pass** — Tests, linting, type checking
2. **Code review** — At least one maintainer review
3. **AI evaluation** — For AI-related changes, automated evaluation must pass

Reviewers will check for:
- Alignment with Synaris philosophy
- Architectural consistency
- Code quality and maintainability
- Test coverage
- Security considerations
- Performance implications

## Development Conventions

### Branch Naming

```
feature/your-feature-name
fix/issue-description
docs/what-you-changed
refactor/what-you-refactored
test/what-you-tested
```

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add adaptive depth selector
fix: resolve streaming timeout issue
docs: update API documentation
refactor: simplify memory agent logic
test: add integration tests for session API
chore: update dependencies
```

### Before Submitting

- [ ] Tests pass: `pytest tests/`
- [ ] Lint passes: `ruff check .`
- [ ] Types pass: `pyright src/`
- [ ] No security issues: `safety check`
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for significant changes)

## Getting Help

- Open an issue for bugs or feature requests
- Join our community discussions
- Read the docs in `/docs/`

## Recognition

All contributors will be recognized in our README and release notes. Significant contributors may be invited as maintainers.

Thank you for helping us build the future of learning.
