import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_DATABASE_URL

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({
    log: ['error'],
    datasources: { db: { url: dbUrl } },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
