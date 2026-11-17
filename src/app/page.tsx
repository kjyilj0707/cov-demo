"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CategorySheet } from "@/components/CategorySheet";
import { CreatorCard } from "@/components/CreatorCard";
import { TERMINAL } from "@/lib/deal-machine";
import { CATEGORIES, POPULAR_KEYWORDS, findCategory, findSubcategory, searchCreators } from "@/lib/creators";
import { ME_CLIENT, ME_WORKER } from "@/lib/personas";
import { useDemo } from "@/lib/store";
import { dealsFor } from "@/lib/stats";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-2">불러오는 중…</p>}>
      <HomeView />
    </Suspense>
  );
}

function HomeView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const demo = useDemo();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState<string | null>(params.get("cat"));
  // 세부 분야는 고른 분야 안의 것만 받는다(주소를 손으로 고친 경우 대비)
  const [sub, setSub] = useState<string | null>(() => (findSubcategory(params.get("cat"), params.get("sub")) ? params.get("sub") : null));
  const [sheetOpen, setSheetOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const wantFocus = params.get("focus") === "search";
  const ready = demo !== null;

  // 컴퓨터 헤더의 검색 버튼으로 다른 화면에서 왔을 때(?focus=search) 검색창에 포커스하고 주소에서 표시를 지운다.
  useEffect(() => {
    if (!wantFocus || !ready) return;
    const q = document.getElementById("q");
    q?.focus();
    q?.scrollIntoView({ block: "center" });
    router.replace(pathname, { scroll: false });
  }, [wantFocus, ready, router, pathname]);

  if (!demo) return null;

  // 주소에 검색 상태를 남겨, 프로필에서 돌아왔을 때 결과가 그대로 보이게 한다.
  function syncUrl(q: string, c: string | null, s: string | null = sub) {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (c) sp.set("cat", c);
    if (c && s) sp.set("sub", s);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const results = searchCreators(query, cat, sub);
  const catLabel = findCategory(cat)?.label;
  const subLabel = findSubcategory(cat, sub)?.label;
  const catText = catLabel && (subLabel ? `${catLabel} › ${subLabel}` : catLabel);
  const searching = Boolean(query.trim() || cat);
  const backQs = new URLSearchParams();
  if (query.trim()) backQs.set("q", query.trim());
  if (cat) backQs.set("cat", cat);
  if (cat && sub) backQs.set("sub", sub);

  /** 패널에서 분야·세부 분야를 고르면: 검색어는 비우고 그 분야로 결과를 보여 준 뒤 결과 제목으로 포커스 */
  function pickFromSheet(c: string, s: string | null) {
    setSheetOpen(false);
    setQuery("");
    setCat(c);
    setSub(s);
    syncUrl("", c, s);
    const r = document.getElementById("results");
    r?.focus();
    r?.scrollIntoView({ block: "center" });
  }

  const { role } = demo;
  const myId = role === "worker" ? ME_WORKER.id : role === "client" ? ME_CLIENT.id : null;
  const activeCount = dealsFor(demo.deals, role, myId).filter((d) => !TERMINAL.includes(d.status)).length;

  return (
    <div className="space-y-6 lg:space-y-10">
      <section aria-labelledby="hero-title" className="pt-2 lg:pb-2 lg:pt-6">
        <p className="text-[13px] font-semibold text-accent lg:text-base">창작자 전용 안전거래 플랫폼</p>
        <h1 id="hero-title" className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl lg:mt-2 lg:text-5xl">
          다양한 창작자들을
          <br className="lg:hidden" /> 누려보세요
        </h1>
        <p className="mt-2 text-sm text-ink-2 lg:mt-3 lg:text-base">
          음악·디자인 창작자를 찾고, 조건을 정해 계약하고, 납품·검수·정산까지 한 곳에서 이어 갑니다.
        </p>

        <form
          role="search"
          aria-label="창작자 검색"
          className="relative mt-5 lg:mt-8 lg:max-w-3xl"
          onSubmit={(e) => {
            e.preventDefault();
            syncUrl(query, cat);
            document.getElementById("results")?.focus();
          }}
        >
          <label htmlFor="q" className="sr-only">
            찾는 작업이나 창작자
          </label>
          <input
            id="q"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="믹싱, 포스터, 뮤직비디오…"
            className="min-h-14 w-full rounded-full border border-line bg-card pl-5 pr-14 text-base lg:min-h-16 lg:pl-7 lg:pr-16 lg:text-lg text-ink shadow-sm placeholder:text-ink-3 focus:border-accent focus:outline-none focus-visible:outline-3 focus-visible:outline-accent"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute right-1.5 top-1/2 inline-flex size-11 -translate-y-1/2 lg:right-2 lg:size-12 items-center justify-center rounded-full bg-ink text-on-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
            </svg>
          </button>
        </form>

        <div className="mt-3 lg:mt-4">
          <h2 className="sr-only">많이 찾는 키워드</h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
            {POPULAR_KEYWORDS.map((k) => {
              const on = query.trim() === k;
              return (
                <li key={k} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? "" : k;
                      setQuery(next);
                      syncUrl(next, cat);
                    }}
                    className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                      on ? "bg-ink text-on-ink" : "bg-muted text-ink-2 hover:text-ink"
                    }`}
                  >
                    {k}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cat-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="cat-title" className="text-base font-bold lg:text-xl">
            분야로 찾기
          </h2>
          <div className="flex items-center gap-3">
            {cat && (
              <button
                type="button"
                className="min-h-11 text-[13px] font-semibold text-accent underline"
                onClick={() => {
                  setCat(null);
                  setSub(null);
                  syncUrl(query, null, null);
                }}
              >
                분야 선택 해제
              </button>
            )}
            <button
              ref={moreRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-label="분야 더보기"
              onClick={() => setSheetOpen(true)}
              className="inline-flex min-h-11 items-center gap-0.5 text-[13px] font-semibold text-ink-2 hover:text-ink lg:text-sm"
            >
              더보기
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
        <ul className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-9 sm:px-0 lg:mt-4 lg:gap-3">
          {CATEGORIES.map((k) => {
            const on = cat === k.id;
            return (
              <li key={k.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  title={k.blurb}
                  onClick={() => {
                    const next = on ? null : k.id;
                    setCat(next);
                    setSub(null);
                    syncUrl(query, next, null);
                  }}
                  className="group flex w-[4.75rem] flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center sm:w-full lg:gap-2.5 lg:rounded-2xl lg:border lg:border-line lg:py-5 lg:hover:border-accent"
                >
                  <span
                    className={`inline-flex size-14 items-center justify-center rounded-2xl lg:size-16 ${
                      on ? "bg-accent text-on-accent" : "bg-accent-soft text-accent group-hover:bg-accent group-hover:text-on-accent"
                    }`}
                  >
                    <CategoryIcon id={k.id} className="size-7" />
                  </span>
                  <span className={`text-[12px] leading-tight lg:text-sm ${on ? "font-bold text-ink" : "font-medium text-ink-2"}`}>{k.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {sheetOpen && (
          <CategorySheet
            selectedCat={cat}
            selectedSub={sub}
            onClose={() => {
              setSheetOpen(false);
              moreRef.current?.focus();
            }}
            onPick={pickFromSheet}
          />
        )}
      </section>

      <section aria-labelledby="results-title">
        <h2 id="results-title" className="text-base font-bold lg:text-xl">
          <span id="results" tabIndex={-1} className="focus:outline-none">
            {searching ? "검색 결과" : "추천 창작자"}
          </span>
        </h2>
        <p role="status" aria-live="polite" className="mt-0.5 text-[13px] text-ink-2">
          {searching
            ? `${[query.trim() && `“${query.trim()}”`, catText].filter(Boolean).join(" · ")} — ${results.length}명`
            : `가상 창작자 ${results.length}명`}
        </p>

        {results.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-line bg-card p-6 text-center text-sm text-ink-2">
            <p>맞는 창작자가 없습니다. 다른 낱말로 찾거나 분야 선택을 풀어 보세요.</p>
            <button
              type="button"
              className="mt-3 font-semibold text-accent underline"
              onClick={() => {
                setQuery("");
                setCat(null);
                setSub(null);
                syncUrl("", null, null);
              }}
            >
              검색 조건 지우기
            </button>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:mt-4 lg:grid-cols-3 lg:gap-4">
            {results.map((c) => (
              <CreatorCard key={c.id} creator={c} deals={demo.deals} backQuery={backQs.toString()} />
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/deals/"
        className="flex items-center justify-between rounded-2xl border border-line bg-card p-4 hover:border-accent lg:max-w-sm"
      >
        <span>
          <span className="block text-[13px] text-ink-2">{role === "operator" ? "전체 거래" : "나의 거래"}</span>
          <span className="block font-bold">진행 중 {activeCount}건</span>
        </span>
        <span aria-hidden="true" className="text-ink-2">
          →
        </span>
      </Link>

      <p className="text-center text-[12px] text-ink-2">검색 결과의 창작자·수치는 모두 시연용 가상 데이터입니다.</p>
    </div>
  );
}
