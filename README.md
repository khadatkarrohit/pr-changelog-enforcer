# pr-changelog-enforcer

A GitHub Action that blocks PR merge unless `CHANGELOG.md` is properly updated with a new entry — not just touched, but actually containing new content under `## [Unreleased]`.

## Why this is different

Most changelog enforcers only check if the file was modified. This one validates that a meaningful new entry was actually added to the `## [Unreleased]` section, comparing base vs PR branch content.

## Quick start

```yaml
# .github/workflows/changelog.yml
name: Changelog Check

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: khadatkarrohit/pr-changelog-enforcer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `github-token` | `${{ github.token }}` | GitHub token for API access |
| `changelog-file` | `CHANGELOG.md` | Path to the changelog file |
| `skip-label` | `skip-changelog` | PR label that bypasses enforcement |
| `exempt-bots` | `true` | Auto-exempt Dependabot, Renovate, github-actions bot |
| `exempt-paths` | `` | Comma-separated globs — PRs touching only these paths are exempt |
| `require-unreleased-section` | `true` | Require new content under `## [Unreleased]`, not just any file change |

## Exemptions

### Skip label
Add `skip-changelog` label to a PR to bypass the check (useful for hotfixes or refactors).

### Bot PRs
Dependabot and Renovate PRs are auto-exempt when `exempt-bots: true`.

### Path-based exemptions
PRs that only touch docs or CI files can be exempt:
```yaml
- uses: khadatkarrohit/pr-changelog-enforcer@v1
  with:
    exempt-paths: 'docs/**,*.md,.github/**'
```

## Expected CHANGELOG format

```markdown
# Changelog

## [Unreleased]

### Added
- Your new feature goes here  ← this line must be new

## [1.2.0] - 2024-01-15
...
```

Any new line under `## [Unreleased]` will pass the check.

## License

MIT
