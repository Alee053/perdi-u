# Agent skills

## Repository workflows

- For issue work, branches, commits or PRs, read [.agents/skills/perdiu-workflow/SKILL.md](.agents/skills/perdiu-workflow/SKILL.md).
- For contracts, persistence, workspace ownership or dependencies, read [.agents/skills/perdiu-architecture/SKILL.md](.agents/skills/perdiu-architecture/SKILL.md).
- For any change in `apps/web` (screens, components, hooks, forms, presentation state, web rules or clients), read [.agents/skills/mvp-react/SKILL.md](.agents/skills/mvp-react/SKILL.md) and keep View, Presenter and Model separate.
- For behavior or test-tooling changes, read [.agents/skills/perdiu-testing/SKILL.md](.agents/skills/perdiu-testing/SKILL.md) and use vertical TDD at public interfaces.
- Before delivery, read [.agents/skills/perdiu-docs-sync/SKILL.md](.agents/skills/perdiu-docs-sync/SKILL.md); update affected docs and skill instructions in the same PR. Review sources rather than copying their rules.

## Contributions

Before naming a branch/PR, choosing a template, linking an issue/project, or preparing commits, read [CONTRIBUTING.md](CONTRIBUTING.md). Describe changes and verification; omit AI/tool attribution and co-author trailers from PRs, commits and project evidence.

## Issue tracker

For issue and project work, use GitHub through `gh`; read [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

## Domain docs

Before domain changes, read [docs/agents/domain.md](docs/agents/domain.md).

## TDDLab

For new behavior, use `pnpm test` in red and green as described in [the testing guide](docs/testing.md#registro-original-de-tddlab). Preserve the original instrumentation in `script/`, `.husky/` and `semantic-commits.js`; version both generated evidence JSON files and wait for the post-commit hook before pushing.

## Engineering

Before moving code between workspaces, adding a dependency, or changing persistence, read [docs/architecture.md](docs/architecture.md). Validate workspace dependencies and the MVP layers of `apps/web` with `pnpm check:boundaries`.

Keep the catalog model, case of use, SQL adapter and React presenter separate. Public report responses use an explicit allowlist and exclude private contact and storage data. Ownership requires verified identity; a display name is presentation only.

Run database mutation and integration scripts only against isolated local development/test databases. Preserve unrelated working-tree changes and keep credentials in ignored environment files.
