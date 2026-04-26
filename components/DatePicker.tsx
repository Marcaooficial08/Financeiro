"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { todayLocalISO } from "@/lib/date";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
};

const MONTHS_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS_BR = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const pad = (n: number) => String(n).padStart(2, "0");

function isoToParts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

export default function DatePicker({
  value,
  onChange,
  id,
  disabled,
  className,
  placeholder = "Selecionar data",
  minYear,
  maxYear,
}: Props) {
  const todayIso = todayLocalISO();
  const today = isoToParts(todayIso)!;
  const initial = isoToParts(value) ?? today;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parts = isoToParts(value);
    if (parts) {
      setViewYear(parts.y);
      setViewMonth(parts.m);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = isoToParts(value);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDow = firstOfMonth.getDay();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const out: { y: number; m: number; d: number; current: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const pm = viewMonth === 0 ? 11 : viewMonth - 1;
      const py = viewMonth === 0 ? viewYear - 1 : viewYear;
      out.push({ y: py, m: pm, d: day, current: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      out.push({ y: viewYear, m: viewMonth, d: day, current: true });
    }
    while (out.length < 42) {
      const last = out[out.length - 1];
      const next = new Date(last.y, last.m, last.d + 1);
      out.push({
        y: next.getFullYear(),
        m: next.getMonth(),
        d: next.getDate(),
        current: next.getMonth() === viewMonth,
      });
    }
    return out;
  }, [viewYear, viewMonth]);

  const label = selected
    ? `${pad(selected.d)}/${pad(selected.m + 1)}/${selected.y}`
    : placeholder;

  const yearFloor = minYear ?? today.y - 15;
  const yearCeil = maxYear ?? today.y + 5;
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = yearFloor; y <= yearCeil; y++) arr.push(y);
    return arr;
  }, [yearFloor, yearCeil]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const pick = (y: number, m: number, d: number) => {
    onChange(`${y}-${pad(m + 1)}-${pad(d)}`);
    setOpen(false);
  };

  const pickToday = () => {
    const parts = isoToParts(todayIso)!;
    setViewYear(parts.y);
    setViewMonth(parts.m);
    onChange(todayIso);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
      >
        <span
          className={
            selected
              ? "tabular-nums"
              : "text-gray-400 dark:text-gray-600"
          }
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {label}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400"
          aria-hidden
        >
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Selecionar data"
          className="absolute left-0 z-30 mt-2 w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              aria-label="Mês anterior"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-900 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                aria-label="Mês"
              >
                {MONTHS_BR.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium tabular-nums text-gray-900 outline-none transition focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                aria-label="Ano"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              aria-label="Próximo mês"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {WEEKDAYS_BR.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-1">
            {cells.map((c, i) => {
              const isSelected =
                !!selected &&
                c.y === selected.y &&
                c.m === selected.m &&
                c.d === selected.d;
              const isToday =
                c.y === today.y && c.m === today.m && c.d === today.d;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(c.y, c.m, c.d)}
                  aria-pressed={isSelected}
                  className={`flex h-9 items-center justify-center rounded-lg text-xs transition ${
                    isSelected
                      ? "bg-gray-900 font-semibold text-white dark:bg-white dark:text-gray-900"
                      : c.current
                        ? "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                        : "text-gray-400 hover:bg-gray-50 dark:text-gray-600 dark:hover:bg-gray-900"
                  } ${
                    isToday && !isSelected
                      ? "ring-1 ring-indigo-400 dark:ring-indigo-500"
                      : ""
                  }`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {c.d}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 px-1 pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={pickToday}
              className="text-xs font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
