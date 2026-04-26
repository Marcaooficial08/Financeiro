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

export type GroupKey = "regular" | "meal" | "fuel" | "award";

/**
 * Slice mista (receita + despesa) usada nas pizzas de composição. A cor é
 * atribuída por tipo: tons verdes para receitas, tons vermelho/laranja
 * para despesas — facilita leitura visual sem precisar de legenda extra.
 *
 * `share` é o percentual já calculado (0–100) — usa nome distinto de
 * "percent" para não colidir com o campo `percent` que o Recharts injeta
 * (escala 0–1) na callback do label.
 */
export interface CompositionSlice {
  id: string;
  name: string; // "Salário"
  label: string; // "Salário · Receita"
  txType: TransactionType;
  color: string;
  total: number;
  share: number; // % do total absoluto (income + expense) do grupo, escala 0–100
}

export interface GroupAnalysis {
  key: GroupKey;
  label: string;
  accent: string; // hex do grupo
  currentBalance: number;
  income: number;
  expense: number;
  net: number;
  txCount: number;
  composition: CompositionSlice[]; // pizza única com receitas + despesas
  monthly: MonthlyBucket[]; // 12 meses do ano em escopo
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
  groups: GroupAnalysis[]; // 4 grupos: regular, meal, fuel, award
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

// Tons verdes para receitas (escuro → claro). Atribuídos por ranking de valor.
const INCOME_PALETTE = [
  "#047857",
  "#059669",
  "#10b981",
  "#22c55e",
  "#34d399",
  "#84cc16",
  "#14b8a6",
  "#6ee7b7",
];

// Tons vermelho/laranja para despesas (escuro → claro).
const EXPENSE_PALETTE = [
  "#991b1b",
  "#dc2626",
  "#ef4444",
  "#e11d48",
  "#f97316",
  "#fb923c",
  "#f59e0b",
  "#fbbf24",
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

function groupOfAccount(type: AccountType): GroupKey {
  if (type === "TICKET_MEAL") return "meal";
  if (type === "TICKET_FUEL") return "fuel";
  if (type === "TICKET_AWARD") return "award";
  return "regular";
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
    const key = groupOfAccount(acc.type);
    if (key === "meal") ticketMealBalance += balance;
    else if (key === "fuel") ticketFuelBalance += balance;
    else if (key === "award") ticketAwardBalance += balance;
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
    const bucket = groupOfAccount(tx.account.type);
    current[bucket] += effect;
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

  // Despesas por categoria (mês corrente) — pie antigo, mantido para compat
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
  // ANÁLISE ANUAL
  // ============================================================

  // Para totais/pies anuais (não por grupo): se mês filtrado, só esse mês; senão, ano todo
  const filtered = hasMonthFilter
    ? scopedTransactions.filter((tx) => tx.date.getMonth() === scopeMonth)
    : scopedTransactions;

  // Totais anuais (todas as contas)
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
  // GRUPOS — análise por bucket (regular + 3 tickets)
  // Cada grupo usa transações filtradas (mês ou ano), com:
  //   • income/expense por categoria
  //   • monthly (12 meses do ano) — sempre ano inteiro p/ ver tendência
  //   • composition (income+expense unificado, cor por tipo)
  // ============================================================
  type GroupBucket = {
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
    monthlyAgg: { income: number; expense: number }[];
  };
  const mkBucket = (): GroupBucket => ({
    income: 0,
    expense: 0,
    txCount: 0,
    incomeByCategory: new Map(),
    expenseByCategory: new Map(),
    monthlyAgg: Array.from({ length: 12 }, () => ({ income: 0, expense: 0 })),
  });
  const groupBuckets: Record<GroupKey, GroupBucket> = {
    regular: mkBucket(),
    meal: mkBucket(),
    fuel: mkBucket(),
    award: mkBucket(),
  };

  // Monthly: usa o ANO completo (não respeita filtro de mês), pra gráfico de tendência
  for (const tx of scopedTransactions) {
    const key = groupOfAccount(tx.account.type);
    const m = tx.date.getMonth();
    const amt = Number(tx.amount);
    if (tx.type === "INCOME") groupBuckets[key].monthlyAgg[m].income += amt;
    else groupBuckets[key].monthlyAgg[m].expense += amt;
  }

  // Income/expense/composition: respeita o filtro (mês ou ano)
  for (const tx of filtered) {
    const key = groupOfAccount(tx.account.type);
    const target = groupBuckets[key];
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
    m: GroupBucket["incomeByCategory"],
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

  const buildComposition = (bucket: GroupBucket): CompositionSlice[] => {
    const totalAbs = bucket.income + bucket.expense;
    const incomeArr = Array.from(bucket.incomeByCategory.values()).sort(
      (a, b) => b.total - a.total,
    );
    const expenseArr = Array.from(bucket.expenseByCategory.values()).sort(
      (a, b) => b.total - a.total,
    );
    const slices: CompositionSlice[] = [];
    const computeShare = (value: number): number =>
      totalAbs > 0 ? Number(((value / totalAbs) * 100).toFixed(2)) : 0;
    incomeArr.forEach((e, i) => {
      slices.push({
        id: `${e.id}::INCOME`,
        name: e.name,
        label: `${e.name} · Receita`,
        txType: "INCOME",
        color: INCOME_PALETTE[i % INCOME_PALETTE.length],
        total: Number(e.total.toFixed(2)),
        share: computeShare(e.total),
      });
    });
    expenseArr.forEach((e, i) => {
      slices.push({
        id: `${e.id}::EXPENSE`,
        name: e.name,
        label: `${e.name} · Despesa`,
        txType: "EXPENSE",
        color: EXPENSE_PALETTE[i % EXPENSE_PALETTE.length],
        total: Number(e.total.toFixed(2)),
        share: computeShare(e.total),
      });
    });
    return slices.sort((a, b) => b.total - a.total);
  };

  const groupMeta: Record<
    GroupKey,
    { label: string; accent: string; balance: number }
  > = {
    regular: {
      label: "Contas Regulares",
      accent: "#6366f1",
      balance: regularBalance,
    },
    meal: {
      label: "Ticket Refeição",
      accent: "#f59e0b",
      balance: ticketMealBalance,
    },
    fuel: {
      label: "Ticket Combustível",
      accent: "#e11d48",
      balance: ticketFuelBalance,
    },
    award: {
      label: "Ticket Premiação",
      accent: "#8b5cf6",
      balance: ticketAwardBalance,
    },
  };

  const groups: GroupAnalysis[] = (Object.keys(groupMeta) as GroupKey[]).map(
    (key) => {
      const b = groupBuckets[key];
      const meta = groupMeta[key];
      const monthly: MonthlyBucket[] = b.monthlyAgg.map((m, i) => ({
        month: i + 1,
        label: MONTH_SHORT[i],
        income: Number(m.income.toFixed(2)),
        expense: Number(m.expense.toFixed(2)),
        net: Number((m.income - m.expense).toFixed(2)),
      }));
      return {
        key,
        label: meta.label,
        accent: meta.accent,
        currentBalance: Number(meta.balance.toFixed(2)),
        income: Number(b.income.toFixed(2)),
        expense: Number(b.expense.toFixed(2)),
        net: Number((b.income - b.expense).toFixed(2)),
        txCount: b.txCount,
        composition: buildComposition(b),
        monthly,
        incomeByCategory: mapToSlices(b.incomeByCategory, b.income),
        expenseByCategory: mapToSlices(b.expenseByCategory, b.expense),
      };
    },
  );

  // Monthly global (todas as contas, ano em escopo) — soma dos 4 grupos
  const monthly: MonthlyBucket[] = MONTH_SHORT.map((label, i) => {
    let income = 0;
    let expense = 0;
    for (const g of groups) {
      income += g.monthly[i].income;
      expense += g.monthly[i].expense;
    }
    return {
      month: i + 1,
      label,
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      net: Number((income - expense).toFixed(2)),
    };
  });

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
      groups,
    },
  };
}
