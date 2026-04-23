import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const DEFAULTS = [
  { systemKey: "TICKET_MEAL", name: "Ticket refeição", type: "EXPENSE", icon: "🍽️", color: "#f59e0b" },
  { systemKey: "TICKET_MEAL_INCOME", name: "Ticket refeição", type: "INCOME", icon: "🍽️", color: "#f59e0b" },
  { systemKey: "FUEL_EXPENSE", name: "Combustível", type: "EXPENSE", icon: "⛽", color: "#dc2626" },
  { systemKey: "FUEL_INCOME", name: "Combustível", type: "INCOME", icon: "⛽", color: "#dc2626" },
  { systemKey: "UBER_EXPENSE", name: "Uber", type: "EXPENSE", icon: "🚗", color: "#111827" },
  { systemKey: "UBER_INCOME", name: "Uber", type: "INCOME", icon: "🚗", color: "#111827" },
  { systemKey: "SALARY", name: "Salário", type: "INCOME", icon: "💰", color: "#10b981" },
];

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });

const users = await prisma.user.findMany({ select: { id: true, email: true } });
console.log(`Seeding default categories for ${users.length} user(s)...`);

let created = 0;
let skipped = 0;
for (const user of users) {
  for (const cat of DEFAULTS) {
    const existing = await prisma.category.findFirst({
      where: { userId: user.id, systemKey: cat.systemKey },
    });
    if (existing) {
      skipped++;
      continue;
    }
    // Adota categoria legada de mesmo nome/tipo (sem systemKey) para evitar conflito
    // com o índice @@unique([userId, name, type]).
    const legacy = await prisma.category.findFirst({
      where: { userId: user.id, name: cat.name, type: cat.type, systemKey: null },
    });
    if (legacy) {
      await prisma.category.update({
        where: { id: legacy.id },
        data: { systemKey: cat.systemKey, icon: cat.icon, color: cat.color },
      });
      console.log(`  adopted legacy "${cat.name}" (${cat.type}) for ${user.email}`);
      created++;
      continue;
    }
    await prisma.category.create({
      data: { userId: user.id, ...cat },
    });
    created++;
  }
}

console.log(`Done. Created/adopted: ${created}. Already present: ${skipped}.`);
await prisma.$disconnect();
