import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.socialConfig.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })
  console.log('✅ Config initalisée')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
