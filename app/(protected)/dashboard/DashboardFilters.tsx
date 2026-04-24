"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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

export function DashboardFilters({
  year,
  month,
  availableYears,
}: {
  year: number;
  month: number | null;
  availableYears: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(next: { year?: number; month?: number | null }) {
    const sp = new URLSearchParams(searchParams.toString());
    if (next.year !== undefined) sp.set("year", String(next.year));
    if (next.month !== undefined) {
      if (next.month === null) sp.delete("month");
      else sp.set("month", String(next.month));
    }
    startTransition(() => {
      router.push(`/dashboard?${sp.toString()}`);
    });
  }

  const yearOptions = availableYears.length ? availableYears : [year];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Ano
        </label>
        <select
          value={year}
          onChange={(e) => update({ year: Number(e.target.value) })}
          disabled={isPending}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Mês (opcional)
        </label>
        <select
          value={month ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            update({ month: v === "" ? null : Number(v) });
          }}
          disabled={isPending}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
        >
          <option value="">Ano inteiro</option>
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {month !== null && (
        <button
          type="button"
          onClick={() => update({ month: null })}
          disabled={isPending}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Limpar mês
        </button>
      )}
      {isPending && (
        <span className="pb-2 text-xs text-gray-400">atualizando…</span>
      )}
    </div>
  );
}
