# Backup and Restore

## Purpose

Define how data and services can be recovered after failure, corruption, or bad deployment.

## Rules

- Backup strategy must match the importance of the data.
- Restore must be tested, not assumed.
- Backup retention should be intentional and documented.
- Critical data should have a known recovery path.
- Recovery time and recovery point assumptions should be realistic for the system.
- Schema changes, migrations, and backfills must consider restore behavior.
- Do not treat backup as a substitute for data integrity.

## Minimum Expectations

- backup scope
- retention policy
- restore procedure
- restore validation
- recovery assumptions

## Failure Conditions

- Backups exist but restore has never been validated.
- Recovery time is unknown for critical data.
- Backup policy is undocumented or inconsistent with the system's importance.
