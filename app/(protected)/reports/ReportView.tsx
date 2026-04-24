"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PlainReportData } from "@/lib/reports";

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";
const numeral = "font-semibold tabular-nums";
const tabularStyle = { fontVariantNumeric: "tabular-nums" as const };

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-600";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200";

const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

type TicketTone = "meal" | "fuel" | "award";

const ticketTone: Record<
  TicketTone,
  { label: string; accent: string; ring: string; dot: string; tint: string }
> = {
  meal: {
    label: "Ticket Refeição",
    accent: "#f59e0b",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    tint: "text-amber-600 dark:text-amber-300",
  },
  fuel: {
    label: "Ticket Combustível",
    accent: "#e11d48",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
    tint: "text-rose-600 dark:text-rose-300",
  },
  award: {
    label: "Ticket Premiação",
    accent: "#8b5cf6",
    ring: "ring-violet-500/20",
    dot: "bg-violet-500",
    tint: "text-violet-600 dark:text-violet-300",
  },
};

function SectionHeader({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <div>
        <p className={`${smallCaps} text-gray-500 dark:text-gray-500`}>
          <span className="text-gray-900 dark:text-gray-200">{index}</span>
          <span className="mx-2 text-gray-300 dark:text-gray-700">/</span>
          {title}
        </p>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
  sublabel,
  negative = false,
}: {
  label: string;
  value: string;
  accent: string;
  sublabel?: string;
  negative?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
        aria-hidden
      />
      <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>{label}</p>
      <p
        className={`mt-3 text-2xl ${numeral} ${
          negative
            ? "text-rose-600 dark:text-rose-400"
            : "text-gray-900 dark:text-white"
        }`}
        style={tabularStyle}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          {sublabel}
        </p>
      )}
    </div>
  );
}

function TicketDossier({
  tone,
  income,
  expense,
  net,
  count,
}: {
  tone: TicketTone;
  income: number;
  expense: number;
  net: number;
  count: number;
}) {
  const meta = ticketTone[tone];
  const netPositive = net >= 0;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: meta.accent }}
        aria-hidden
      />
      <div
        className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ background: meta.accent }}
        aria-hidden
      />
      <div className="relative p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-2 w-2 rounded-full ${meta.dot}`}
              aria-hidden
            />
            <div>
              <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
                Dossiê · benefício
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                {meta.label}
              </h3>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ring-1 ${meta.ring} ${meta.tint}`}
          >
            {count} {count === 1 ? "movimentação" : "movimentações"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Receitas
            </p>
            <p
              className={`mt-2 text-xl ${numeral} text-emerald-600 dark:text-emerald-400`}
              style={tabularStyle}
            >
              {formatBRL(income)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Despesas
            </p>
            <p
              className={`mt-2 text-xl ${numeral} text-rose-600 dark:text-rose-400`}
              style={tabularStyle}
            >
              {formatBRL(expense)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Saldo líquido
            </p>
            <p
              className={`mt-2 text-xl ${numeral} ${
                netPositive
                  ? "text-gray-900 dark:text-white"
                  : "text-rose-600 dark:text-rose-400"
              }`}
              style={tabularStyle}
            >
              {formatBRL(net)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ReportView({ report }: { report: PlainReportData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState<string>(searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState<string>(searchParams.get("end") ?? "");
  const [error, setError] = useState<string | null>(null);

  const applyFilters = () => {
    setError(null);
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    startTransition(() => {
      router.push(`/reports?${params.toString()}`);
    });
  };

  const exportCSV = async () => {
    setError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: startDate || null,
          end: endDate || null,
        }),
      });
      if (!response.ok) throw new Error(`Falha ao exportar CSV (HTTP ${response.status})`);
      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio_financeiro.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar CSV:", err);
      setError(err instanceof Error ? err.message : "Erro ao exportar CSV");
    }
  };

  const avgMonthly = report.netCashflow / (report.monthly.length || 1);
  const periodLabel = startDate
    ? `Desde ${format(new Date(startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}${
        endDate ? ` até ${format(new Date(endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}` : ""
      }`
    : "Todos os períodos";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        <header className="mb-10">
          <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
            Dossiê · Relatórios
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Relatórios financeiros
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Análise completa das suas finanças, com recorte por ticket-benefício
            e evolução mensal. {periodLabel}.
          </p>
        </header>

        <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 flex items-center gap-3">
            <span
              className="inline-block h-2 w-2 rounded-full bg-indigo-500"
              aria-hidden
            />
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Filtros · período
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <div>
              <label
                htmlFor="start"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Período inicial
              </label>
              <input
                id="start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="end"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Período final
              </label>
              <input
                id="end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={applyFilters}
              disabled={isPending}
              className={primaryBtn}
            >
              {isPending ? "Carregando…" : "Atualizar"}
              {!isPending && <span aria-hidden>→</span>}
            </button>
            <button type="button" onClick={exportCSV} className={ghostBtn}>
              Exportar CSV
            </button>
          </div>
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <span
                className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-500"
                aria-hidden
              />
              <span>{error}</span>
            </div>
          )}
        </section>

        <div className="space-y-10">
          <section>
            <SectionHeader
              index="01"
              title="Resumo geral"
              subtitle="Totais consolidados no período selecionado."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SummaryTile
                label="Receitas totais"
                value={formatBRL(report.totalIncome)}
                accent="#10b981"
              />
              <SummaryTile
                label="Despesas totais"
                value={formatBRL(report.totalExpense)}
                accent="#f43f5e"
                negative
              />
              <SummaryTile
                label="Lucro líquido"
                value={formatBRL(report.netCashflow)}
                accent="#6366f1"
                negative={report.netCashflow < 0}
              />
              <SummaryTile
                label="Média mensal"
                value={formatBRL(avgMonthly)}
                accent="#0ea5e9"
                sublabel={`${report.monthly.length || 0} ${
                  report.monthly.length === 1 ? "mês" : "meses"
                } analisados`}
                negative={avgMonthly < 0}
              />
            </div>
          </section>

          <section>
            <SectionHeader
              index="02"
              title="Dossiês de ticket-benefício"
              subtitle="Movimentações segmentadas por tipo de conta-benefício."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <TicketDossier
                tone="meal"
                income={report.ticketMeal.income}
                expense={report.ticketMeal.expense}
                net={report.ticketMeal.net}
                count={report.ticketMeal.transactionCount}
              />
              <TicketDossier
                tone="fuel"
                income={report.ticketFuel.income}
                expense={report.ticketFuel.expense}
                net={report.ticketFuel.net}
                count={report.ticketFuel.transactionCount}
              />
              <TicketDossier
                tone="award"
                income={report.ticketAward.income}
                expense={report.ticketAward.expense}
                net={report.ticketAward.net}
                count={report.ticketAward.transactionCount}
              />
            </div>
          </section>

          <section>
            <SectionHeader
              index="03"
              title="Agrupamento por categoria"
              subtitle="Top 10 categorias no período selecionado, por volume financeiro."
            />
            {report.categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Nenhuma transação no período.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {report.categories.map((cat) => {
                  const isIncome = cat.type === "INCOME";
                  const accent = isIncome ? "#10b981" : "#f43f5e";
                  return (
                    <div
                      key={cat.id}
                      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ background: accent }}
                        aria-hidden
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`${smallCaps} ${
                              isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isIncome ? "Receita" : "Despesa"}
                          </p>
                          <h4 className="mt-1 truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                            {cat.name}
                          </h4>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ring-1 ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          {cat.count}
                        </span>
                      </div>
                      <p
                        className={`mt-4 text-2xl ${numeral} ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                        style={tabularStyle}
                      >
                        {isIncome ? "+ " : "− "}
                        {formatBRL(cat.total)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        {cat.count}{" "}
                        {cat.count === 1 ? "transação" : "transações"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              index="04"
              title="Resumo mensal"
              subtitle="Evolução dos saldos ao longo do tempo."
            />
            {report.monthly.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Nenhuma transação no período.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {report.monthly.map((m) => {
                  const netPositive = m.netCashflow >= 0;
                  const monthDate = new Date(m.year, m.month - 1, 1);
                  const monthLabel = format(monthDate, "MMMM", { locale: ptBR });
                  return (
                    <div
                      key={`${m.year}-${m.month}`}
                      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <span
                        className={`absolute inset-y-0 left-0 w-1 ${
                          netPositive ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        aria-hidden
                      />
                      <div className="mb-4 flex items-baseline justify-between">
                        <div>
                          <p
                            className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                          >
                            {m.year}
                          </p>
                          <h4 className="mt-1 text-base font-semibold capitalize tracking-tight text-gray-900 dark:text-white">
                            {monthLabel}
                          </h4>
                        </div>
                        <span
                          className={`${numeral} text-sm ${
                            netPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                          style={tabularStyle}
                        >
                          {netPositive ? "+" : "−"}
                          {formatBRL(Math.abs(m.netCashflow))}
                        </span>
                      </div>
                      <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                          <dt className="flex items-center gap-2">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                              aria-hidden
                            />
                            Receitas
                          </dt>
                          <dd
                            className="tabular-nums text-gray-900 dark:text-white"
                            style={tabularStyle}
                          >
                            {formatBRL(m.totalIncome)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                          <dt className="flex items-center gap-2">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500"
                              aria-hidden
                            />
                            Despesas
                          </dt>
                          <dd
                            className="tabular-nums text-gray-900 dark:text-white"
                            style={tabularStyle}
                          >
                            {formatBRL(m.totalExpense)}
                          </dd>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                          <dt
                            className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                          >
                            Líquido
                          </dt>
                          <dd
                            className={`${numeral} ${
                              netPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                            style={tabularStyle}
                          >
                            {formatBRL(m.netCashflow)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
