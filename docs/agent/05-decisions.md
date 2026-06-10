# Decisions Log

- **Documentation System**: Adopted a domain-driven AI-optimized documentation structure to minimize token usage for future agents.
- **Architecture**: Enforced standard Next.js App Router, Services, Repositories, and Prisma.
- **Action Token**: Decided on Option B (DB Token) for email approval links, enabling revocation on recall/cancel and strict tracking.
- **Email Idempotency**: Idempotency keys for email notifications (`sendEmailOnce`) must include a slice of the newly generated action token. This ensures that while retries of the same request are deduplicated, valid re-submissions (e.g., after a document recall or reject) will generate a new token and thus a new idempotency key, allowing the new email to send successfully.
