"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DealCard, StatusBadge } from "@/components/bits";
import { statusLabel } from "@/lib/deal-machine";
import { formatDate, formatWon } from "@/lib/format";
import {
  DEADLINE_SOON_DAYS,
  ISSUE_LABEL,
  MY_TABS,
  STATUS_FILTERS,
  buyDeals,
  collectIssues,
  countByFilter,
  filterDeals,
  involvedDeals,
  menuFor,
  opsDeals,
  parseFilter,
  parseTab,
  parseView,
  personaFor,
  sellDeals,
  sortDeals,
  type ActivityView,
  type MyTab,
  type SortKey,
  type StatusFilter,
} from "@/lib/my-deals";
import { ROLE_PERSONA } from "@/lib/personas";
import { demoNow, setRole, useDemo, type DemoState } from "@/lib/store";
import { summarize } from "@/lib/stats";
import type { Deal, Role } from "@/lib/types";

/*
 * 나의 거래: 제목 + [활동 | 이슈 | 계정] 탭(주소 ?tab=), 활동 탭은 왼쪽 메뉴(?view=) + 오른쪽 섹션.
 * 섹션은 제목·거래 검색(?q=)·상태 필터 알약(?status=)·거래 목록 순서.
 * 흰 바탕 흑백 위주, 파랑(accent)은 검색·새 계약 같은 주요 버튼에만 쓴다. 모서리는 rounded-lg 이하(알약 제외).
 */

const ROLES: Role[] = ["worker", "client", "operator"];
const btnMain =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-[15px] font-bold text-on-accent";
const btnLine =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-ink bg-card px-4 py-2.5 text-[15px] font-bold text-ink";

export default function MyDealsPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-2">불러오는 중…</p>}>
      <MyDealsView />
    </Suspense>
  );
}

function MyDealsView() {
  const demo = useDemo();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  if (!demo) return null;
  const { role } = demo;
  const tab = parseTab(params.get("tab"));
  const view = parseView(params.get("view"), role);

  /** 주소의 일부 값만 바꾼다(null이면 지움) */
  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="text-[28px] font-extrabold leading-none tracking-tight lg:text-[40px]">나의 거래</h1>
        <ViewerSwitch role={role} onChange={() => update({ view: null, status: null, q: null })} />
      </div>

      <Tabs tab={tab} onChange={(t) => update({ tab: t === "activity" ? null : t })} />

      <div id={`my-panel-${tab}`} role="tabpanel" aria-labelledby={`my-tab-${tab}`} className="pt-5 md:pt-7">
        {tab === "activity" && (
          <Activity
            key={`${role}-${view}`}
            demo={demo}
            view={view}
            filter={parseFilter(params.get("status"))}
            query={params.get("q") ?? ""}
            onView={(v) => update({ view: v === "summary" ? null : v, status: null, q: null })}
            onFilter={(f) => update({ status: f === "all" ? null : f })}
            onQuery={(q) => update({ q: q.trim() || null })}
            onTab={(t) => update({ tab: t === "activity" ? null : t })}
          />
        )}
        {tab === "issues" && <Issues demo={demo} />}
        {tab === "account" && <Account role={role} />}
      </div>
    </div>
  );
}

/** 보는 사람(시연 역할) 전환. 헤더의 역할 버튼과 같은 저장소 값을 쓴다. */
function ViewerSwitch({ role, onChange }: { role: Role; onChange: () => void }) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-ink-2">보는 사람</span>
      <select
        value={role}
        onChange={(e) => {
          setRole(e.target.value as Role);
          // 역할마다 활동 메뉴가 달라서 메뉴·필터·검색어는 처음으로 돌린다
          onChange();
        }}
        className="min-h-11 min-w-0 rounded-lg border border-line bg-card py-2 pl-3 pr-8 text-sm font-semibold text-ink"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_PERSONA[r].name} · {ROLE_PERSONA[r].title}
          </option>
        ))}
      </select>
    </label>
  );
}

function Tabs({ tab, onChange }: { tab: MyTab; onChange: (t: MyTab) => void }) {
  function onKey(e: React.KeyboardEvent) {
    const i = MY_TABS.findIndex((t) => t.id === tab);
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % MY_TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + MY_TABS.length) % MY_TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = MY_TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onChange(MY_TABS[n].id);
    document.getElementById(`my-tab-${MY_TABS[n].id}`)?.focus();
  }
  return (
    <div role="tablist" aria-label="나의 거래 구분" className="mt-5 flex border-b border-line lg:mt-7">
      {MY_TABS.map((t) => {
        const on = t.id === tab;
        return (
          <button
            key={t.id}
            id={`my-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`my-panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={onKey}
            className={`-mb-px min-h-11 flex-1 border-b-2 px-4 pb-2.5 pt-2 text-[15px] md:flex-none md:px-6 lg:text-base ${
              on ? "border-ink font-bold text-ink" : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── 활동 ───────────── */

function Activity({
  demo,
  view,
  filter,
  query,
  onView,
  onFilter,
  onQuery,
  onTab,
}: {
  demo: DemoState;
  view: ActivityView;
  filter: StatusFilter;
  query: string;
  onView: (v: ActivityView) => void;
  onFilter: (f: StatusFilter) => void;
  onQuery: (q: string) => void;
  onTab: (t: MyTab) => void;
}) {
  const { role, deals } = demo;
  const now = demoNow(demo);
  const persona = personaFor(role);
  const menu = menuFor(role);

  return (
    <div className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
      <nav aria-label="활동 메뉴">
        {/* 휴대폰: 가로 알약 / md~: 세로 메뉴(고른 항목은 회색 바탕 + 밑줄) */}
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0">
          {menu.map((m) => {
            const on = m.id === view;
            return (
              <li key={m.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => onView(m.id)}
                  className={`min-h-10 w-full whitespace-nowrap rounded-full border px-4 text-left text-sm md:rounded-md md:border-0 md:px-3 md:py-2.5 md:text-[15px] ${
                    on
                      ? "border-ink bg-card font-bold text-ink md:bg-muted md:underline md:underline-offset-4"
                      : "border-transparent bg-muted text-ink-2 hover:text-ink md:bg-transparent"
                  }`}
                >
                  {m.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-5 min-w-0 md:mt-0">
        {view === "summary" ? (
          persona ? (
            <PartySummary demo={demo} onView={onView} onTab={onTab} />
          ) : (
            <OperatorSummary demo={demo} onView={onView} />
          )
        ) : (
          <DealSection
            title={menu.find((m) => m.id === view)?.label ?? ""}
            intro={sectionIntro(view, persona?.name)}
            deals={
              view === "sell" && persona
                ? sellDeals(deals, persona.id)
                : view === "buy" && persona
                  ? buyDeals(deals, persona.id)
                  : view === "ops"
                    ? opsDeals(deals)
                    : deals
            }
            side={view === "sell" ? "worker" : view === "buy" ? "client" : undefined}
            role={role}
            now={now}
            filter={filter}
            query={query}
            onFilter={onFilter}
            onQuery={onQuery}
            emptyAll={emptyText(view, persona?.name)}
            extra={
              view === "ops" ? (
                <Link href="/admin/" className={`${btnLine} mt-3`}>
                  운영자 처리 화면 열기
                </Link>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}

function sectionIntro(view: ActivityView, name?: string): string {
  if (view === "sell") return `${name}의 판매: 작업자(판매자)로 받은 거래입니다.`;
  if (view === "buy") return `${name}의 구매: 의뢰인(구매자)으로 맡긴 거래입니다.`;
  if (view === "ops") return "운영자가 처리할 차례인 거래입니다: 입금 확인, 지급, 분쟁.";
  return "시연판의 모든 거래입니다.";
}

function emptyText(view: ActivityView, name?: string): string {
  if (view === "sell") return `${name}의 판매 거래가 아직 없습니다.`;
  if (view === "buy") return `${name}의 구매 거래가 아직 없습니다. 홈에서 창작자를 찾아 계약을 만들어 보세요.`;
  if (view === "ops") return "지금 운영자가 처리할 거래가 없습니다.";
  return "거래가 없습니다.";
}

function DealSection({
  title,
  intro,
  deals,
  side,
  role,
  now,
  filter,
  query,
  onFilter,
  onQuery,
  emptyAll,
  extra,
}: {
  title: string;
  intro: string;
  deals: Deal[];
  side?: "worker" | "client";
  role: Role;
  now: Date;
  filter: StatusFilter;
  query: string;
  onFilter: (f: StatusFilter) => void;
  onQuery: (q: string) => void;
  emptyAll: string;
  extra: React.ReactNode;
}) {
  const [draft, setDraft] = useState(query);
  const [sort, setSort] = useState<SortKey>("recent");
  const counts = countByFilter(deals);
  const shown = sortDeals(filterDeals(deals, filter, query), sort);

  return (
    <section aria-labelledby="sec-title">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <h2 id="sec-title" className="text-xl font-bold lg:text-2xl">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-2">{intro}</p>
        </div>
        <form
          role="search"
          aria-label={`${title} 검색`}
          className="flex w-full gap-2 lg:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            onQuery(draft);
          }}
        >
          <label htmlFor="deal-q" className="sr-only">
            거래 이름, 상대 이름, 거래번호로 찾기
          </label>
          <input
            id="deal-q"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="거래 이름·상대 이름으로 찾기"
            className="min-h-11 min-w-0 flex-1 rounded-full border border-ink-2 bg-card px-4 text-[15px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none focus-visible:outline-3 focus-visible:outline-accent lg:w-72"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded-full bg-accent px-6 text-[15px] font-bold text-on-accent">
            검색
          </button>
        </form>
      </div>
      {extra}

      <div className="mt-4">
        <h3 className="sr-only">상태로 거르기</h3>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {STATUS_FILTERS.map((f) => {
            const on = f.id === filter;
            return (
              <li key={f.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onFilter(f.id)}
                  className={`min-h-9 whitespace-nowrap rounded-full border px-3.5 text-[13px] ${
                    on ? "border-ink bg-card font-bold text-ink" : "border-transparent bg-muted font-medium text-ink-2 hover:text-ink"
                  }`}
                >
                  {f.label} <span className="font-normal">{counts[f.id]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-b border-line pb-2">
        <h3 className="text-base font-bold lg:text-lg">거래 목록</h3>
        <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
          정렬
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="min-h-9 rounded-md border border-line bg-card px-2 text-[13px] font-semibold text-ink"
          >
            <option value="recent">최근 만든 순</option>
            <option value="deadline">마감 빠른 순</option>
          </select>
        </label>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        거래 {shown.length}건
      </p>

      {shown.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-bold">{deals.length === 0 ? "거래가 없습니다" : "조건에 맞는 거래가 없습니다"}</p>
          <p className="mt-1 text-sm text-ink-2">
            {deals.length === 0 ? emptyAll : "다른 상태를 고르거나 검색어를 바꿔 보세요."}
          </p>
          {deals.length > 0 && (filter !== "all" || query) && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                onQuery("");
                onFilter("all");
              }}
              className="mt-3 text-sm font-semibold text-ink underline"
            >
              조건 지우기
            </button>
          )}
        </div>
      ) : (
        <ul aria-label={`${title} 거래 목록`} className="mt-4 grid gap-3 lg:grid-cols-2 lg:gap-4">
          {shown.map((d) => (
            <DealCard key={d.id} deal={d} role={role} now={now} side={side} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight lg:text-3xl">{value}</p>
      <p className="mt-1 text-[13px] text-ink-2">{sub}</p>
    </div>
  );
}

function PartySummary({ demo, onView, onTab }: { demo: DemoState; onView: (v: ActivityView) => void; onTab: (t: MyTab) => void }) {
  const persona = personaFor(demo.role)!;
  const sell = sellDeals(demo.deals, persona.id);
  const buy = buyDeals(demo.deals, persona.id);
  const s = summarize(sell);
  const b = summarize(buy);
  const issues = collectIssues(involvedDeals(demo.deals, demo.role), demoNow(demo));
  const block = (title: string, sum: ReturnType<typeof summarize>, amountLabel: string, v: ActivityView) => (
    <div className="rounded-lg border border-line p-4 lg:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <button type="button" onClick={() => onView(v)} className="min-h-9 text-[13px] font-semibold text-ink underline">
          자세히 보기
        </button>
      </div>
      <div className="mt-3">
        <Stat
          label={amountLabel}
          value={formatWon(sum.activeAmount)}
          sub={`진행 중 ${sum.activeCount}건${sum.pendingCount > 0 ? ` (조건 동의 대기 ${sum.pendingCount}건은 금액에서 뺌)` : ""} · 정산 완료 ${formatWon(sum.settledAmount)}`}
        />
      </div>
    </div>
  );
  return (
    <section aria-labelledby="sum-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sum-title" className="text-xl font-bold lg:text-2xl">
          요약
        </h2>
        <Link href="/new/" className={btnMain}>
          + 새 계약 생성
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {block("판매 활동", s, "진행 중 거래 금액(받을 예정)", "sell")}
        {block("구매 활동", b, "진행 중 거래 금액(낼 예정)", "buy")}
      </div>
      <button
        type="button"
        onClick={() => onTab("issues")}
        className="flex w-full items-center justify-between rounded-lg border border-line p-4 text-left hover:border-ink"
      >
        <span>
          <span className="block text-[13px] text-ink-2">신경 쓸 거래(분쟁·수정 요청·기한 임박 등)</span>
          <span className="block font-bold">이슈 {issues.length}건</span>
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}

function OperatorSummary({ demo, onView }: { demo: DemoState; onView: (v: ActivityView) => void }) {
  const all = summarize(demo.deals);
  const ops = opsDeals(demo.deals);
  const by = (st: Deal["status"]) => ops.filter((d) => d.status === st).length;
  return (
    <section aria-labelledby="sum-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sum-title" className="text-xl font-bold lg:text-2xl">
          요약
        </h2>
        <Link href="/admin/" className={btnMain}>
          운영자 처리 화면 열기
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <div className="rounded-lg border border-line p-4 lg:p-5">
          <h3 className="font-bold">전체 거래</h3>
          <div className="mt-3">
            <Stat
              label="진행 중 거래 금액(전체)"
              value={formatWon(all.activeAmount)}
              sub={`진행 중 ${all.activeCount}건 · 정산 완료 ${formatWon(all.settledAmount)}`}
            />
          </div>
        </div>
        <div className="rounded-lg border border-line p-4 lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">운영 처리 대기</h3>
            <button type="button" onClick={() => onView("ops")} className="min-h-9 text-[13px] font-semibold text-ink underline">
              자세히 보기
            </button>
          </div>
          <p className="mt-3 text-2xl font-extrabold lg:text-3xl">{ops.length}건</p>
          <p className="mt-1 text-[13px] text-ink-2">
            입금 확인 {by("deposit_reported")} · 지급 {by("awaiting_payout")} · 분쟁 {by("disputed")}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────── 이슈 ───────────── */

function Issues({ demo }: { demo: DemoState }) {
  const { role } = demo;
  const persona = personaFor(role);
  const issues = collectIssues(involvedDeals(demo.deals, role), demoNow(demo));
  return (
    <section aria-labelledby="iss-title">
      <h2 id="iss-title" className="text-xl font-bold lg:text-2xl">
        신경 쓸 거래
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-2">
        {persona ? `${persona.name}의 판매·구매 거래` : "모든 거래"} 중 분쟁, 수정 요청, 마감 지남, 기한 임박(
        {DEADLINE_SOON_DAYS}일 이내), 취소된 거래를 모았습니다.
      </p>
      {issues.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-2">지금 신경 쓸 거래가 없습니다.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {issues.map(({ deal, kind, detail }) => {
            const mySide = persona ? (deal.worker.id === persona.id ? "판매" : "구매") : null;
            return (
              <li key={deal.id}>
                <Link
                  href={`/deal/?id=${encodeURIComponent(deal.id)}`}
                  className="flex items-start justify-between gap-3 py-4 hover:bg-muted md:px-3"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[12px]">
                      <span
                        className={`rounded-md px-2 py-0.5 font-bold ${
                          kind === "dispute" ? "bg-danger-soft text-danger" : "bg-ink text-on-ink"
                        }`}
                      >
                        {ISSUE_LABEL[kind]}
                      </span>
                      {mySide && <span className="text-ink-2">{mySide}</span>}
                      <span className="text-ink-2">마감 {formatDate(deal.terms.deadline)}</span>
                    </p>
                    <p className="mt-1 font-bold leading-snug">{deal.terms.title}</p>
                    <p className="mt-0.5 text-[13px] text-ink-2">{detail}</p>
                  </div>
                  <span className="sr-only">현재 상태 {statusLabel(deal)}</span>
                  <span aria-hidden="true">
                    <StatusBadge deal={deal} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ───────────── 계정 ───────────── */

function Account({ role }: { role: Role }) {
  const p = ROLE_PERSONA[role];
  const [notify, setNotify] = useState({ terms: true, delivery: true, money: true });
  const rows: [string, React.ReactNode][] = [
    ["이름", p.name],
    ["포지션", `${p.title} · ${p.hint}`],
    ["로그인 방식", "시연판에는 로그인이 없습니다. 실제 서비스에서는 이메일·구글·카카오로 로그인합니다."],
  ];
  const items: [keyof typeof notify, string][] = [
    ["terms", "조건 동의 요청·변경"],
    ["delivery", "납품·검수·수정 요청"],
    ["money", "입금 확인·지급·정산"],
  ];
  return (
    <div className="space-y-6 lg:max-w-3xl">
      <section aria-labelledby="acc-basic">
        <h2 id="acc-basic" className="text-xl font-bold lg:text-2xl">
          기본 정보
        </h2>
        <dl className="mt-3 divide-y divide-line border-y border-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
              <dt className="text-[13px] font-semibold text-ink-2 sm:text-sm">{k}</dt>
              <dd className="text-[15px]">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {role === "operator" ? (
            <Link href="/admin/" className={btnLine}>
              운영자 처리 화면
            </Link>
          ) : (
            <Link href="/profile/" className={btnLine}>
              내 신뢰도 프로필 보기
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="acc-notify">
        <h2 id="acc-notify" className="text-lg font-bold lg:text-xl">
          이메일 알림
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-2">시연판에서는 저장되지 않고 실제 알림도 보내지 않습니다.</p>
        <fieldset className="mt-3">
          <legend className="sr-only">받을 알림</legend>
          <ul className="divide-y divide-line border-y border-line">
            {items.map(([k, label]) => (
              <li key={k}>
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-2">
                  <span className="text-[15px]">{label}</span>
                  <input
                    type="checkbox"
                    checked={notify[k]}
                    onChange={(e) => setNotify({ ...notify, [k]: e.target.checked })}
                    className="size-5 accent-ink"
                  />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </section>

      <section aria-labelledby="acc-pay">
        <h2 id="acc-pay" className="text-lg font-bold lg:text-xl">
          대금 받는 방법
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          시연판(MVP)은 계좌번호를 받지 않습니다. 대금 경로(운영자 수령 또는 직접 송금)는 거래마다 계약 조건에서 정합니다.
        </p>
      </section>
    </div>
  );
}
