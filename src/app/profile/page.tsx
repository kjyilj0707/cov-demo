"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, btnPrimary } from "@/components/bits";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Monogram } from "@/components/CreatorCard";
import {
  CATEGORIES,
  CREATORS,
  DEMO_CLIENTS,
  canContractWith,
  findProfileTarget,
  pct,
  trustFor,
  type ProfileTarget,
} from "@/lib/creators";
import { ME_CLIENT, ME_WORKER, ROLE_PERSONA } from "@/lib/personas";
import { setRole, useDemo } from "@/lib/store";
import type { Role } from "@/lib/types";

/** 화면에 쓰는 포지션 이름. 작업자 = 판매자(작업을 맡아 하는 쪽) */
const SIDE_LABEL = { worker: "작업자(판매자)", client: "의뢰인(구매자)" } as const;

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-2">불러오는 중…</p>}>
      <ProfileView />
    </Suspense>
  );
}

function ProfileView() {
  const params = useSearchParams();
  const router = useRouter();
  const demo = useDemo();
  if (!demo) return null;
  const { role } = demo;

  const id = params.get("id");
  const back = new URLSearchParams();
  for (const k of ["q", "cat", "sheet", "list"]) {
    const v = params.get(k);
    if (v) back.set(k, v);
  }
  const viewingOther = Boolean(id);
  const fromSearch = params.get("from") === "search";

  // id가 없으면 "내 프로필": 지금 역할의 당사자를 보여 준다.
  const myId = role === "worker" ? ME_WORKER.id : role === "client" ? ME_CLIENT.id : null;
  const targetId = id ?? myId;
  const target = targetId ? findProfileTarget(targetId) : undefined;
  const isMe = target !== undefined && target.party.id === myId;

  return (
    <div className="space-y-4 lg:space-y-6">
      {viewingOther ? (
        <Link
          href={fromSearch ? (back.toString() ? `/?${back}` : "/") : "/profile/"}
          className="text-sm font-semibold text-ink-2 hover:text-ink"
        >
          ← {fromSearch ? (back.has("sheet") ? "카테고리" : back.toString() ? "검색 결과" : "홈") : "내 프로필"}
        </Link>
      ) : (
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">내 프로필</h1>
          <p className="mt-1 text-sm text-ink-2">포지션은 위의 역할 전환과 같이 움직입니다.</p>
        </div>
      )}

      {id && !target ? (
        <Card>
          <h1 className="text-lg font-bold">프로필을 찾을 수 없습니다</h1>
          <p className="mt-1 text-sm text-ink-2">홈에서 다시 검색해 주세요.</p>
        </Card>
      ) : !target ? (
        <TwoCol
          left={
            <>
              <PositionSwitch role={role} />
              <Card aria-labelledby="op-title">
                <h2 id="op-title" className="text-base font-bold">
                  {ROLE_PERSONA.operator.name}
                </h2>
                <p className="mt-1 text-sm text-ink-2">
                  운영자는 거래 당사자가 아니어서 신뢰도 프로필이 없습니다. 위에서 작업자나 의뢰인 포지션을 고르거나,
                  아래 목록에서 다른 사람의 프로필을 열어 보세요.
                </p>
              </Card>
            </>
          }
          right={<OtherProfiles currentId={undefined} />}
        />
      ) : (
        <ProfileBody
          target={target}
          isMe={isMe}
          headingLevel={viewingOther ? "h1" : "h2"}
          deals={demo.deals}
          onContract={() => {
            if (role !== "client") setRole("client");
            router.push(`/new/?worker=${encodeURIComponent(target.party.id)}`);
          }}
          role={role}
          leftTop={viewingOther ? null : <PositionSwitch role={role} />}
          rightBottom={<OtherProfiles currentId={target.party.id} />}
        />
      )}
    </div>
  );
}

function PositionSwitch({ role }: { role: Role }) {
  const options: [Role, string][] = [
    ["worker", SIDE_LABEL.worker],
    ["client", SIDE_LABEL.client],
  ];
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">내 포지션</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {options.map(([r, label]) => {
          const on = role === r;
          return (
            <label
              key={r}
              className={`cursor-pointer rounded-lg px-2 py-2 text-center text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                on ? "bg-card font-bold text-ink shadow-sm" : "text-ink-2"
              }`}
            >
              <input type="radio" name="position" className="sr-only" checked={on} onChange={() => setRole(r)} />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ProfileBody({
  target,
  isMe,
  headingLevel,
  deals,
  onContract,
  role,
  leftTop,
  rightBottom,
}: {
  target: ProfileTarget;
  isMe: boolean;
  headingLevel: "h1" | "h2";
  deals: Parameters<typeof trustFor>[1];
  onContract: () => void;
  role: Role;
  leftTop: React.ReactNode;
  rightBottom: React.ReactNode;
}) {
  const t = trustFor(target, deals);
  const c = target.creator;
  const Heading = headingLevel;
  // 창작자에게 계약을 제안하는 건 의뢰인이다. 지금 의뢰인이 아니면 역할을 바꾸고 넘어간다.
  const canPropose = target.side === "worker" && !(isMe && role === "worker");
  // 공연·라이브처럼 계약을 아직 열지 않은 분야의 창작자는 버튼 대신 안내를 보여 준다.
  const contractPaused = c !== undefined && !canContractWith(c);

  const profileCard = (
    <Card aria-labelledby="pf-name">
      <div className="flex items-start gap-3">
        <Monogram name={target.party.name} size="lg" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
              {SIDE_LABEL[target.side]}
            </span>
            {isMe && <span className="rounded-full bg-ink px-2 py-0.5 font-semibold text-on-ink">나</span>}
          </p>
          <Heading id="pf-name" className="mt-1 text-xl font-extrabold leading-snug">
            {target.party.name}
          </Heading>
          {c && <p className="text-[13px] text-ink-2">{c.field}</p>}
        </div>
      </div>
      {c && (
        <>
          <p className="mt-3 text-sm leading-relaxed">{c.intro}</p>
          <ul aria-label="분야" className="mt-3 flex flex-wrap gap-1.5">
            {c.categories.map((id) => {
              const k = CATEGORIES.find((x) => x.id === id);
              return (
                <li
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent"
                >
                  <CategoryIcon id={id} className="size-3.5" />
                  {k?.label}
                </li>
              );
            })}
            {c.keywords.map((k) => (
              <li key={k} className="rounded-full bg-muted px-2.5 py-1 text-[12px] text-ink-2">
                #{k}
              </li>
            ))}
          </ul>
        </>
      )}
      {!c && <p className="mt-3 text-sm text-ink-2">시연 거래에 등장하는 가상 의뢰인입니다.</p>}
    </Card>
  );

  const trustCard = (
    <Card aria-labelledby="pf-trust">
      <h2 id="pf-trust" className="text-base font-bold">
        {SIDE_LABEL[target.side]}로서의 신뢰도
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-2">
        {t.source === "live"
          ? "시연 거래 기록에서 계산한 값입니다."
          : "검색용 가상 창작자의 고정값입니다(실제 거래 기록 아님)."}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="완료 건수" value={`${t.completed}건`} />
        <Stat label="응답률" value={pct(t.responseRate)} />
        <Stat label="재계약률" value={pct(t.recontractRate)} />
      </dl>
    </Card>
  );

  const cta = canPropose && contractPaused ? (
    <div role="note" className="rounded-2xl border border-line bg-muted p-4 text-center">
      <p className="font-bold">공연 계약은 준비 중입니다</p>
      <p className="mt-1 text-[13px] text-ink-2">
        공연·라이브는 파일 납품이 없어 지금의 계약 절차와 맞지 않습니다. 계약 방식이 정해지면 이곳에서 바로 계약을 만들 수 있습니다.
      </p>
    </div>
  ) : canPropose && (
    <div className="space-y-1.5">
      <button type="button" onClick={onContract} className={`${btnPrimary} w-full py-4 text-base`}>
        이 창작자와 계약 만들기
      </button>
      {role !== "client" && (
        <p className="text-center text-[13px] text-ink-2">누르면 의뢰인 역할로 바뀌고 계약 만들기로 넘어갑니다.</p>
      )}
    </div>
  );

  const defCard = (
    <Card aria-labelledby="pf-def">
      <h2 id="pf-def" className="text-base font-bold">
        이렇게 계산했어요(시연용 정의)
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
        <li>
          <strong className="text-ink">완료 건수</strong>: 정산 완료까지 간 거래 수.
        </li>
        <li>
          <strong className="text-ink">응답률</strong>: 받은 요청(조건 동의 요청,{" "}
          {target.side === "worker" ? "수정 요청" : "검수 요청"}) 중 직접 응답한 비율.
          {target.side === "client" && " 무응답 자동 승인은 응답하지 않은 것으로 셉니다."} 아직 기다리는 요청은 뺍니다.
          {t.detail && ` 지금 ${t.detail.requests}건 중 ${t.detail.responded}건.`}
        </li>
        <li>
          <strong className="text-ink">재계약률</strong>: 거래한 상대 중 2건 이상 거래한 상대의 비율(취소 제외).
          {t.detail && ` 지금 ${t.detail.counterparties}명 중 ${t.detail.repeatCounterparties}명.`}
        </li>
      </ul>
      <p className="mt-2 text-[13px] text-ink-2">지표의 정확한 정의는 아직 정해지지 않았습니다.</p>
    </Card>
  );

  return (
    <TwoCol
      left={
        <>
          {leftTop}
          {profileCard}
          {cta}
        </>
      }
      right={
        <>
          {trustCard}
          {defCard}
          {rightBottom}
        </>
      }
    />
  );
}

/** 휴대폰: 한 줄. lg(1024px~): 왼쪽 380px 고정 + 오른쪽 나머지. */
function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-4 lg:sticky lg:top-36">{left}</div>
      <div className="space-y-4">{right}</div>
    </div>
  );
}

function OtherProfiles({ currentId }: { currentId?: string }) {
  const people = [
    ...CREATORS.filter((c) => c.id === ME_WORKER.id).map((c) => ({ id: c.id, name: c.name, side: "worker" as const })),
    ...DEMO_CLIENTS.map((p) => ({ id: p.id, name: p.name, side: "client" as const })),
  ].filter((p) => p.id !== currentId);
  return (
    <section aria-labelledby="others-title">
      <h2 id="others-title" className="text-sm font-bold text-ink-2">
        시연 거래 당사자 프로필 보기
      </h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-card">
        {people.map((p) => (
          <li key={p.id}>
            <Link
              href={`/profile/?id=${encodeURIComponent(p.id)}`}
              className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 hover:text-accent"
            >
              <span className="font-semibold">{p.name}</span>
              <span className="text-[13px] text-ink-2">{SIDE_LABEL[p.side]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold">{value}</dd>
    </div>
  );
}
