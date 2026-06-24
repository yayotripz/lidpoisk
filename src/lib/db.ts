import { PrismaClient } from '@prisma/client'

// Use a stable global to avoid multiple PrismaClient instances in dev hot reload.
const globalForPrisma = globalThis as unknown as {
  __prismaClientV3?: PrismaClient
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
  })
}

// Force recreate when schema changes by bumping the cache key.
// After schema changes, this file is re-imported and a new client is created.
if (!globalForPrisma.__prismaClientV3) {
  globalForPrisma.__prismaClientV3 = createPrismaClient()
}

export const db = globalForPrisma.__prismaClientV3
