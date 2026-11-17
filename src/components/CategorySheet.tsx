"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES, searchCreators } from "@/lib/creators";

/**
 * 카테고리 더보기 패널(2026-11-17 팀 회의, KREAM 방식).
 * 휴대폰: 화면 전체를 덮는다. 컴퓨터(md 768px~): 가운데 큰 패널.
 * 왼쪽은 분야 세로 탭, 오른쪽은 고른 분야의 세부 분야 목록. 브랜드 탭은 두지 않는다.
 *
 * 열 때만 그린다(부모가 {open && <CategorySheet/>}). 브라우저 기본 <dialog>의 showModal()을 써서
 * 뒤 화면을 조작할 수 없게(inert) 하고, Esc는 cancel 이벤트로 받아 닫는다.
 * 닫을 때는 dialog를 먼저 닫은 뒤 부모 콜백을 불러, 부모가 포커스를 옮길 수 있게 한다.
 */
export function CategorySheet({
  selectedCat,
  selectedSub,
  onClose,
  onPick,
}: {
  selectedCat: string | null;
  selectedSub: string | null;
  /** X·Esc·바깥 누르기로 닫혔을 때 */
  onClose: () => void;
  /** 세부 분야(또는 분야 전체 = sub null)를 골랐을 때 */
  onPick: (catId: string, subId: string | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(selectedCat ?? CATEGORIES[0].id);
  const activeCat = CATEGORIES.find((k) => k.id === active) ?? CATEGORIES[0];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    document.getElementById(`cat-tab-${active}`)?.focus();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevOverflow;
      if (d.open) d.close();
    };
    // 처음 열 때 한 번만: 고른 분야 탭에 포커스
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    ref.current?.close();
    onClose();
  }

  function pick(catId: string, subId: string | null) {
    ref.current?.close();
    onPick(catId, subId);
  }

  function onTabKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    const i = CATEGORIES.findIndex((k) => k.id === active);
    let next = -1;
    if (e.key === "ArrowDown") next = (i + 1) % CATEGORIES.length;
    else if (e.key === "ArrowUp") next = (i - 1 + CATEGORIES.length) % CATEGORIES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CATEGORIES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = CATEGORIES[next].id;
    setActive(id);
    document.getElementById(`cat-tab-${id}`)?.focus();
  }

  const items: { subId: string | null; label: string }[] = [
    { subId: null, label: `${activeCat.label} 전체` },
    ...activeCat.subcategories.map((s) => ({ subId: s.id, label: s.label })),
  ];

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby="cat-sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        // 패널 바깥(배경)을 누르면 닫는다. 패널 안쪽은 아래 div가 꽉 채워 여기로 오지 않는다.
        if (e.target === e.currentTarget) dismiss();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-paper p-0 text-ink backdrop:bg-ink/50 md:m-auto md:h-[min(40rem,85dvh)] md:w-[min(52rem,calc(100%-4rem))] md:rounded-2xl md:border md:border-line md:shadow-xl"
    >
      <div className="flex h-full flex-col">
        <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-line px-14">
          <button
            type="button"
            aria-label="닫기"
            onClick={dismiss}
            className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink hover:bg-muted md:left-auto md:right-2"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <h2 id="cat-sheet-title" className="text-base font-bold lg:text-lg">
            카테고리
          </h2>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            role="tablist"
            aria-label="분야"
            aria-orientation="vertical"
            className="w-[7.75rem] shrink-0 overflow-y-auto bg-muted pb-[env(safe-area-inset-bottom)] md:w-52"
          >
            {CATEGORIES.map((k) => {
              const on = k.id === active;
              return (
                <button
                  key={k.id}
                  id={`cat-tab-${k.id}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="cat-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(k.id)}
                  onKeyDown={onTabKey}
                  className={`flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-[14px] leading-tight md:text-[15px] ${
                    on ? "bg-paper font-bold text-ink" : "font-medium text-ink-2 hover:text-ink"
                  }`}
                >
                  <CategoryIcon id={k.id} className={`hidden size-5 shrink-0 md:block ${on ? "text-accent" : ""}`} />
                  {k.label}
                </button>
              );
            })}
          </div>

          <div
            id="cat-panel"
            role="tabpanel"
            aria-labelledby={`cat-tab-${activeCat.id}`}
            className="min-w-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-5"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <CategoryIcon id={activeCat.id} className="size-6" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold leading-snug">{activeCat.label}</h3>
                <p className="text-[13px] text-ink-2">{activeCat.blurb}</p>
              </div>
            </div>
            <ul className="mt-3 border-t border-line">
              {items.map((it) => {
                const current = selectedCat === activeCat.id && (selectedSub ?? null) === it.subId;
                const count = searchCreators("", activeCat.id, it.subId).length;
                return (
                  <li key={it.subId ?? "all"} className="border-b border-line">
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => pick(activeCat.id, it.subId)}
                      className={`flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-[15px] hover:text-accent ${
                        current ? "font-bold text-accent" : "font-medium text-ink"
                      }`}
                    >
                      <span>
                        {it.label}
                        {current && <span className="sr-only"> (지금 보는 분야)</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-normal text-ink-2">
                        {count}명
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[12px] text-ink-2">세부 분야를 누르면 그 분야의 창작자를 보여 드립니다.</p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
