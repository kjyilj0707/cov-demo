"use client";

// [보관] 창작자 검색 홈(src/archive/creator-search)에서만 쓰던 분야 패널. 2026-11-18 홈을 계약 현황 중심으로 바꾸며
// 화면에서 뺐고, 2단계 매칭 기능 때 다시 쓰려고 남겨 둔다. 지금은 어느 화면에도 붙어 있지 않다.

import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CreatorCard } from "@/components/CreatorCard";
import { CATEGORIES, SHEET_LIST_ALL, findCategory, searchCreators, sheetListLabel, type SheetView } from "@/lib/creators";
import type { Deal } from "@/lib/types";

/** 패널에서 보여 줄 창작자: "all"이면 분야 전체, 아니면 그 세부 분야 */
function creatorsFor(view: SheetView) {
  return searchCreators("", view.cat, view.list === SHEET_LIST_ALL ? null : view.list);
}

const rowId = (cat: string, list: string) => `cat-row-${cat}-${list}`;

/**
 * 카테고리 더보기 패널.
 * 휴대폰: 화면 전체를 덮는다. 컴퓨터(md 768px~): 가운데 큰 패널.
 * 왼쪽은 분야 세로 탭, 오른쪽은 고른 분야의 세부 분야 목록. 브랜드 탭은 두지 않는다.
 * 세부 분야 줄을 누르면 패널 안에서 그 창작자들의 프로필 요약 목록을 보여 주고,
 * 프로필을 누르면 프로필 화면으로 간다(돌아오면 ?sheet=&list=로 같은 목록을 다시 연다).
 *
 * 열 때만 그린다(부모가 {sheet && <CategorySheet/>}). 브라우저 기본 <dialog>의 showModal()을 써서
 * 뒤 화면을 조작할 수 없게(inert) 하고, Esc는 cancel 이벤트로 받아 닫는다.
 */
export function CategorySheet({
  initial,
  deals,
  baseQuery,
  onViewChange,
  onClose,
}: {
  initial: SheetView;
  /** 신뢰도 계산용(온결 스튜디오는 시연 거래 기록에서 계산) */
  deals: Deal[];
  /** 프로필에서 돌아올 때 홈 검색 상태(q·cat)도 되살리기 위한 주소 조각 */
  baseQuery: string;
  /** 탭·목록 화면이 바뀔 때(부모가 주소에 남긴다) */
  onViewChange: (view: SheetView) => void;
  /** X·Esc·바깥 누르기로 닫혔을 때 */
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setViewState] = useState<SheetView>(initial);
  /** 다음 그리기 뒤에 포커스를 줄 요소 id */
  const pendingFocus = useRef<string | null>(initial.list ? "cat-list-title" : `cat-tab-${initial.cat}`);
  const activeCat = findCategory(view.cat) ?? CATEGORIES[0];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevOverflow;
      if (d.open) d.close();
    };
  }, []);

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  }, [view]);

  function go(next: SheetView, focusId: string) {
    pendingFocus.current = focusId;
    setViewState(next);
    onViewChange(next);
  }

  function dismiss() {
    ref.current?.close();
    onClose();
  }

  function onTabKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    const i = CATEGORIES.findIndex((k) => k.id === view.cat);
    let next = -1;
    if (e.key === "ArrowDown") next = (i + 1) % CATEGORIES.length;
    else if (e.key === "ArrowUp") next = (i - 1 + CATEGORIES.length) % CATEGORIES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CATEGORIES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = CATEGORIES[next].id;
    go({ cat: id, list: null }, `cat-tab-${id}`);
  }

  const listing = view.list !== null;
  const rows: { list: string; label: string }[] = [
    { list: SHEET_LIST_ALL, label: `${activeCat.label} 전체` },
    ...activeCat.subcategories.map((s) => ({ list: s.id, label: s.label })),
  ];
  const listed = listing ? creatorsFor(view) : [];
  const back = new URLSearchParams(baseQuery);
  back.set("sheet", view.cat);
  if (view.list) back.set("list", view.list);

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
          {/* 휴대폰에서 창작자 목록을 볼 때는 왼쪽 탭을 숨겨 목록이 전체 폭을 쓴다 */}
          <div
            role="tablist"
            aria-label="분야"
            aria-orientation="vertical"
            className={`w-[7.75rem] shrink-0 overflow-y-auto bg-muted pb-[env(safe-area-inset-bottom)] md:block md:w-52 ${listing ? "hidden" : ""}`}
          >
            {CATEGORIES.map((k) => {
              const on = k.id === view.cat;
              return (
                <button
                  key={k.id}
                  id={`cat-tab-${k.id}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="cat-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => go({ cat: k.id, list: null }, `cat-tab-${k.id}`)}
                  onKeyDown={onTabKey}
                  className={`flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-[14px] leading-tight md:text-[15px] ${
                    on ? "bg-paper font-bold text-ink" : "font-medium text-ink-2 hover:text-ink"
                  }`}
                >
                  <CategoryIcon id={k.id} className={`hidden size-5 shrink-0 md:block ${on ? "text-ink" : ""}`} />
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
            {listing ? (
              <>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="세부 분야 목록으로 돌아가기"
                    onClick={() => go({ cat: view.cat, list: null }, rowId(view.cat, view.list!))}
                    className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-muted"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                  <h3 id="cat-list-title" tabIndex={-1} className="min-w-0 font-bold leading-snug focus:outline-none">
                    {sheetListLabel(view)} <span className="font-semibold text-ink-2">· {listed.length}명</span>
                  </h3>
                </div>
                {listed.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-line bg-card p-6 text-center text-sm text-ink-2">
                    아직 이 분야의 창작자가 없습니다.
                  </p>
                ) : (
                  <ul aria-labelledby="cat-list-title" className="mt-3 grid gap-3">
                    {listed.map((c) => (
                      <CreatorCard key={c.id} creator={c} deals={deals} backQuery={back.toString()} />
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-[12px] text-ink-2">
                  창작자를 누르면 프로필로 이동합니다. 창작자·수치는 모두 시연용 가상 데이터입니다.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-ink">
                    <CategoryIcon id={activeCat.id} className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold leading-snug">{activeCat.label}</h3>
                    <p className="text-[13px] text-ink-2">{activeCat.blurb}</p>
                  </div>
                </div>
                <ul className="mt-3 border-t border-line">
                  {rows.map((r) => {
                    const count = creatorsFor({ cat: activeCat.id, list: r.list }).length;
                    return (
                      <li key={r.list} className="border-b border-line">
                        {/* 줄 전체가 버튼이라 이름·사람 수 어디를 눌러도 같다 */}
                        <button
                          id={rowId(activeCat.id, r.list)}
                          type="button"
                          onClick={() => go({ cat: activeCat.id, list: r.list }, "cat-list-title")}
                          className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-[15px] font-medium text-ink hover:text-accent"
                        >
                          <span>{r.label}</span>
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
                <p className="mt-4 text-[12px] text-ink-2">세부 분야를 누르면 그 분야 창작자들의 프로필 목록을 보여 드립니다.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
