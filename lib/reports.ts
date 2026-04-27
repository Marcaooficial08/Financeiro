import { prisma } from "@/lib/prisma"

type TransactionType = "INCOME" | "EXPENSE"

type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CASH"
  | "CREDIT_CARD"
  | "INVESTMENT"
  | "OTHER"
  | "TICKET_MEAL"
  | "TICKET_FUEL"
  | "TICKET_AWARD"

type DecimalLike = number | string | { toString(): string }

type CategoryRow = {
  id: string
  name: string
  type: TransactionType
  icon: string | null
  color: string | null
}

type CategoryTxRow = {
  amount: DecimalLike
  type: TransactionType
  categoryId: string | null
}

type MonthlyTxRow = {
  amount: DecimalLike
  type: TransactionType
  date: Date
}

type AccountIdRow = { id: string }

type GroupByRow = {
  type: TransactionType
  _sum: { amount: DecimalLike | null }
  _count: { _all: number } | null
}

// 📊 TIPO DE RETORNO PARA AGREGADOS
interface CategorySummary {
  id: string
  name: string
  type: TransactionType
  icon?: string
  color?: string
  total: number
  count: number
}

interface MonthlySummary {
  year: number
  month: number
  totalIncome: number
  totalExpense: number
  netCashflow: number
}

interface TicketSummary {
  income: number
  expense: number
  net: number
  transactionCount: number
}

interface ReportData {
  categories: CategorySummary[]
  monthly: MonthlySummary[]
  totalIncome: number
  totalExpense: number
  netCashflow: number
  /** @deprecated manter por compatibilidade — prefira ticketMeal/ticketFuel/ticketAward */
  ticket: TicketSummary
  /** Contas regulares: Corrente, Poupança, Dinheiro, Cartão, Investimento, Outro. */
  regular: TicketSummary
  ticketMeal: TicketSummary
  ticketFuel: TicketSummary
  ticketAward: TicketSummary
  period: { start: Date; end: Date }
}

/**
 * Versão do ReportData 100% serializável para atravessar a fronteira
 * server→client (Next.js RSC). Sem Date, sem Decimal — só number/string.
 */
export interface PlainReportData {
  categories: CategorySummary[]
  monthly: MonthlySummary[]
  totalIncome: number
  totalExpense: number
  netCashflow: number
  ticket: TicketSummary
  regular: TicketSummary
  ticketMeal: TicketSummary
  ticketFuel: TicketSummary
  ticketAward: TicketSummary
  period: { start: string; end: string }
}

const num = (v: unknown) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Converte o retorno de generateReport em um objeto totalmente plano. */
export function toPlainReport(data: ReportData): PlainReportData {
  return {
    categories: data.categories.map((c) => ({
      id: String(c.id),
      name: String(c.name),
      type: c.type,
      icon: c.icon,
      color: c.color,
      total: num(c.total),
      count: num(c.count),
    })),
    monthly: data.monthly.map((m) => ({
      year: num(m.year),
      month: num(m.month),
      totalIncome: num(m.totalIncome),
      totalExpense: num(m.totalExpense),
      netCashflow: num(m.netCashflow),
    })),
    totalIncome: num(data.totalIncome),
    totalExpense: num(data.totalExpense),
    netCashflow: num(data.netCashflow),
    ticket: {
      income: num(data.ticket.income),
      expense: num(data.ticket.expense),
      net: num(data.ticket.net),
      transactionCount: num(data.ticket.transactionCount),
    },
    regular: {
      income: num(data.regular.income),
      expense: num(data.regular.expense),
      net: num(data.regular.net),
      transactionCount: num(data.regular.transactionCount),
    },
    ticketMeal: {
      income: num(data.ticketMeal.income),
      expense: num(data.ticketMeal.expense),
      net: num(data.ticketMeal.net),
      transactionCount: num(data.ticketMeal.transactionCount),
    },
    ticketFuel: {
      income: num(data.ticketFuel.income),
      expense: num(data.ticketFuel.expense),
      net: num(data.ticketFuel.net),
      transactionCount: num(data.ticketFuel.transactionCount),
    },
    ticketAward: {
      income: num(data.ticketAward.income),
      expense: num(data.ticketAward.expense),
      net: num(data.ticketAward.net),
      transactionCount: num(data.ticketAward.transactionCount),
    },
    period: {
      start: data.period.start.toISOString(),
      end: data.period.end.toISOString(),
    },
  }
}

// 🗓️ VALIDAÇÃO DE PERÍODO
function validatePeriod(start?: Date, end?: Date) {
  const now = new Date()
  const startDate = start || new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = end || new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return { start: startDate, end: endDate }
}

// 📈 RESUMO GERAL (sem filtros complexos)
async function getBasicSummary(userId: string, start?: Date, end?: Date) {
  const { start: startDate, end: endDate } = validatePeriod(start, end)

  // ✅ PRISMA - consultas otimizadas
  const [income, expenses] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        type: 'INCOME',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
  ])

  const totalIncome = income[0]?._sum?.amount ? Number(income[0]._sum.amount) : 0
  const totalExpense = expenses[0]?._sum?.amount ? Number(expenses[0]._sum.amount) : 0

  return {
    totalIncome,
    totalExpense: totalExpense,
    netCashflow: totalIncome - totalExpense,
  }
}

// 🎯 RESUMO POR CATEGORIA
async function getCategorySummary(userId: string, start?: Date, end?: Date) {
  const { start: startDate, end: endDate } = validatePeriod(start, end)

  const categories = (await prisma.category.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { name: 'asc' },
  })) as unknown as CategoryRow[]

  const transactions = (await prisma.transaction.findMany({
    where: {
      userId,
      categoryId: { in: categories.map((c: CategoryRow) => c.id) },
      date: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      type: true,
      categoryId: true,
    },
  })) as unknown as CategoryTxRow[]

  // Agrupar por categoria
  const summaryMap = new Map<string, { id: string; total: number; count: number; type: TransactionType; name: string; icon?: string; color?: string }>()

  categories.forEach((cat: CategoryRow) => {
    summaryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      type: cat.type,
      icon: cat.icon ?? undefined,
      color: cat.color ?? undefined,
      total: 0,
      count: 0,
    })
  })

  transactions.forEach((tx: CategoryTxRow) => {
    if (!tx.categoryId) return
    const existing = summaryMap.get(tx.categoryId)
    if (existing) {
      existing.total += Number(tx.amount)
      existing.count += 1
    }
  })

  return Array.from(summaryMap.values())
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10) // Top 10 por total
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })) // Exibe em ordem alfabética
}

// 📅 RESUMO MENSAL
async function getMonthlySummary(userId: string, start?: Date, end?: Date) {
  const { start: startDate, end: endDate } = validatePeriod(start, end)

  const transactions = (await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
  })) as unknown as MonthlyTxRow[]

  // Agrupar por mês
  const monthlyMap = new Map<string, { year: number; month: number; income: number; expense: number }>()

  transactions.forEach((tx: MonthlyTxRow) => {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
    const existing = monthlyMap.get(key) || { year: tx.date.getFullYear(), month: tx.date.getMonth() + 1, income: 0, expense: 0 }

    if (tx.type === 'INCOME') {
      existing.income += Number(tx.amount)
    } else {
      existing.expense += Number(tx.amount)
    }

    monthlyMap.set(key, existing)
  })

  return Array.from(monthlyMap.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
    .map(m => ({
      year: m.year,
      month: m.month,
      totalIncome: m.income,
      totalExpense: m.expense,
      netCashflow: m.income - m.expense,
    }))
}

// 📤 EXPORTAÇÃO CSV
function exportToCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0] || {})
  const csvRows = []

  csvRows.push(headers.join(','))

  data.forEach(row => {
    const values = headers.map(header => {
      let val = row[header]
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        val = `"${val.replace(/"/g, '""')}"`
      }
      return val
    })
    csvRows.push(values.join(','))
  })

  return csvRows.join('\n')
}

// Tipos de conta considerados "ticket-benefício" — excluídos do grupo regular.
const TICKET_ACCOUNT_TYPES: AccountType[] = ['TICKET_MEAL', 'TICKET_FUEL', 'TICKET_AWARD']

// 🏦 RESUMO DE CONTAS REGULARES (Corrente, Poupança, Dinheiro, Cartão, Investimento, Outro)
async function getRegularSummary(
  userId: string,
  start?: Date,
  end?: Date,
): Promise<TicketSummary> {
  const { start: startDate, end: endDate } = validatePeriod(start, end)

  const accounts = await prisma.account.findMany({
    where: { userId, type: { notIn: TICKET_ACCOUNT_TYPES } },
    select: { id: true },
  })

  if (accounts.length === 0) {
    return { income: 0, expense: 0, net: 0, transactionCount: 0 }
  }

  const accountIds = (accounts as unknown as AccountIdRow[]).map((a: AccountIdRow) => a.id)

  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      accountId: { in: accountIds },
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { _all: true },
  })

  let income = 0
  let expense = 0
  let transactionCount = 0
  for (const row of grouped as unknown as GroupByRow[]) {
    const sum = row._sum?.amount ? Number(row._sum.amount) : 0
    transactionCount += row._count?._all ?? 0
    if (row.type === 'INCOME') income = sum
    else expense = sum
  }

  return { income, expense, net: income - expense, transactionCount }
}

// 🎫 RESUMO DE TICKET (transações em contas do tipo informado)
async function getTicketSummary(
  userId: string,
  accountType: AccountType,
  start?: Date,
  end?: Date,
): Promise<TicketSummary> {
  const { start: startDate, end: endDate } = validatePeriod(start, end)

  // groupBy não aceita filtros por relação (`account: { type: ... }`) —
  // resolvemos em dois passos usando apenas campos escalares.
  const accounts = await prisma.account.findMany({
    where: { userId, type: accountType },
    select: { id: true },
  })

  if (accounts.length === 0) {
    return { income: 0, expense: 0, net: 0, transactionCount: 0 }
  }

  const accountIds = (accounts as unknown as AccountIdRow[]).map((a: AccountIdRow) => a.id)

  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      accountId: { in: accountIds },
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { _all: true },
  })

  let income = 0
  let expense = 0
  let transactionCount = 0
  for (const row of grouped as unknown as GroupByRow[]) {
    const sum = row._sum?.amount ? Number(row._sum.amount) : 0
    transactionCount += row._count?._all ?? 0
    if (row.type === 'INCOME') income = sum
    else expense = sum
  }

  return { income, expense, net: income - expense, transactionCount }
}

// 📋 API DE RELATÓRIOS PRINCIPAL
export async function generateReport(userId: string, start?: Date, end?: Date): Promise<ReportData> {
  try {
    const { start: startDate, end: endDate } = validatePeriod(start, end)
    const [categories, monthly, basic, regular, ticketMeal, ticketFuel, ticketAward] = await Promise.all([
      getCategorySummary(userId, startDate, endDate),
      getMonthlySummary(userId, startDate, endDate),
      getBasicSummary(userId, startDate, endDate),
      getRegularSummary(userId, startDate, endDate),
      getTicketSummary(userId, 'TICKET_MEAL', startDate, endDate),
      getTicketSummary(userId, 'TICKET_FUEL', startDate, endDate),
      getTicketSummary(userId, 'TICKET_AWARD', startDate, endDate),
    ])

    const totalIncome = categories.filter(c => c.type === 'INCOME').reduce((sum, c) => sum + c.total, 0)
    const totalExpense = categories.filter(c => c.type === 'EXPENSE').reduce((sum, c) => sum + c.total, 0)

    // Compatibilidade: campo legado `ticket` agregando os três.
    const ticket: TicketSummary = {
      income: ticketMeal.income + ticketFuel.income + ticketAward.income,
      expense: ticketMeal.expense + ticketFuel.expense + ticketAward.expense,
      net: ticketMeal.net + ticketFuel.net + ticketAward.net,
      transactionCount:
        ticketMeal.transactionCount + ticketFuel.transactionCount + ticketAward.transactionCount,
    }

    return {
      categories,
      monthly,
      totalIncome,
      totalExpense,
      netCashflow: basic.netCashflow,
      ticket,
      regular,
      ticketMeal,
      ticketFuel,
      ticketAward,
      period: { start: startDate, end: endDate },
    }
  } catch (error) {
    console.error("Erro ao gerar relatório:", error)
    throw error
  }
}

export function exportReportCSV(reportData: ReportData): string {
  const allRows = []

  // Resumo por categoria
  allRows.push(...reportData.categories.map(cat => ({
    type: cat.type,
    category: cat.name,
    total: cat.total,
    count: cat.count,
  })))

  // Resumo mensal
  allRows.push(...reportData.monthly.map(mon => ({
    period: `${mon.year}-${String(mon.month).padStart(2, '0')}`,
    totalIncome: mon.totalIncome,
    totalExpense: mon.totalExpense,
    netCashflow: mon.netCashflow,
  })))

  return exportToCSV(allRows, 'relatorio_financeiro')
}