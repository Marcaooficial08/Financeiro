'use client'

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface CategoryReport {
  id: string
  name: string
  type: "INCOME" | "EXPENSE"
  icon?: string
  color?: string
  total: number
  count: number
}

interface MonthlyReport {
  year: number
  month: number
  totalIncome: number
  totalExpense: number
  netCashflow: number
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start', startDate)
      if (endDate) params.append('end', endDate)

      const response = await fetch(`/api/reports?${params.toString()}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar relatório')
      }

      const data = await response.json()
      setReport(data)
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
      setReport(null)
      setError('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = async () => {
    setError(null)

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: startDate || null,
          end: endDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao exportar CSV')
      }

      const csv = await response.text()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'relatorio_financeiro.csv'
      a.click()
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      setError('Erro ao exportar CSV')
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Relatórios Financeiros</h1>
          <p className="text-gray-500 dark:text-gray-400">Análise completa das suas finanças</p>
        </div>

        <section className="mb-6 rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Carregando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={exportCSV}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              Exportar CSV
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : report ? (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resumo Geral</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Período: {startDate ? format(new Date(startDate), 'MMMM yyyy', { locale: ptBR }) : 'Todos os períodos'}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Receitas Totais</p>
                  <p className="mt-3 text-2xl font-bold text-green-800 dark:text-green-100">
                    R$ {report.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Despesas Totais</p>
                  <p className="mt-3 text-2xl font-bold text-red-800 dark:text-red-100">
                    R$ {report.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Lucro Líquido</p>
                  <p className="mt-3 text-2xl font-bold text-blue-800 dark:text-blue-100">
                    R$ {report.netCashflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Média Mensal</p>
                  <p className="mt-3 text-2xl font-bold text-purple-800 dark:text-purple-100">
                    R$ {(report.netCashflow / (report.monthly.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agrupamento por Categoria</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Top 10 categorias no período selecionado</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {report.categories.map((cat: CategoryReport) => (
                  <div key={cat.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cat.type === 'INCOME' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {cat.type}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {cat.type === 'INCOME' ? '+' : '-'} R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{cat.count} transações</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resumo Mensal</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Evolução dos saldos ao longo do tempo</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {report.monthly.map((m: MonthlyReport) => (
                  <div key={`${m.year}-${m.month}`} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">{m.year}-{String(m.month).padStart(2, '0')}</h3>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Receitas:</span>
                        <span>R$ {m.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Despesas:</span>
                        <span>R$ {m.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Líquido:</span>
                        <span className={m.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}>
                          R$ {m.netCashflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400 shadow-sm">
            Nenhum relatório disponível.
          </div>
        )}
      </div>
    </div>
  )
}
