import { prisma } from "@/lib/prisma";
import { AccountType, TransactionType } from "@prisma/client";

export interface DashboardCard {
  regularBalance: number;
  ticketMealBalance: number;
  ticketFuelBalance: number;
  ticketAwardBalance: number;
  monthIncome: number;
  monthExpense: number;
}

export interface BalancePoint {
  label: string;
  year: number;
  month: number;
  regular: number;
  ticketMeal: number;
  ticketFuel: number;
  ticketAward: number;
  total: number;
}

export interface CategorySlice {
  id: string;
  name: string;
  color: string;
  total: number;
  percent: number;
}

// Compatibilidade com código já existente
export type ExpenseSlice = CategorySlice;

export interface MonthlyBucket {
  month: number; // 1-12
  label: string; // jan, fev...
  income: number;
  expense: number;
  net: number;
}

export type TicketKey = "meal" | "fuel" | "award";

export interface TicketAnalysis {
  key: TicketKey;
  label: string;
  accent: string; // hex — ex: "#f59e0b"
  currentBalance: number; // snapshot atual (todas as contas do tipo)
  income: number; // receitas no período filtrado
  expense: number; // despesas no período filtrado
  net: number; // income - expense
  txCount: number;
  incomeByCategory: CategorySlice[];
  expenseByCategory: CategorySlice[];
}

export interface AnnualSummary {
  year: number;
  month: number | null; // null = ano inteiro
  totalIncome: number;
  totalExpense: number;
  net: number;
  monthly: MonthlyBucket[];
  incomeByCategory: CategorySlice[];
  expenseByCategory: CategorySlice[];
  topIncome: { name: string; total: number; color: string; percent: number } | null;
  topExpense: { name: string; total: number; color: string; percent: number } | null;
  availableYears: number[];
  tickets: TicketAnalysis[];
}

export interface RecentTransaction {
  id: string;
  description: string | null;
  amount: number;
  type: TransactionType;
  date: Date;
  categoryName: string | null;
  categoryIcon: string | null;
  accountName: string;
  accountType: AccountType;
}

export interface DashboardData {
  cards: DashboardCard;
  balanceSeries: BalancePoint[];
  expenseByCategory: CategorySlice[];
  recentTransactions: RecentTransaction[];
  period: { year: number; month: number };
  annual: AnnualSummary;
}

export interface DashboardOptions {
  year?: number;
  month?: number | null; // 1-12, null/undefined = ano inteiro
}

const PALETTE = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#0ea5e9",
];

const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function isTicket(type: AccountType): "meal" | "fuel" | "award" | null {
  if (type === "TICKET_MEAL") return "meal";
  if (type === "TICKET_FUEL") return "fuel";
  if (type === "TICKET_AWARD") return "award";
  return null;
}

export async function getDashboardData(
  userId: string,
  options: DashboardOptions = {},
): Promise<DashboardData> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 1);
  const seriesStart = new Date(currentYear, currentMonth - 5, 1);

  // Filtro anual (nova seção)
  const scopeYear = options.year ?? currentYear;
  const hasMonthFilter = options.month != null && options.month >= 1 && options.month <= 12;
  const scopeMonth = hasMonthFilter ? (options.month as number) - 1 : null;
  const yearStart = new Date(scopeYear, 0, 1);
  const yearEnd = new Date(scopeYear + 1, 0, 1);

  const [
    accounts,
    monthTransactions,
    seriesTransactions,
    expenseRows,
    recent,
    scopedTransactions,
    dateRange,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { balance: true, type: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      select: { type: true, amount: true, account: { select: { type: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: seriesStart, lt: monthEnd } },
      select: {
        type: true,
        amount: true,
        date: true,
        account: { select: { type: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
      },
      select: {
        amount: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 6,
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        date: true,
        category: { select: { name: true, icon: true } },
        account: { select: { name: true, type: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: yearStart, lt: yearEnd } },
      select: {
        type: true,
        amount: true,
        date: true,
        category: { select: { id: true, name: true, color: true } },
        account: { select: { type: true } },
      },
    }),
    prisma.transaction.aggregate({
      where: { userId },
      _min: { date: true },
      _max: { date: true },
    }),
  ]);

  // Saldos atuais (snapshot das contas)
  let regularBalance = 0;
  let ticketMealBalance = 0;
  let ticketFuelBalance = 0;
  let ticketAwardBalance = 0;
  for (const acc of accounts) {
    const balance = Number(acc.balance);
    const bucket = isTicket(acc.type);
    if (bucket === "meal") ticketMealBalance += balance;
    else if (bucket === "fuel") ticketFuelBalance += balance;
    else if (bucket === "award") ticketAwardBalance += balance;
    else regularBalance += balance;
  }

  // Totais do mês corrente
  let monthIncome = 0;
  let monthExpense = 0;
  for (const tx of monthTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === "INCOME") monthIncome += amount;
    else monthExpense += amount;
  }

  // Série dos últimos 6 meses — saldo ao fim de cada mês.
  // Estratégia: parte do saldo atual e subtrai os efeitos dos meses posteriores
  // para obter o saldo no fim de cada mês anterior.
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
    });
  }

  const effectPerMonth = new Map<
    string,
    { regular: number; meal: number; fuel: number; award: number }
  >();
  for (const tx of seriesTransactions) {
    const key = `${tx.date.getFullYear()}-${tx.date.getMonth()}`;
    const current =
      effectPerMonth.get(key) ?? { regular: 0, meal: 0, fuel: 0, award: 0 };
    const effect =
      tx.type === "INCOME" ? Number(tx.amount) : -Number(tx.amount);
    const bucket = isTicket(tx.account.type);
    if (bucket === "meal") current.meal += effect;
    else if (bucket === "fuel") current.fuel += effect;
    else if (bucket === "award") current.award += effect;
    else current.regular += effect;
    effectPerMonth.set(key, current);
  }

  const balanceSeries: BalancePoint[] = [];
  let runningRegular = regularBalance;
  let runningMeal = ticketMealBalance;
  let runningFuel = ticketFuelBalance;
  let runningAward = ticketAwardBalance;

  const reversed: BalancePoint[] = [];
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i];
    reversed.push({
      label: m.label,
      year: m.year,
      month: m.month + 1,
      regular: Number(runningRegular.toFixed(2)),
      ticketMeal: Number(runningMeal.toFixed(2)),
      ticketFuel: Number(runningFuel.toFixed(2)),
      ticketAward: Number(runningAward.toFixed(2)),
      total: Number(
        (runningRegular + runningMeal + runningFuel + runningAward).toFixed(2),
      ),
    });
    const eff = effectPerMonth.get(`${m.year}-${m.month}`);
    if (eff) {
      runningRegular -= eff.regular;
      runningMeal -= eff.meal;
      runningFuel -= eff.fuel;
      runningAward -= eff.award;
    }
  }
  for (let i = reversed.length - 1; i >= 0; i--) balanceSeries.push(reversed[i]);

  // Despesas por categoria (mês corrente) — pie antigo
  const expenseMap = new Map<
    string,
    { id: string; name: string; color: string; total: number }
  >();
  for (const row of expenseRows) {
    const cat = row.category;
    const id = cat?.id ?? "__none__";
    const name = cat?.name ?? "Sem categoria";
    const color = cat?.color ?? PALETTE[expenseMap.size % PALETTE.length];
    const existing = expenseMap.get(id) ?? { id, name, color, total: 0 };
    existing.total += Number(row.amount);
    expenseMap.set(id, existing);
  }
  const expenseTotalMonth = Array.from(expenseMap.values()).reduce(
    (acc, cur) => acc + cur.total,
    0,
  );
  const expenseByCategory: CategorySlice[] = Array.from(expenseMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((e, i) => ({
      id: e.id,
      name: e.name,
      color: e.color || PALETTE[i % PALETTE.length],
      total: Number(e.total.toFixed(2)),
      percent:
        expenseTotalMonth > 0
          ? Number(((e.total / expenseTotalMonth) * 100).toFixed(1))
          : 0,
    }));

  // ============================================================
  // ANÁLISE ANUAL (nova)
  // ============================================================

  // Série mensal do ano inteiro — sempre 12 meses para o bar chart
  const monthlyAgg: { income: number; expense: number }[] = Array.from(
    { length: 12 },
    () => ({ income: 0, expense: 0 }),
  );
  for (const tx of scopedTransactions) {
    const m = tx.date.getMonth();
    const amt = Number(tx.amount);
    if (tx.type === "INCOME") monthlyAgg[m].income += amt;
    else monthlyAgg[m].expense += amt;
  }
  const monthly: MonthlyBucket[] = monthlyAgg.map((b, i) => ({
    month: i + 1,
    label: MONTH_SHORT[i],
    income: Number(b.income.toFixed(2)),
    expense: Number(b.expense.toFixed(2)),
    net: Number((b.income - b.expense).toFixed(2)),
  }));

  // Para totais/pies: se mês filtrado, só esse mês; senão, o ano todo
  const filtered = hasMonthFilter
    ? scopedTransactions.filter((tx) => tx.date.getMonth() === scopeMonth)
    : scopedTransactions;

  const incomeCatMap = new Map<
    string,
    { id: string; name: string; color: string; total: number }
  >();
  const expenseCatMap = new Map<
    string,
    { id: string; name: string; color: string; total: number }
  >();
  let annualTotalIncome = 0;
  let annualTotalExpense = 0;

  for (const tx of filtered) {
    const amt = Number(tx.amount);
    const cat = tx.category;
    const id = cat?.id ?? "__none__";
    const name = cat?.name ?? "Sem categoria";

    if (tx.type === "INCOME") {
      annualTotalIncome += amt;
      const color = cat?.color ?? PALETTE[incomeCatMap.size % PALETTE.length];
      const ex = incomeCatMap.get(id) ?? { id, name, color, total: 0 };
      ex.total += amt;
      incomeCatMap.set(id, ex);
    } else {
      annualTotalExpense += amt;
      const color = cat?.color ?? PALETTE[expenseCatMap.size % PALETTE.length];
      const ex = expenseCatMap.get(id) ?? { id, name, color, total: 0 };
      ex.total += amt;
      expenseCatMap.set(id, ex);
    }
  }

  const incomeByCategory: CategorySlice[] = Array.from(incomeCatMap.values())
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({
      id: e.id,
      name: e.name,
      color: e.color || PALETTE[i % PALETTE.length],
      total: Number(e.total.toFixed(2)),
      percent:
        annualTotalIncome > 0
          ? Number(((e.total / annualTotalIncome) * 100).toFixed(1))
          : 0,
    }));

  const expenseByCategoryAnnual: CategorySlice[] = Array.from(
    expenseCatMap.values(),
  )
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({
      id: e.id,
      name: e.name,
      color: e.color || PALETTE[i % PALETTE.length],
      total: Number(e.total.toFixed(2)),
      percent:
        annualTotalExpense > 0
          ? Number(((e.total / annualTotalExpense) * 100).toFixed(1))
          : 0,
    }));

  // ============================================================
  // TICKETS — análise por tipo (respeita o filtro anual/mensal)
  // ============================================================
  type TicketBucket = {
    income: number;
    expense: number;
    txCount: number;
    incomeByCategory: Map<
      string,
      { id: string; name: string; color: string; total: number }
    >;
    expenseByCategory: Map<
      string,
      { id: string; name: string; color: string; total: number }
    >;
  };
  const mkBucket = (): TicketBucket => ({
    income: 0,
    expense: 0,
    txCount: 0,
    incomeByCategory: new Map(),
    expenseByCategory: new Map(),
  });
  const ticketBuckets: Record<TicketKey, TicketBucket> = {
    meal: mkBucket(),
    fuel: mkBucket(),
    award: mkBucket(),
  };

  for (const tx of filtered) {
    const bucketKey = isTicket(tx.account.type);
    if (!bucketKey) continue;
    const target = ticketBuckets[bucketKey];
    const amt = Number(tx.amount);
    target.txCount += 1;
    const cat = tx.category;
    const catId = cat?.id ?? "__none__";
    const catName = cat?.name ?? "Sem categoria";
    const destMap =
      tx.type === "INCOME" ? target.incomeByCategory : target.expenseByCategory;
    const color = cat?.color ?? PALETTE[destMap.size % PALETTE.length];
    const existing =
      destMap.get(catId) ?? { id: catId, name: catName, color, total: 0 };
    existing.total += amt;
    destMap.set(catId, existing);
    if (tx.type === "INCOME") target.income += amt;
    else target.expense += amt;
  }

  const mapToSlices = (
    m: TicketBucket["incomeByCategory"],
    totalRef: number,
  ): CategorySlice[] =>
    Array.from(m.values())
      .sort((a, b) => b.total - a.total)
      .map((e, i) => ({
        id: e.id,
        name: e.name,
        color: e.color || PALETTE[i % PALETTE.length],
        total: Number(e.total.toFixed(2)),
        percent:
          totalRef > 0 ? Number(((e.total / totalRef) * 100).toFixed(1)) : 0,
      }));

  const ticketMeta: Record<
    TicketKey,
    { label: string; accent: string; balance: number }
  > = {
    meal: { label: "Ticket Refeição", accent: "#f59e0b", balance: ticketMealBalance },
    fuel: { label: "Ticket Combustível", accent: "#e11d48", balance: ticketFuelBalance },
    award: { label: "Ticket Premiação", accent: "#8b5cf6", balance: ticketAwardBalance },
  };

  const tickets: TicketAnalysis[] = (Object.keys(ticketMeta) as TicketKey[]).map(
    (key) => {
      const b = ticketBuckets[key];
      const meta = ticketMeta[key];
      return {
        key,
        label: meta.label,
        accent: meta.accent,
        currentBalance: Number(meta.balance.toFixed(2)),
        income: Number(b.income.toFixed(2)),
        expense: Number(b.expense.toFixed(2)),
        net: Number((b.income - b.expense).toFixed(2)),
        txCount: b.txCount,
        incomeByCategory: mapToSlices(b.incomeByCategory, b.income),
        expenseByCategory: mapToSlices(b.expenseByCategory, b.expense),
      };
    },
  );

  const topIncome = incomeByCategory[0]
    ? {
        name: incomeByCategory[0].name,
        total: incomeByCategory[0].total,
        color: incomeByCategory[0].color,
        percent: incomeByCategory[0].percent,
      }
    : null;
  const topExpense = expenseByCategoryAnnual[0]
    ? {
        name: expenseByCategoryAnnual[0].name,
        total: expenseByCategoryAnnual[0].total,
        color: expenseByCategoryAnnual[0].color,
        percent: expenseByCategoryAnnual[0].percent,
      }
    : null;

  // Anos disponíveis — de minYear a maxYear, com o corrente e o escopo garantidos
  const minYear = dateRange._min.date?.getFullYear() ?? currentYear;
  const maxYear = dateRange._max.date?.getFullYear() ?? currentYear;
  const yearSet = new Set<number>();
  for (let y = minYear; y <= maxYear; y++) yearSet.add(y);
  yearSet.add(currentYear);
  yearSet.add(scopeYear);
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  const recentTransactions: RecentTransaction[] = recent.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: Number(tx.amount),
    type: tx.type,
    date: tx.date,
    categoryName: tx.category?.name ?? null,
    categoryIcon: tx.category?.icon ?? null,
    accountName: tx.account.name,
    accountType: tx.account.type,
  }));

  return {
    cards: {
      regularBalance: Number(regularBalance.toFixed(2)),
      ticketMealBalance: Number(ticketMealBalance.toFixed(2)),
      ticketFuelBalance: Number(ticketFuelBalance.toFixed(2)),
      ticketAwardBalance: Number(ticketAwardBalance.toFixed(2)),
      monthIncome: Number(monthIncome.toFixed(2)),
      monthExpense: Number(monthExpense.toFixed(2)),
    },
    balanceSeries,
    expenseByCategory,
    recentTransactions,
    period: { year: currentYear, month: currentMonth + 1 },
    annual: {
      year: scopeYear,
      month: hasMonthFilter ? (scopeMonth as number) + 1 : null,
      totalIncome: Number(annualTotalIncome.toFixed(2)),
      totalExpense: Number(annualTotalExpense.toFixed(2)),
      net: Number((annualTotalIncome - annualTotalExpense).toFixed(2)),
      monthly,
      incomeByCategory,
      expenseByCategory: expenseByCategoryAnnual,
      topIncome,
      topExpense,
      availableYears,
      tickets,
    },
  };
}
