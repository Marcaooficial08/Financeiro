import { prisma } from "@/lib/prisma"
import { TransactionType, AccountType } from "@prisma/client"

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
  /** @deprecated manter por compatibilidade — prefira ticketMeal/ticketFuel */
  ticket: TicketSummary
  ticketMeal: TicketSummary
  ticketFuel: TicketSummary
  period: { start: Date; end: Date }
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

  const categories = await prisma.category.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { name: 'asc' },
  })

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      categoryId: { in: categories.map(c => c.id) },
      date: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      type: true,
      categoryId: true,
    },
  })

  // Agrupar por categoria
  const summaryMap = new Map<string, { id: string; total: number; count: number; type: TransactionType; name: string; icon?: string; color?: string }>()

  categories.forEach(cat => {
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

  transactions.forEach(tx => {
    const existing = summaryMap.get(tx.categoryId!)
    if (existing) {
      existing.total += Number(tx.amount)
      existing.count += 1
    }
  })

  return Array.from(summaryMap.values())
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10) // Top 10 categorias
}

// 📅 RESUMO MENSAL
async function getMonthlySummary(userId: string, start?: Date, end?: Date) {
  const { start: startDate, end: endDate } = validatePeriod(start, end)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
  })

  // Agrupar por mês
  const monthlyMap = new Map<string, { year: number; month: number; income: number; expense: number }>()

  transactions.forEach(tx => {
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

// 🎫 RESUMO DE TICKET (transações em contas do tipo informado)
async function getTicketSummary(
  userId: string,
  accountType: AccountType,
  start?: Date,
  end?: Date,
): Promise<TicketSummary> {
  const { start: startDate, end: endDate } = validatePeriod(start, end)

  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
      account: { type: accountType },
    },
    _sum: { amount: true },
    _count: { _all: true },
  })

  let income = 0
  let expense = 0
  let transactionCount = 0
  for (const row of grouped) {
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
    const [categories, monthly, basic, ticketMeal, ticketFuel] = await Promise.all([
      getCategorySummary(userId, startDate, endDate),
      getMonthlySummary(userId, startDate, endDate),
      getBasicSummary(userId, startDate, endDate),
      getTicketSummary(userId, 'TICKET_MEAL', startDate, endDate),
      getTicketSummary(userId, 'TICKET_FUEL', startDate, endDate),
    ])

    const totalIncome = categories.filter(c => c.type === 'INCOME').reduce((sum, c) => sum + c.total, 0)
    const totalExpense = categories.filter(c => c.type === 'EXPENSE').reduce((sum, c) => sum + c.total, 0)

    // Compatibilidade: campo legado `ticket` agregando os dois.
    const ticket: TicketSummary = {
      income: ticketMeal.income + ticketFuel.income,
      expense: ticketMeal.expense + ticketFuel.expense,
      net: ticketMeal.net + ticketFuel.net,
      transactionCount: ticketMeal.transactionCount + ticketFuel.transactionCount,
    }

    return {
      categories,
      monthly,
      totalIncome,
      totalExpense,
      netCashflow: basic.netCashflow,
      ticket,
      ticketMeal,
      ticketFuel,
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