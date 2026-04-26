import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDashboardData,
  type CategorySlice,
  type GroupAnalysis,
} from "@/lib/dashboard";
import { formatCalendarDateBR } from "@/lib/date";
import {
  BalanceLineChart,
  CompositionPieChart,
  GroupMonthlyBarChart,
} from "./DashboardCharts";
import { DashboardFilters } from "./DashboardFilters";

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const numeral = "font-semibold tracking-tight tabular-nums";
const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";

function SummaryTile({
  label,
  value,
  hint,
  accent,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  trend?: "up" | "down" | "flat";
}) {
  const arrow = trend === "up" ? "↗" : trend === "down" ? "↘" : "—";
  const arrowClass =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-rose-500"
        : "text-gray-400";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="p-5 pl-6">
        <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
          {label}
        </p>
        <p
          className={`mt-3 text-3xl text-gray-900 dark:text-white ${numeral}`}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={arrowClass} aria-hidden>
              {arrow}
            </span>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryRankedBars({
  data,
  accent,
  emptyLabel,
  max = 5,
}: {
  data: CategorySlice[];
  accent: string;
  emptyLabel: string;
  max?: number;
}) {
  if (!data.length) {
    return (
      <p className="py-6 text-center text-xs uppercase tracking-[0.22em] text-gray-400">
        {emptyLabel}
      </p>
    );
  }
  const top = data.slice(0, max);
  const maxValue = top.reduce((m, d) => Math.max(m, d.total), 0) || 1;
  return (
    <ul className="space-y-3">
      {top.map((cat) => {
        const widthPct = Math.max(2, (cat.total / maxValue) * 100);
        return (
          <li key={cat.id} className="group">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden
                />
                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                <span
                  className="tabular-nums text-gray-900 dark:text-gray-100"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatBRL(cat.total)}
                </span>
                <span
                  className="tabular-nums min-w-[2.75rem] text-right"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {cat.percent.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${cat.color} 0%, ${accent} 100%)`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function GroupCard({
  index,
  group,
  periodLabel,
  yearLabel,
}: {
  index: number;
  group: GroupAnalysis;
  periodLabel: string;
  yearLabel: string;
}) {
  const netPositive = group.net >= 0;
  const totalAbs = group.income + group.expense;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: group.accent }}
        aria-hidden
      />

      <header
        className="relative overflow-hidden border-b border-gray-100 px-7 py-6 dark:border-gray-800"
        style={{
          background: `linear-gradient(135deg, ${group.accent}14 0%, transparent 60%)`,
        }}
      >
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`${smallCaps} tabular-nums text-gray-500 dark:text-gray-400`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                Grupo · {String(index).padStart(2, "0")}
              </span>
              <span
                className="h-px w-8"
                style={{ background: group.accent }}
                aria-hidden
              />
              <span
                className={`${smallCaps}`}
                style={{ color: group.accent }}
              >
                {group.txCount} mov.
              </span>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
              {group.label}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Composição em {periodLabel} · tendência mensal de {yearLabel}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Saldo atual
            </p>
            <p
              className={`mt-1 text-3xl text-gray-900 dark:text-white ${numeral}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatBRL(group.currentBalance)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 dark:divide-gray-800 dark:border-gray-800">
        <div className="px-5 py-4">
          <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
            Receitas
          </p>
          <p
            className={`mt-1 text-base text-emerald-600 dark:text-emerald-400 ${numeral}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatBRL(group.income)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
            Despesas
          </p>
          <p
            className={`mt-1 text-base text-rose-600 dark:text-rose-400 ${numeral}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatBRL(group.expense)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
            Líquido
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-base ${numeral} ${
              netPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <span aria-hidden>{netPositive ? "↗" : "↘"}</span>
            {formatBRL(group.net)}
          </p>
        </div>
      </div>

      {/* corpo: composition pie + monthly bar */}
      <div className="grid gap-6 p-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-baseline justify-between">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Composição
            </p>
            <p className="text-[11px] tabular-nums text-gray-400">
              Receita + Despesa
            </p>
          </div>
          <CompositionPieChart
            data={group.composition}
            centerLabel="Volume total"
            centerValue={formatBRL(totalAbs)}
            emptyLabel="Sem movimentações no período"
          />
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Receitas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" aria-hidden />
              Despesas
            </span>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-2 flex items-baseline justify-between">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Receitas × Despesas por mês
            </p>
            <p className="text-[11px] tabular-nums text-gray-400">{yearLabel}</p>
          </div>
          <GroupMonthlyBarChart data={group.monthly} height={232} />
        </div>
      </div>

      <div className="grid gap-6 border-t border-gray-100 p-6 dark:border-gray-800 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Receitas por categoria
            </p>
            <p
              className="text-[11px] tabular-nums text-gray-400"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatBRL(group.income)}
            </p>
          </div>
          <CategoryRankedBars
            data={group.incomeByCategory}
            accent="#10b981"
            emptyLabel="Sem receitas"
          />
        </div>
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Despesas por categoria
            </p>
            <p
              className="text-[11px] tabular-nums text-gray-400"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatBRL(group.expense)}
            </p>
          </div>
          <CategoryRankedBars
            data={group.expenseByCategory}
            accent="#ef4444"
            emptyLabel="Sem despesas"
          />
        </div>
      </div>
    </article>
  );
}

type SearchParams = Promise<{ year?: string; month?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="p-6 text-gray-600 dark:text-gray-300">
        Sessão inválida. Faça login novamente.
      </div>
    );
  }

  const params = await searchParams;
  const parsedYear = Number.parseInt(params.year ?? "", 10);
  const parsedMonth = Number.parseInt(params.month ?? "", 10);
  const selectedYear =
    Number.isFinite(parsedYear) && parsedYear >= 1970 && parsedYear <= 9999
      ? parsedYear
      : undefined;
  const selectedMonth =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : null;

  const userId = session.user.id;
  const userName = session.user.name ?? "";
  const data = await getDashboardData(userId, {
    year: selectedYear,
    month: selectedMonth,
  });

  const {
    cards,
    balanceSeries,
    recentTransactions,
    period,
    annual,
  } = data;
  const totalBalance =
    cards.regularBalance +
    cards.ticketMealBalance +
    cards.ticketFuelBalance +
    cards.ticketAwardBalance;
  const net = cards.monthIncome - cards.monthExpense;
  const monthLabel = `${MONTH_NAMES[period.month - 1]} · ${period.year}`;

  const annualScopeLabel = annual.month
    ? `${MONTH_NAMES[annual.month - 1]} de ${annual.year}`
    : `${annual.year} · ano inteiro`;
  const yearLabel = `${annual.year}`;
  const annualNetPositive = annual.net >= 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* =================== HERO =================== */}
      <header className="relative overflow-hidden border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
                Painel financeiro · {monthLabel}
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {userName ? `Olá, ${userName}.` : "Dashboard"}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                Consolidado do mês corrente, análise anual e composição
                independente para cada grupo de contas.
              </p>
            </div>
            <div className="flex items-end gap-6">
              <div className="text-right">
                <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
                  Saldo consolidado
                </p>
                <p
                  className={`mt-1 text-3xl text-gray-900 dark:text-white ${numeral}`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatBRL(totalBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10 lg:px-8">
        {/* =================== MÊS CORRENTE =================== */}
        <section>
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className={`${smallCaps} text-gray-400`}>01 · Mês corrente</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {MONTH_NAMES[period.month - 1]} / {period.year}
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Snapshot em tempo real
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label="Contas regulares"
              value={formatBRL(cards.regularBalance)}
              hint="Corrente / poupança / caixa"
              accent="#0ea5e9"
            />
            <SummaryTile
              label="Receitas do mês"
              value={formatBRL(cards.monthIncome)}
              hint={`${cards.monthIncome > 0 ? "Entradas registradas" : "Sem entradas"}`}
              accent="#10b981"
              trend="up"
            />
            <SummaryTile
              label="Despesas do mês"
              value={formatBRL(cards.monthExpense)}
              hint={`${cards.monthExpense > 0 ? "Saídas registradas" : "Sem saídas"}`}
              accent="#ef4444"
              trend="down"
            />
            <SummaryTile
              label="Saldo líquido do mês"
              value={formatBRL(net)}
              hint={net >= 0 ? "Superávit no mês" : "Déficit no mês"}
              accent={net >= 0 ? "#14b8a6" : "#f43f5e"}
              trend={net >= 0 ? "up" : "down"}
            />
          </div>
        </section>

        {/* =================== EVOLUÇÃO DE SALDO =================== */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className={`${smallCaps} text-gray-400`}>Evolução do saldo</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                Últimos 6 meses por bucket
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Regular · Refeição · Combustível · Premiação
            </p>
          </div>
          <BalanceLineChart data={balanceSeries} />
        </section>

        {/* =================== ANÁLISE ANUAL — TOTAIS =================== */}
        <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`${smallCaps} text-gray-400`}>02 · Análise anual</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {annualScopeLabel}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Os filtros abaixo afetam composição e categorias dos 4 grupos.
                Os gráficos mensais por grupo cobrem o ano inteiro de{" "}
                {annual.year}.
              </p>
            </div>
            <DashboardFilters
              year={annual.year}
              month={annual.month}
              availableYears={annual.availableYears}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryTile
              label={annual.month ? "Receitas do mês" : "Receitas do ano"}
              value={formatBRL(annual.totalIncome)}
              hint={`${annual.incomeByCategory.length} categoria(s)`}
              accent="#10b981"
            />
            <SummaryTile
              label={annual.month ? "Despesas do mês" : "Despesas do ano"}
              value={formatBRL(annual.totalExpense)}
              hint={`${annual.expenseByCategory.length} categoria(s)`}
              accent="#ef4444"
            />
            <SummaryTile
              label="Saldo líquido"
              value={formatBRL(annual.net)}
              hint={annualNetPositive ? "Superávit no período" : "Déficit no período"}
              accent={annualNetPositive ? "#14b8a6" : "#f43f5e"}
              trend={annualNetPositive ? "up" : "down"}
            />
            <SummaryTile
              label="Maior receita"
              value={annual.topIncome ? annual.topIncome.name : "—"}
              hint={
                annual.topIncome
                  ? `${formatBRL(annual.topIncome.total)} · ${annual.topIncome.percent.toFixed(1)}%`
                  : "Sem receitas no período"
              }
              accent={annual.topIncome?.color ?? "#14b8a6"}
            />
            <SummaryTile
              label="Maior despesa"
              value={annual.topExpense ? annual.topExpense.name : "—"}
              hint={
                annual.topExpense
                  ? `${formatBRL(annual.topExpense.total)} · ${annual.topExpense.percent.toFixed(1)}%`
                  : "Sem despesas no período"
              }
              accent={annual.topExpense?.color ?? "#f43f5e"}
            />
          </div>
        </section>

        {/* =================== 4 GRUPOS =================== */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className={`${smallCaps} text-gray-400`}>
                03 · Composição por grupo
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                Regulares · Refeição · Combustível · Premiação
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cada grupo exibe pizza com receitas + despesas (cores por tipo)
                e o comparativo mensal completo do ano selecionado.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {annual.groups.map((group, i) => (
              <GroupCard
                key={group.key}
                index={i + 1}
                group={group}
                periodLabel={annualScopeLabel}
                yearLabel={yearLabel}
              />
            ))}
          </div>
        </section>

        {/* =================== MOVIMENTAÇÕES =================== */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className={`${smallCaps} text-gray-400`}>04 · Movimentações</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                Últimas 6 transações
              </h2>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="py-10 text-center text-xs uppercase tracking-[0.22em] text-gray-400">
              Nenhuma transação ainda
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...recentTransactions]
                .sort((a, b) =>
                  (a.description ?? "").localeCompare(
                    b.description ?? "",
                    "pt-BR",
                    { sensitivity: "base" },
                  ),
                )
                .map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl" aria-hidden>
                        {tx.categoryIcon ?? (tx.type === "INCOME" ? "⬆️" : "⬇️")}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {tx.description ?? "(sem descrição)"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {tx.categoryName ?? "Sem categoria"} · {tx.accountName}{" "}
                          · {formatCalendarDateBR(tx.date)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`${numeral} ${
                        tx.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {tx.type === "INCOME" ? "+" : "-"} {formatBRL(tx.amount)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
