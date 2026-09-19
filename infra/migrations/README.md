Prisma SQL migrations live next to the schema at `packages/db/prisma/migrations/`.

This folder is reserved for extra infra SQL (one-off jobs, extensions) that is not managed by Prisma. Do not duplicate Prisma history here — migrating the client from Prisma to Drizzle is a separate task, not part of the monorepo reorg.
