"use client";

import { useEffect, useRef } from "react";
import { REVISION_MAX, REVISION_MIN, stepRevision } from "@/lib/contract-form";

const ITEM = 44; // 한 칸 높이(px)
const VALUES = Array.from({ length: REVISION_MAX - REVISION_MIN + 1 }, (_, i) => REVISION_MIN + i);

/**
 * 수정 가능 횟수 다이얼(휠 피커). 위아래로 굴려 숫자를 고른다.
 * 터치 스크롤·마우스 휠은 브라우저 스크롤 + scroll-snap, 키보드는 spinbutton 규칙(위 = 늘리기)을 따른다.
 * 값이 비어 있으면(NaN, 직접 입력칸이 잘못된 경우) 다이얼은 마지막 위치에 둔다.
 */
export function RevisionDial({ value, onChange, labelledBy }: { value: number; onChange: (n: number) => void; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const valid = Number.isInteger(value);

  // 바깥에서 값이 바뀌면(직접 입력·키보드) 그 칸으로 굴린다
  useEffect(() => {
    const el = ref.current;
    if (!el || !valid) return;
    if (Math.round(el.scrollTop / ITEM) !== value - REVISION_MIN) el.scrollTo({ top: (value - REVISION_MIN) * ITEM, behavior: "smooth" });
  }, [value, valid]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onScroll() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const n = Math.max(REVISION_MIN, Math.min(REVISION_MAX, Math.round(el.scrollTop / ITEM) + REVISION_MIN));
      if (n !== value) onChange(n);
    }, 90);
  }

  function onKey(e: React.KeyboardEvent) {
    let n: number | null = null;
    if (e.key === "ArrowUp") n = stepRevision(value, 1);
    else if (e.key === "ArrowDown") n = stepRevision(value, -1);
    else if (e.key === "PageUp") n = stepRevision(value, 3);
    else if (e.key === "PageDown") n = stepRevision(value, -3);
    else if (e.key === "Home") n = REVISION_MIN;
    else if (e.key === "End") n = REVISION_MAX;
    if (n === null) return;
    e.preventDefault();
    onChange(n);
  }

  return (
    <div className="relative w-28 shrink-0 select-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-md border-y-2 border-ink bg-muted" />
      <div
        ref={ref}
        role="spinbutton"
        tabIndex={0}
        aria-labelledby={labelledBy}
        aria-valuemin={REVISION_MIN}
        aria-valuemax={REVISION_MAX}
        aria-valuenow={valid ? value : undefined}
        aria-valuetext={valid ? `${value}회` : "정해지지 않음"}
        onScroll={onScroll}
        onKeyDown={onKey}
        className="relative h-[132px] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-lg border border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBlock: ITEM }}
      >
        {VALUES.map((n) => {
          const on = valid && n === value;
          return (
            <div
              key={n}
              aria-hidden="true"
              onClick={() => onChange(n)}
              className={`flex h-11 cursor-pointer snap-center items-center justify-center tabular-nums ${
                on ? "text-xl font-extrabold text-ink" : "text-base text-ink-2"
              }`}
            >
              {n}회
            </div>
          );
        })}
      </div>
      <p className="sr-only">위아래 화살표로 바꿀 수 있습니다.</p>
    </div>
  );
}
