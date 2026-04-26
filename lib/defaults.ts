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
    systemKey: "VALE_TRANSPORTE_EXPENSE",
    name: "Vale Transporte",
    type: "EXPENSE" as const,
    icon: "🚌",
    color: "#0ea5e9",
  },
  {
    systemKey: "VALE_TRANSPORTE_INCOME",
    name: "Vale Transporte",
    type: "INCOME" as const,
    icon: "🚌",
    color: "#0ea5e9",
  },
  {
    systemKey: "SALARY",
    name: "Salário",
    type: "INCOME" as const,
    icon: "💰",
    color: "#10b981",
  },
  {
    systemKey: "TICKET_AWARD",
    name: "Ticket premiação",
    type: "EXPENSE" as const,
    icon: "🏆",
    color: "#8b5cf6",
  },
  {
    systemKey: "TICKET_AWARD_INCOME",
    name: "Ticket premiação",
    type: "INCOME" as const,
    icon: "🏆",
    color: "#8b5cf6",
  },
];

/**
 * Mapa legado de systemKey → tipo de conta exigido. Mantido para
 * compatibilidade com chamadas existentes; a validação real agora é feita
 * em `validateCategoryOnAccount`, que expressa regras flexíveis.
 */
export const CATEGORY_ACCOUNT_TYPE: Record<string, AccountType> = {
  TICKET_MEAL: "TICKET_MEAL",
  TICKET_MEAL_INCOME: "TICKET_MEAL",
  FUEL_EXPENSE: "TICKET_FUEL",
  FUEL_INCOME: "TICKET_FUEL",
  UBER_EXPENSE: "TICKET_FUEL",
  UBER_INCOME: "TICKET_FUEL",
  VALE_TRANSPORTE_EXPENSE: "TICKET_FUEL",
  VALE_TRANSPORTE_INCOME: "TICKET_FUEL",
  TICKET_AWARD: "TICKET_AWARD",
  TICKET_AWARD_INCOME: "TICKET_AWARD",
};

const TICKET_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set<AccountType>([
  "TICKET_MEAL",
  "TICKET_FUEL",
  "TICKET_AWARD",
]);

export function isTicketAccountType(type: AccountType): boolean {
  return TICKET_ACCOUNT_TYPES.has(type);
}

/** systemKeys de mobilidade (Combustível, Uber, Vale Transporte). */
export const MOBILITY_SYSTEM_KEYS: ReadonlySet<string> = new Set([
  "FUEL_EXPENSE",
  "FUEL_INCOME",
  "UBER_EXPENSE",
  "UBER_INCOME",
  "VALE_TRANSPORTE_EXPENSE",
  "VALE_TRANSPORTE_INCOME",
]);

export function isMobilitySystemKey(systemKey: string | null | undefined): boolean {
  return !!systemKey && MOBILITY_SYSTEM_KEYS.has(systemKey);
}

const MEAL_SYSTEM_KEYS: ReadonlySet<string> = new Set([
  "TICKET_MEAL",
  "TICKET_MEAL_INCOME",
]);

const AWARD_SYSTEM_KEYS: ReadonlySet<string> = new Set([
  "TICKET_AWARD",
  "TICKET_AWARD_INCOME",
]);

const TICKET_SYSTEM_KEYS: ReadonlySet<string> = new Set<string>([
  ...MOBILITY_SYSTEM_KEYS,
  ...MEAL_SYSTEM_KEYS,
  ...AWARD_SYSTEM_KEYS,
]);

/** systemKeys cuja movimentação sempre debita o saldo da conta, mesmo em INCOME. */
const ALWAYS_DEBIT_SYSTEM_KEYS: ReadonlySet<string> = new Set([
  "UBER_EXPENSE",
  "UBER_INCOME",
]);

export function isAlwaysDebitCategory(systemKey: string | null | undefined): boolean {
  return !!systemKey && ALWAYS_DEBIT_SYSTEM_KEYS.has(systemKey);
}

/**
 * @deprecated use `validateCategoryOnAccount`. Mantido para compatibilidade
 * com call sites legados.
 */
export function getRequiredAccountType(
  systemKey: string | null | undefined,
): AccountType | null {
  if (!systemKey) return null;
  return CATEGORY_ACCOUNT_TYPE[systemKey] ?? null;
}

export type CategoryAccountValidation =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Regras de roteamento categoria → conta:
 * - TICKET_AWARD: aceita qualquer categoria (sem restrição).
 * - TICKET_MEAL: aceita qualquer categoria EXCETO mobilidade (Uber, Combustível, Vale Transporte).
 * - TICKET_FUEL: aceita SOMENTE categorias de mobilidade.
 * - Contas regulares (Corrente, Poupança, Caixa, etc.): bloqueia categorias roteadas a tickets.
 */
export function validateCategoryOnAccount(
  systemKey: string | null | undefined,
  accountType: AccountType,
): CategoryAccountValidation {
  switch (accountType) {
    case "TICKET_AWARD":
      return { ok: true };

    case "TICKET_MEAL":
      if (isMobilitySystemKey(systemKey)) {
        return {
          ok: false,
          error:
            "Categorias de mobilidade (Uber, Combustível, Vale Transporte) não podem ser usadas em contas Ticket Refeição.",
        };
      }
      return { ok: true };

    case "TICKET_FUEL":
      if (!isMobilitySystemKey(systemKey)) {
        return {
          ok: false,
          error:
            "Contas Ticket Combustível aceitam apenas categorias de mobilidade: Uber, Combustível e Vale Transporte.",
        };
      }
      return { ok: true };

    default:
      // Contas regulares (CHECKING, SAVINGS, CASH, CREDIT_CARD, INVESTMENT, OTHER):
      // bloqueia qualquer categoria roteada a ticket.
      if (systemKey && TICKET_SYSTEM_KEYS.has(systemKey)) {
        return {
          ok: false,
          error:
            "Categorias de ticket (Refeição, Combustível, Premiação, Vale Transporte) só podem ser usadas em contas do tipo correspondente.",
        };
      }
      return { ok: true };
  }
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
