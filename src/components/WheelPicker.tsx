"use client";

import { useEffect, useRef, useState } from "react";

const ITEM = 44; // 한 칸 높이(px)

/**
 * 휠 피커(위아래로 굴려 고르는 다이얼). 수정 가능 횟수·작업 유형에 함께 쓴다.
 * - 터치 스크롤·마우스 휠: 브라우저 스크롤 + scroll-snap(관성 스크롤은 브라우저 기본 동작 그대로)
 * - 가운데 강조 띠, 가운데에서 멀어질수록 글자를 흐리고 작게 그린다(스크롤 위치를 따라 매 프레임 갱신)
 * - 키보드: mode="spinbutton"은 위 = 늘리기(숫자), mode="listbox"는 위 = 앞 항목(글자 목록)
 * index가 -1이면(값이 비었거나 잘못된 경우) 다이얼은 마지막 위치에 그대로 둔다.
 */
export function WheelPicker({
  options,
  index,
  onChange,
  mode,
  labelledBy,
  valueText,
  rows = 5,
  className = "w-28",
  idPrefix,
}: {
  options: string[];
  index: number;
  onChange: (i: number) => void;
  mode: "spinbutton" | "listbox";
  labelledBy?: string;
  /** spinbutton에서 화면 낭독기가 읽을 값 */
  valueText?: (i: number) => string;
  /** 보이는 줄 수(홀수) */
  rows?: number;
  className?: string;
  /** listbox 항목 id 앞부분(한 화면에 여러 개일 때 겹치지 않게) */
  idPrefix: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState(index >= 0 ? index : 0); // 스크롤 위치(칸 단위, 소수)
  const valid = index >= 0 && index < options.length;
  const pad = ((rows - 1) / 2) * ITEM;
  const last = options.length - 1;

  // 바깥에서 값이 바뀌면(직접 입력·키보드·클릭) 그 칸으로 굴린다
  useEffect(() => {
    const el = ref.current;
    if (!el || !valid) return;
    if (Math.round(el.scrollTop / ITEM) !== index) el.scrollTo({ top: index * ITEM, behavior: "smooth" });
  }, [index, valid]);

  // 처음 그릴 때는 애니메이션 없이 제자리에
  useEffect(() => {
    const el = ref.current;
    if (el && valid) el.scrollTop = index * ITEM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function onScroll() {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (ref.current) setPos(ref.current.scrollTop / ITEM);
    });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const n = Math.max(0, Math.min(last, Math.round(el.scrollTop / ITEM)));
      if (n !== index) onChange(n);
    }, 110);
  }

  function onKey(e: React.KeyboardEvent) {
    const cur = valid ? index : 0;
    const dir = mode === "spinbutton" ? 1 : -1; // 위 화살표가 움직이는 방향
    let n: number | null = null;
    if (e.key === "ArrowUp") n = cur + dir;
    else if (e.key === "ArrowDown") n = cur - dir;
    else if (e.key === "PageUp") n = cur + dir * 3;
    else if (e.key === "PageDown") n = cur - dir * 3;
    else if (e.key === "Home") n = mode === "spinbutton" ? last : 0;
    else if (e.key === "End") n = mode === "spinbutton" ? 0 : last;
    if (n === null) return;
    e.preventDefault();
    onChange(Math.max(0, Math.min(last, n)));
  }

  const a11y =
    mode === "spinbutton"
      ? {
          role: "spinbutton",
          "aria-valuemin": 0,
          "aria-valuemax": last,
          "aria-valuenow": valid ? index : undefined,
          "aria-valuetext": valid ? (valueText?.(index) ?? options[index]) : "정해지지 않음",
        }
      : { role: "listbox", "aria-activedescendant": valid ? `${idPrefix}-${index}` : undefined };

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      {/* 가운데 강조 띠 */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-1/2 h-11 -translate-y-1/2 rounded-md bg-muted" />
      <div
        ref={ref}
        tabIndex={0}
        aria-labelledby={labelledBy}
        {...a11y}
        onScroll={onScroll}
        onKeyDown={onKey}
        className="relative snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-lg border border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          height: rows * ITEM,
          paddingBlock: pad,
          // 위아래 끝으로 갈수록 흐려지게
          maskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
        }}
      >
        {options.map((label, i) => {
          const d = Math.min(2.5, Math.abs(i - pos));
          const on = valid && i === index;
          return (
            <div
              key={label}
              id={`${idPrefix}-${i}`}
              role={mode === "listbox" ? "option" : undefined}
              aria-selected={mode === "listbox" ? on : undefined}
              aria-hidden={mode === "spinbutton" ? true : undefined}
              onClick={() => onChange(i)}
              className={`flex h-11 cursor-pointer snap-center items-center justify-center whitespace-nowrap px-2 tabular-nums transition-[color] ${
                d < 0.5 ? "font-extrabold text-ink" : "font-medium text-ink-2"
              }`}
              style={{ opacity: Math.max(0.35, 1 - d * 0.3), transform: `scale(${1 - d * 0.07})`, fontSize: d < 0.5 ? 18 : 16 }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
