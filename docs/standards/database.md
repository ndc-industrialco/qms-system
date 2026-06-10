# Database Standards
- Use Prisma Client via Repositories.
- Apply transactions (`prisma.$transaction`) for multi-table writes.
- Never hard delete data unless explicitly required (use soft deletes or status changes).
