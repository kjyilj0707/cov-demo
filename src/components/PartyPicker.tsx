"use client";

import { useId, useRef, useState } from "react";
import { searchCounterparts, type CounterHit } from "@/lib/contract-form";
import type { Party } from "@/lib/types";

/**
 * 계약 상대 검색(콤보박스). 이름을 입력하면 이 서비스(시연 데이터)에 있는 상대를 찾아 목록으로 보여 준다.
 * 위아래 화살표로 이동, Enter로 선택, Esc로 닫기. 고른 상대는 카드로 보여 주고 "변경"으로 다시 찾는다.
 */
export function PartyPicker({
  id,
  role,
  label,
  selected,
  selectedSub,
  onSelect,
  describedBy,
}: {
  id: string;
  role: "worker" | "client";
  label: string;
  selected: Party | null;
  selectedSub?: string;
  onSelect: (p: Party | null) => void;
  describedBy?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const hits = searchCounterparts(role, query);
  const showList = open && query.trim().length > 0;
  const optId = (i: number) => `${listId}-opt-${i}`;

  function choose(h: CounterHit) {
    if (h.paused) return;
    onSelect(h.party);
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => changeRef.current?.focus());
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-ink bg-card p-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-extrabold text-accent">
            {selected.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{selected.name}</p>
            {selectedSub && <p className="truncate text-[13px] text-ink-2">{selectedSub}</p>}
          </div>
        </div>
        <button
          ref={changeRef}
          id={id}
          type="button"
          onClick={() => {
            onSelect(null);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-line px-3 text-[13px] font-semibold text-ink hover:border-ink"
        >
          변경<span className="sr-only">: {label} 다시 찾기</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center rounded-lg border border-line bg-card px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-ink-2" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
        </svg>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits.length ? optId(active) : undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          value={query}
          placeholder={`${label} 이름으로 찾기`}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={(e) => {
            setOpen(true);
            // 휴대폰에서 결과 목록이 아래 고정 바에 가리지 않게 입력칸을 화면 가운데쯤으로 올린다
            const el = e.currentTarget;
            window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              if (hits.length) setActive((a) => (a + 1) % hits.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (hits.length) setActive((a) => (a - 1 + hits.length) % hits.length);
            } else if (e.key === "Enter") {
              if (showList && hits[active]) {
                e.preventDefault();
                choose(hits[active]);
              }
            } else if (e.key === "Escape") {
              if (showList) {
                e.preventDefault();
                setOpen(false);
              } else setQuery("");
            }
          }}
          className="field-bare min-h-12 w-full min-w-0 bg-transparent px-2 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
        />
      </div>

      {/* 목록은 항상 그려 두고(aria-controls 대상) 펼칠 때만 보인다 */}
      <ul
        id={listId}
        role="listbox"
        aria-label={`${label} 검색 결과`}
        hidden={!showList || hits.length === 0}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-card py-1 shadow-lg"
      >
        {hits.map((h, i) => (
          <li
            key={h.party.id}
            id={optId(i)}
            role="option"
            aria-selected={i === active}
            aria-disabled={h.paused || undefined}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(h)}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 ${i === active ? "bg-muted" : ""} ${
              h.paused ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <span className="min-w-0">
              <span className={`block truncate font-semibold ${h.paused ? "text-ink-2" : "text-ink"}`}>{h.party.name}</span>
              <span className="block truncate text-[12px] text-ink-2">{h.sub}</span>
            </span>
            {h.paused && <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-ink-2">공연 계약 준비 중</span>}
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className={showList && hits.length === 0 ? "mt-1 rounded-lg border border-line bg-card p-3 text-sm text-ink-2" : "sr-only"}>
        {showList ? (hits.length === 0 ? `"${query.trim()}"을(를) 이 서비스에서 찾을 수 없습니다.` : `검색 결과 ${hits.length}명`) : ""}
      </p>
    </div>
  );
}
