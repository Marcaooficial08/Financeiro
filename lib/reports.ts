import { prisma } from "@/lib/prisma"
import { TransactionType } from "@prisma/client"

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

interface ReportData {
  categories: CategorySummary[]
  monthly: MonthlySummary[]
  totalIncome: number
  totalExpense: number
  netCashflow: number
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

// 📋 API DE RELATÓRIOS PRINCIPAL
export async function generateReport(userId: string, start?: Date, end?: Date): Promise<ReportData> {
  try {
    const { start: startDate, end: endDate } = validatePeriod(start, end)
    const [categories, monthly, basic] = await Promise.all([
      getCategorySummary(userId, startDate, endDate),
      getMonthlySummary(userId, startDate, endDate),
      getBasicSummary(userId, startDate, endDate),
    ])

    const totalIncome = categories.filter(c => c.type === 'INCOME').reduce((sum, c) => sum + c.total, 0)
    const totalExpense = categories.filter(c => c.type === 'EXPENSE').reduce((sum, c) => sum + c.total, 0)

    return {
      categories,
      monthly,
      totalIncome,
      totalExpense,
      netCashflow: basic.netCashflow,
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