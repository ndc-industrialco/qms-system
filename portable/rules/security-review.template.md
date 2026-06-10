# Security Review

## Purpose

Provide a final security gate for changes that could affect trust, access, or exposure.

## Rules

- Review secrets, auth, authorization, input validation, and sensitive data handling.
- Verify least privilege for users, services, and integrations.
- Check that APIs validate inputs and fail closed where appropriate.
- Check that sensitive values are not leaked in logs, UI, or error messages.
- Review XSS, CSRF, injection, and access-control risks for the change.
- Review external integration permissions and token handling.
- Any change that touches identity, permissions, secrets, or sensitive data should have a security review path.

## Minimum Expectations

- auth and authorization impact
- input validation
- sensitive data handling
- secret exposure review
- integration privilege review

## Failure Conditions

- A change expands access without review.
- A secret or token can leak through logs, UI, or errors.
- Security assumptions are implicit rather than checked.
