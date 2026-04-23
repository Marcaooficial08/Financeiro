import type { AccountType, Prisma, PrismaClient } from "@prisma/client";

export const DEFAULT_CATEGORIES = [
  {
    systemKey: "TICKET_MEAL",
    name: "Ticket refeição",
    type: "EXPENSE" as const,
    icon: "🍽️",
    color: "#f59e0b",
  },
  {
    systemKey: "TICKET_MEAL_INCOME",
    name: "Ticket refeição",
    type: "INCOME" as const,
    icon: "🍽️",
    color: "#f59e0b",
  },
  {
    systemKey: "FUEL_EXPENSE",
    name: "Combustível",
    type: "EXPENSE" as const,
    icon: "⛽",
    color: "#dc2626",
  },
  {
    systemKey: "FUEL_INCOME",
    name: "Combustível",
    type: "INCOME" as const,
    icon: "⛽",
    color: "#dc2626",
  },
  {
    systemKey: "UBER_EXPENSE",
    name: "Uber",
    type: "EXPENSE" as const,
    icon: "🚗",
    color: "#111827",
  },
  {
    systemKey: "UBER_INCOME",
    name: "Uber",
    type: "INCOME" as const,
    icon: "🚗",
    color: "#111827",
  },
  {
    systemKey: "SALARY",
    name: "Salário",
    type: "INCOME" as const,
    icon: "💰",
    color: "#10b981",
  },
];

/**
 * Mapa de systemKey para tipo de conta exigido.
 * Cada systemKey só pode ser usada em contas do tipo indicado.
 * Categorias sem systemKey (user-defined) não aparecem aqui e só podem
 * ser usadas em contas regulares (ver requiresRegularAccount).
 */
export const CATEGORY_ACCOUNT_TYPE: Record<string, AccountType> = {
  TICKET_MEAL: "TICKET_MEAL",
  TICKET_MEAL_INCOME: "TICKET_MEAL",
  FUEL_EXPENSE: "TICKET_FUEL",
  FUEL_INCOME: "TICKET_FUEL",
  UBER_EXPENSE: "TICKET_FUEL",
  UBER_INCOME: "TICKET_FUEL",
};

const TICKET_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set<AccountType>([
  "TICKET_MEAL",
  "TICKET_FUEL",
]);

export function isTicketAccountType(type: AccountType): boolean {
  return TICKET_ACCOUNT_TYPES.has(type);
}

/** systemKeys cuja movimentação sempre debita o saldo da conta, mesmo em INCOME. */
const ALWAYS_DEBIT_SYSTEM_KEYS: ReadonlySet<string> = new Set([
  "UBER_EXPENSE",
  "UBER_INCOME",
]);

export function isAlwaysDebitCategory(systemKey: string | null | undefined): boolean {
  return !!systemKey && ALWAYS_DEBIT_SYSTEM_KEYS.has(systemKey);
}

/**
 * Retorna o AccountType exigido para a categoria informada, ou null
 * quando a categoria não é de sistema (nesse caso ela deve ir para conta regular).
 */
export function getRequiredAccountType(systemKey: string | null | undefined): AccountType | null {
  if (!systemKey) return null;
  return CATEGORY_ACCOUNT_TYPE[systemKey] ?? null;
}

type Client = PrismaClient | Prisma.TransactionClient;

export async function ensureDefaultCategories(userId: string, client: Client) {
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await client.category.findFirst({
      where: { userId, systemKey: cat.systemKey },
    });
    if (existing) continue;

    // Adota uma categoria legada de mesmo nome/tipo caso exista, para evitar conflito
    // com o índice @@unique([userId, name, type]).
    const legacy = await client.category.findFirst({
      where: { userId, name: cat.name, type: cat.type, systemKey: null },
    });
    if (legacy) {
      await client.category.update({
        where: { id: legacy.id },
        data: { systemKey: cat.systemKey, icon: cat.icon, color: cat.color },
      });
      continue;
    }

    await client.category.create({
      data: {
        userId,
        systemKey: cat.systemKey,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
      },
    });
  }
}
