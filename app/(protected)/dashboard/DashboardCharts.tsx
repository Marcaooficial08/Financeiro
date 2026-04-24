"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  BalancePoint,
  CategorySlice,
  ExpenseSlice,
  MonthlyBucket,
} from "@/lib/dashboard";

const formatBRL = (
  value: number | string | Array<number | string> | undefined,
) => {
  if (value === undefined) return "";
  const num = Array.isArray(value) ? Number(value[0]) : Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const tooltipStyle = { borderRadius: 12, border: "1px solid #e5e7eb" };

export function BalanceLineChart({ data }: { data: BalancePoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-400">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) =>
            value.toLocaleString("pt-BR", {
              notation: "compact",
              maximumFractionDigits: 1,
            })
          }
        />
        <Tooltip
          formatter={(value) => formatBRL(value as number)}
          labelFormatter={(label) => `Mês: ${label}`}
          contentStyle={tooltipStyle}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          name="Saldo total"
          stroke="#6366f1"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="regular"
          name="Contas regulares"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="ticketMeal"
          name="Ticket Refeição"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="ticketFuel"
          name="Ticket Combustível"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="ticketAward"
          name="Ticket Premiação"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExpensesPieChart({ data }: { data: ExpenseSlice[] }) {
  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-400">
        Nenhuma despesa no mês corrente
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={55}
          paddingAngle={2}
          label={({ name, percent }) =>
            percent && percent > 0.06
              ? `${name} ${(percent * 100).toFixed(0)}%`
              : ""
          }
        >
          {data.map((slice) => (
            <Cell key={slice.id} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatBRL(value as number)}
          contentStyle={tooltipStyle}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBarChart({ data }: { data: MonthlyBucket[] }) {
  if (!data.length) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-gray-400">
        Sem dados no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) =>
            value.toLocaleString("pt-BR", {
              notation: "compact",
              maximumFractionDigits: 1,
            })
          }
        />
        <Tooltip
          formatter={(value, name) => [formatBRL(value as number), name]}
          labelFormatter={(label) => `Mês: ${label}`}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(99,102,241,0.08)" }}
        />
        <Legend />
        <Bar
          dataKey="income"
          name="Receitas"
          fill="#10b981"
          radius={[6, 6, 0, 0]}
        />
        <Bar
          dataKey="expense"
          name="Despesas"
          fill="#ef4444"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TicketDonut({
  data,
  centerLabel,
  centerValue,
  accent,
  emptyLabel,
}: {
  data: CategorySlice[];
  centerLabel: string;
  centerValue: string;
  accent: string;
  emptyLabel?: string;
}) {
  if (!data.length) {
    return (
      <div className="relative flex h-56 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full opacity-[0.06]"
          style={{
            background: `radial-gradient(circle at center, ${accent} 0%, transparent 60%)`,
          }}
          aria-hidden
        />
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
            {centerLabel}
          </p>
          <p
            className="mt-1 text-2xl font-semibold tabular-nums text-gray-700 dark:text-gray-200"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {centerValue}
          </p>
          <p className="mt-3 text-[11px] text-gray-400">
            {emptyLabel ?? "Sem dados"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height={224}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={92}
            innerRadius={68}
            paddingAngle={1.5}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatBRL(value as number)}
            contentStyle={tooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
          {centerLabel}
        </p>
        <p
          className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {centerValue}
        </p>
      </div>
    </div>
  );
}

export function CategoryPieChart({
  data,
  emptyLabel,
}: {
  data: CategorySlice[];
  emptyLabel?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-400">
        {emptyLabel ?? "Sem dados"}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={55}
          paddingAngle={2}
          label={({ name, percent }) =>
            percent && percent > 0.06
              ? `${name} ${(percent * 100).toFixed(0)}%`
              : ""
          }
        >
          {data.map((slice) => (
            <Cell key={slice.id} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatBRL(value as number)}
          contentStyle={tooltipStyle}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
