# Agent Documentation Updates

Update only when relevant.

## System State

Update:

* `<docs-agent-current-state-file>`

When:

* feature status changes
* implementation status changes
* technical debt changes
* project roadmap changes

## Task Logs

Always append:

* `<docs-agent-task-log-file>`
* `<docs-domains-root>/<domain>/task-log.md`

## API Documentation

Update:

* `<docs-architecture-api-map-file>`

When:

* endpoint changes
* route changes
* request/response contracts change

## Database Documentation

Update:

* `<docs-architecture-database-map-file>`

When:

* schema changes
* table changes
* field changes
* relationship changes

## Dependency Documentation

Update:

* `<docs-architecture-dependency-map-file>`

When:

* service dependencies change
* module dependencies change
* integration dependencies change

## New Features

When introducing a new feature, module, or domain:

1. Create or update domain documentation.
2. Update `<docs-architecture-domain-map-file>`.
3. Update `<docs-agent-current-state-file>`.
4. Update architecture maps as needed.
5. Append task logs.

A new feature is not complete until architecture documentation is updated.
