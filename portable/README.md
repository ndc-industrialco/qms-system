# Portable Rule Kit

Use this folder as the reusable baseline for a new repository.

## Setup

1. Copy `portable/AGENTS.template.md` to `<project-root>/AGENTS.md`.
2. Copy `portable/rules/*.template.md` to `<project-root>/rules/` and rename each file from `*.template.md` to `*.md`.
3. Replace placeholders such as `<project-name>`, `<domain>`, `<tech-stack>`, `<rules-map>`, and doc paths.
4. Remove rules that do not apply to the target repository.
5. Keep project-specific workflow, domain roles, and on-call details in the target repo, not here.

## Intent

- `portable/AGENTS.template.md` is the starting entrypoint for a new project.
- `portable/rules/` contains reusable shared standards and agent workflow templates.
- Repository-specific documentation and domain rules should stay outside this folder.
