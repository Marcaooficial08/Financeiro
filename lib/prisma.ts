import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
  var prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable")
}

const adapter = new PrismaPg(databaseUrl)

export const prisma =
  global.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma