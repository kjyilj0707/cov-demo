"use client";

import { useState } from "react";
import {
  BUDGET_LAST,
  BUDGET_TICKS,
  FULL_BUDGET,
  budgetIndexFor,
  budgetValueAt,
  formatManwon,
  parseWon,
  type BudgetRange,
} from "@/lib/contract-form";

const won = new Intl.NumberFormat("ko-KR");
const show = (n: number | null) => (n === null || n === 0 ? "" : won.format(n));

/**
 * 예산 범위: 손잡이 두 개짜리 슬라이더 + 최소·최대 금액 입력칸(서로 연동).
 * 화면 안에서만 쓰는 값이며 계약에는 들어가지 않는다.
 */
export function BudgetRangeField({
  value,
  onChange,
  describedBy,
}: {
  value: BudgetRange;
  onChange: (r: BudgetRange) => void;
  describedBy?: string;
}) {
  const [minText, setMinText] = useState(show(value.min));
  const [maxText, setMaxText] = useState(show(value.max));
  const lo = budgetIndexFor(value.min, "min");
  const hi = budgetIndexFor(value.max, "max");
  const pct = (i: number) => (i / BUDGET_LAST) * 100;

  function set(r: BudgetRange) {
    setMinText(show(r.min));
    setMaxText(show(r.max));
    onChange(r);
  }

  const minLabel = value.min > 0 ? `최소 ${formatManwon(value.min)}` : "최소 금액 제한 없음";
  const maxLabel = value.max !== null ? `최대 ${formatManwon(value.max)}` : "최대 금액 제한 없음";

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          금액 범위 <span className="font-normal text-ink-2">(부가세 별도)</span>
        </p>
        <button
          type="button"
          onClick={() => set(FULL_BUDGET)}
          className="inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-ink-2 hover:text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
          </svg>
          초기화
        </button>
      </div>

      <div className="mt-5 px-1">
        <div className="relative h-6" style={{ ["--range-h" as string]: "24px" }}>
          <div aria-hidden="true" className="absolute inset-x-3 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line">
            <div className="absolute inset-y-0 bg-accent" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
            {BUDGET_TICKS.map(([i]) => (
              <span
                key={i}
                className={`absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${i >= lo && i <= hi ? "bg-accent" : "bg-ink-3"}`}
                style={{ left: `${pct(i)}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            className="range-dual"
            min={0}
            max={BUDGET_LAST}
            step={1}
            value={lo}
            aria-label="예산 최소 금액"
            aria-valuetext={minLabel}
            aria-describedby={describedBy}
            // 두 손잡이가 오른쪽 끝에서 겹치면 최소 손잡이를 위로 올려 다시 잡을 수 있게 한다
            style={{ zIndex: lo >= BUDGET_LAST - 1 ? 3 : 2 }}
            onChange={(e) => {
              const i = Math.min(Number(e.target.value), hi);
              set({ min: budgetValueAt(i, "min") ?? 0, max: value.max });
            }}
          />
          <input
            type="range"
            className="range-dual"
            min={0}
            max={BUDGET_LAST}
            step={1}
            value={hi}
            aria-label="예산 최대 금액"
            aria-valuetext={maxLabel}
            aria-describedby={describedBy}
            style={{ zIndex: 2 }}
            onChange={(e) => {
              const i = Math.max(Number(e.target.value), lo);
              set({ min: value.min, max: budgetValueAt(i, "max") });
            }}
          />
        </div>
        <div aria-hidden="true" className="relative mt-2 h-4 text-[11px] text-ink-2 sm:text-[12px]">
          {BUDGET_TICKS.map(([i, label]) => (
            <span
              key={i}
              className={`absolute whitespace-nowrap ${i === 0 ? "left-0" : i === BUDGET_LAST ? "right-0" : "-translate-x-1/2"}`}
              style={i === 0 || i === BUDGET_LAST ? undefined : { left: `calc(12px + (100% - 24px) * ${i / BUDGET_LAST})` }}
            >
              {/* 좁은 화면에서는 양 끝 라벨을 줄여 겹치지 않게 한다 */}
              <span className="sm:hidden">{i === 0 ? "~10만" : i === BUDGET_LAST ? "500만~" : label}</span>
              <span className="hidden sm:inline">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-[13px] text-ink-2">최소 금액</span>
          <span className="flex items-center rounded-lg border border-line bg-card px-3 focus-within:border-ink">
            <span aria-hidden="true" className="text-ink-2">
              ₩
            </span>
            <input
              inputMode="numeric"
              value={minText}
              placeholder="하한 없음"
              onChange={(e) => {
                const n = parseWon(e.target.value);
                setMinText(n === null ? "" : won.format(n));
                onChange({ min: n ?? 0, max: value.max });
              }}
              className="min-h-11 w-full min-w-0 bg-transparent px-2 text-right text-[15px] focus:outline-none"
            />
          </span>
        </label>
        <span aria-hidden="true" className="pb-3 text-ink-2">
          ~
        </span>
        <label className="block min-w-0">
          <span className="mb-1 block text-[13px] text-ink-2">최대 금액</span>
          <span className="flex items-center rounded-lg border border-line bg-card px-3 focus-within:border-ink">
            <span aria-hidden="true" className="text-ink-2">
              ₩
            </span>
            <input
              inputMode="numeric"
              value={maxText}
              placeholder="상한 없음"
              onChange={(e) => {
                const n = parseWon(e.target.value);
                setMaxText(n === null ? "" : won.format(n));
                onChange({ min: value.min, max: n });
              }}
              className="min-h-11 w-full min-w-0 bg-transparent px-2 text-right text-[15px] focus:outline-none"
            />
          </span>
        </label>
      </div>
    </div>
  );
}
