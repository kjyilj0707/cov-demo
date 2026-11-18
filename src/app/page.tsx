"use client";

import Link from "next/link";
import { DealCard } from "@/components/bits";
import { formatWon } from "@/lib/format";
import { homeBoard, involvedDeals, sideIn, type BoardItem } from "@/lib/my-deals";
import { ROLE_PERSONA } from "@/lib/personas";
import { summarize } from "@/lib/stats";
import { demoNow, useDemo } from "@/lib/store";
import type { Deal, Role } from "@/lib/types";

/*
 * 홈 = 내 계약 현황판. 첫 화면의 질문은 "누구를 찾을까?"가 아니라 "내 계약이 지금 어디까지 왔나?"다.
 * 사용자는 이미 DM·지인으로 상대를 정한 사람이고, CoV는 그 둘의 계약 → 대금 → 수정 → 납품·검수 → 정산을 관리한다.
 * (창작자 검색 홈은 src/archive/creator-search에 보관. 2단계 매칭 때 다시 쓴다.)
 *
 * 홈과 나의 거래의 역할 나눔:
 * - 홈: 내가 할 일 / 상대·운영자 차례 / 완료 세 묶음만. 차례 판단은 my-deals.homeBoard.
 * - 나의 거래: 전체 목록, 검색, 상태 필터, 판매·구매 나눠 보기, 이슈, 계정.
 */

const btnHero =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 text-[17px] font-extrabold text-on-accent hover:opacity-95";

const STEPS: { title: string; body: string }[] = [
  { title: "조건 정하기", body: "작업 범위, 금액, 납기, 수정 횟수, 대금 경로를 체크하며 정합니다." },
  { title: "링크로 상대 초대", body: "초안을 만들면 나오는 초대 링크를 카톡·DM으로 보내면, 상대가 들어와 동의합니다." },
  { title: "끝까지 관리", body: "입금 확인, 납품·검수, 수정 회차, 정산까지 한 화면에서 이어 갑니다." },
];

export default function HomePage() {
  const demo = useDemo();
  if (!demo) return null;
  const { role } = demo;
  const now = demoNow(demo);
  const board = homeBoard(demo.deals, role);

  return (
    <div className="space-y-8 lg:space-y-12">
      <Hero role={role} />
      {board.total === 0 ? (
        <EmptyGuide />
      ) : (
        <Dashboard role={role} now={now} board={board} sum={summarize(involvedDeals(demo.deals, role))} />
      )}
      <p className="text-center text-[12px] text-ink-2">이 화면의 거래·이름·금액은 모두 시연용 가상 데이터입니다.</p>
    </div>
  );
}

function Hero({ role }: { role: Role }) {
  const operator = role === "operator";
  return (
    <section
      aria-labelledby="hero-title"
      className="pt-2 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:pt-6"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-accent lg:text-base">창작 외주 계약·거래 관리</p>
        <h1 id="hero-title" className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl lg:mt-2 lg:text-5xl">
          DM으로 정한 외주,
          <br /> 계약부터 정산까지
        </h1>
        <p className="mt-2 text-[15px] text-ink-2 lg:mt-3 lg:text-lg">이미 이야기 나눈 상대와 조건을 확정하고 끝까지 관리하세요.</p>
        {!operator && <StepStrip />}
      </div>

      <div className="mt-5 shrink-0 lg:mt-0 lg:w-80">
        {operator ? (
          <>
            <Link href="/admin/" className={btnHero}>
              운영자 처리 화면
            </Link>
            <p className="mt-2 text-[13px] text-ink-2">운영자는 계약을 만들지 않고, 입금 확인·지급·분쟁을 수기로 처리합니다.</p>
          </>
        ) : (
          <>
            <Link href="/new/" className={btnHero}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              새 계약 만들기
            </Link>
            <p className="mt-2 text-[13px] text-ink-2">조건을 정하면 상대에게 보낼 초대 링크가 나옵니다.</p>
          </>
        )}
      </div>
    </section>
  );
}

/** 히어로 아래 한 줄 사용법(조건 정하기 → 링크로 상대 초대 → 끝까지 관리) */
function StepStrip() {
  return (
    <ol aria-label="사용 순서" className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-ink-2 lg:mt-5 lg:text-sm">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-on-ink">
              {i + 1}
            </span>
            <span className="font-semibold text-ink">{s.title}</span>
          </span>
          {i < STEPS.length - 1 && (
            <span aria-hidden="true" className="text-ink-3">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** 계약이 하나도 없을 때: 3단계 사용법 */
function EmptyGuide() {
  return (
    <section aria-labelledby="empty-title" className="rounded-lg border border-line bg-card p-5 lg:p-8">
      <h2 id="empty-title" className="text-lg font-bold lg:text-2xl">
        아직 계약이 없습니다
      </h2>
      <p className="mt-1 text-sm text-ink-2">이미 이야기 나눈 상대가 있다면, 세 단계로 시작합니다.</p>
      <ol className="mt-5 grid gap-3 md:grid-cols-3 lg:gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-lg bg-muted p-4">
            <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-on-ink">
              {i + 1}
            </span>
            <h3 className="mt-3 font-bold">{s.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
      <Link
        href="/new/"
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-[15px] font-bold text-on-accent"
      >
        첫 계약 만들기
      </Link>
    </section>
  );
}

function Dashboard({
  role,
  now,
  board,
  sum,
}: {
  role: Role;
  now: Date;
  board: ReturnType<typeof homeBoard>;
  sum: ReturnType<typeof summarize>;
}) {
  const operator = role === "operator";
  const persona = ROLE_PERSONA[role];
  const groups = [
    { id: "todo", label: operator ? "운영자가 처리할 일" : "내가 할 일", count: board.todo.length },
    { id: "waiting", label: operator ? "당사자 차례" : "상대·운영자 차례", count: board.waiting.length },
    { id: "done", label: "완료", count: board.done.length },
  ];
  const DONE_PREVIEW = 3;

  return (
    <section aria-labelledby="board-title" className="space-y-6 lg:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h2 id="board-title" className="text-xl font-bold lg:text-2xl">
            {operator ? "전체 계약 현황" : "내 계약 현황"}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {operator ? persona.name : `${persona.name}(${persona.title})`}로 보는 중 · 진행 중 {sum.activeCount}건
            {sum.activeAmount > 0 && ` · 동의 끝난 진행 중 계약 ${formatWon(sum.activeAmount)}`}
          </p>
        </div>
        <Link href="/deals/" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline underline-offset-4">
          {operator ? "전체 거래 목록" : "나의 거래 전체 보기"}
        </Link>
      </div>

      {/* 세 묶음 숫자. 누르면 그 묶음으로 내려간다 */}
      <ul aria-label="계약 현황 요약" className="grid grid-cols-3 gap-2 lg:gap-4">
        {groups.map((g, i) => (
          <li key={g.id}>
            <a
              href={`#${g.id}`}
              className={`flex h-full flex-col justify-between rounded-lg border p-3 lg:p-5 ${
                i === 0 && g.count > 0 ? "border-accent bg-accent-soft" : "border-line bg-card hover:border-ink"
              }`}
            >
              <span className="text-[12px] font-semibold leading-tight text-ink-2 lg:text-sm">{g.label}</span>
              <span className={`mt-1 text-2xl font-extrabold lg:text-4xl ${i === 0 && g.count > 0 ? "text-accent" : "text-ink"}`}>
                {g.count}
                <span className="ml-0.5 text-sm font-bold lg:text-lg">건</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Group
        id="todo"
        title={groups[0].label}
        intro={operator ? "입금 확인, 지급, 분쟁 처리를 기다리는 계약입니다." : "지금 내가 눌러야 다음 단계로 넘어가는 계약입니다."}
        items={board.todo}
        mine
        role={role}
        now={now}
        empty={operator ? "지금 운영자가 처리할 계약이 없습니다." : "지금 내가 할 일은 없습니다. 상대 차례인 계약은 아래에서 확인하세요."}
      />
      <Group
        id="waiting"
        title={groups[1].label}
        intro={operator ? "작업자나 의뢰인이 다음 단계를 진행할 차례입니다." : "진행 중이지만 상대나 운영자가 할 차례인 계약입니다."}
        items={board.waiting}
        role={role}
        now={now}
        empty="기다리는 계약이 없습니다."
      />
      <Group
        id="done"
        title="완료"
        intro="정산까지 끝났거나 취소된 계약입니다."
        items={board.done.slice(0, DONE_PREVIEW).map((deal: Deal) => ({ deal, note: "" }))}
        role={role}
        now={now}
        empty="아직 끝난 계약이 없습니다."
        more={
          board.done.length > DONE_PREVIEW ? (
            <Link href="/deals/" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-ink underline underline-offset-4">
              끝난 계약 {board.done.length}건 모두 보기(나의 거래)
            </Link>
          ) : null
        }
      />
    </section>
  );
}

function Group({
  id,
  title,
  intro,
  items,
  mine = false,
  role,
  now,
  empty,
  more = null,
}: {
  id: string;
  title: string;
  intro: string;
  items: BoardItem[];
  mine?: boolean;
  role: Role;
  now: Date;
  empty: string;
  more?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-40">
      <div className="border-b border-line pb-2">
        <h3 id={`${id}-title`} className="text-base font-bold lg:text-lg">
          {title}
        </h3>
        <p className="mt-0.5 text-[13px] text-ink-2">{intro}</p>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-sm text-ink-2">{empty}</p>
      ) : (
        <ul aria-label={title} className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {items.map(({ deal, note }) => (
            <DealCard
              key={deal.id}
              deal={deal}
              role={role}
              now={now}
              side={role === "operator" ? undefined : (sideIn(deal, role) as "worker" | "client")}
              note={note ? { text: note, mine } : undefined}
            />
          ))}
        </ul>
      )}
      {more}
    </section>
  );
}
