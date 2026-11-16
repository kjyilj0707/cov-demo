"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CreatorCard } from "@/components/CreatorCard";
import { TERMINAL } from "@/lib/deal-machine";
import { CATEGORIES, POPULAR_KEYWORDS, searchCreators } from "@/lib/creators";
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
  if (!demo) return null;

  // 주소에 검색 상태를 남겨, 프로필에서 돌아왔을 때 결과가 그대로 보이게 한다.
  function syncUrl(q: string, c: string | null) {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (c) sp.set("cat", c);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const results = searchCreators(query, cat);
  const catLabel = CATEGORIES.find((k) => k.id === cat)?.label;
  const searching = Boolean(query.trim() || cat);
  const backQs = new URLSearchParams();
  if (query.trim()) backQs.set("q", query.trim());
  if (cat) backQs.set("cat", cat);

  const { role } = demo;
  const myId = role === "worker" ? ME_WORKER.id : role === "client" ? ME_CLIENT.id : null;
  const activeCount = dealsFor(demo.deals, role, myId).filter((d) => !TERMINAL.includes(d.status)).length;

  return (
    <div className="space-y-6">
      <section aria-labelledby="hero-title" className="pt-2">
        <p className="text-[13px] font-semibold text-accent">창작자 전용 안전거래 플랫폼</p>
        <h1 id="hero-title" className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl">
          어떤 창작자가
          <br />
          필요하세요?
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          음악·디자인 창작자를 찾고, 조건을 정해 계약하고, 납품·검수·정산까지 한 곳에서 이어 갑니다.
        </p>

        <form
          role="search"
          aria-label="창작자 검색"
          className="relative mt-5"
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
            className="min-h-14 w-full rounded-full border border-line bg-card pl-5 pr-14 text-base text-ink shadow-sm placeholder:text-ink-3 focus:border-accent focus:outline-none focus-visible:outline-3 focus-visible:outline-accent"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute right-1.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-on-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
            </svg>
          </button>
        </form>

        <div className="mt-3">
          <h2 className="sr-only">많이 찾는 키워드</h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
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
        <div className="flex items-baseline justify-between">
          <h2 id="cat-title" className="text-base font-bold">
            분야로 찾기
          </h2>
          {cat && (
            <button
              type="button"
              className="text-[13px] font-semibold text-accent underline"
              onClick={() => {
                setCat(null);
                syncUrl(query, null);
              }}
            >
              분야 선택 해제
            </button>
          )}
        </div>
        <ul className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-8 sm:px-0">
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
                    syncUrl(query, next);
                  }}
                  className="group flex w-[4.75rem] flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center sm:w-full"
                >
                  <span
                    className={`inline-flex size-14 items-center justify-center rounded-2xl ${
                      on ? "bg-accent text-on-accent" : "bg-accent-soft text-accent group-hover:bg-accent group-hover:text-on-accent"
                    }`}
                  >
                    <CategoryIcon id={k.id} className="size-7" />
                  </span>
                  <span className={`text-[12px] leading-tight ${on ? "font-bold text-ink" : "font-medium text-ink-2"}`}>{k.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="results-title">
        <h2 id="results-title" className="text-base font-bold">
          <span id="results" tabIndex={-1} className="focus:outline-none">
            {searching ? "검색 결과" : "추천 창작자"}
          </span>
        </h2>
        <p role="status" aria-live="polite" className="mt-0.5 text-[13px] text-ink-2">
          {searching
            ? `${[query.trim() && `“${query.trim()}”`, catLabel].filter(Boolean).join(" · ")} — ${results.length}명`
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
                syncUrl("", null);
              }}
            >
              검색 조건 지우기
            </button>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {results.map((c) => (
              <CreatorCard key={c.id} creator={c} deals={demo.deals} backQuery={backQs.toString()} />
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/deals/"
        className="flex items-center justify-between rounded-2xl border border-line bg-card p-4 hover:border-accent"
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
