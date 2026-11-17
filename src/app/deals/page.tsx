"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, DealCard, btnPrimary } from "@/components/bits";
import { TERMINAL } from "@/lib/deal-machine";
import { formatWon } from "@/lib/format";
import { ME_CLIENT, ME_WORKER, ROLE_PERSONA } from "@/lib/personas";
import { demoNow, useDemo } from "@/lib/store";
import { dealsFor, summarize } from "@/lib/stats";

/** 나의 거래 화면 안 버튼은 덜 둥글게(2026-11-17 피드백 "좀 더 각지게"). 다른 화면의 btnPrimary는 그대로. */
const btnSquare = btnPrimary.replace("rounded-xl", "rounded-md");

export default function MyDealsPage() {
  const demo = useDemo();
  const [tab, setTab] = useState<"active" | "done">("active");
  if (!demo) return null;
  const { role } = demo;
  const now = demoNow(demo);
  const myId = role === "worker" ? ME_WORKER.id : role === "client" ? ME_CLIENT.id : null;
  const mine = dealsFor(demo.deals, role, myId);
  const sum = summarize(mine);
  const active = mine.filter((d) => !TERMINAL.includes(d.status));
  const done = mine.filter((d) => TERMINAL.includes(d.status));
  const list = tab === "active" ? active : done;

  const amountLabel =
    role === "worker"
      ? "진행 중 거래 금액(받을 예정)"
      : role === "client"
        ? "진행 중 거래 금액(낼 예정)"
        : "진행 중 거래 금액(전체)";

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{role === "operator" ? "전체 거래" : "나의 거래"}</h1>
        <p className="mt-1 text-sm text-ink-2">
          <strong className="text-ink">{ROLE_PERSONA[role].name}</strong>({ROLE_PERSONA[role].title}) 화면으로 보는 중
        </p>
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-4 lg:sticky lg:top-36">
          <Card aria-labelledby="sum-title">
            <h2 id="sum-title" className="text-[13px] font-medium text-ink-2">
              {amountLabel}
            </h2>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatWon(sum.activeAmount)}</p>
            <p className="mt-1 text-[13px] text-ink-2">
              진행 중 {sum.activeCount}건
              {sum.pendingCount > 0 && ` (조건 동의 대기 ${sum.pendingCount}건은 금액에서 뺌)`} · 정산 완료{" "}
              {formatWon(sum.settledAmount)}
            </p>
          </Card>

          {role === "operator" ? (
            <Link href="/admin/" className={`${btnSquare} w-full py-4 text-base`}>
              운영자 처리 화면 열기
            </Link>
          ) : (
            <Link href="/new/" className={`${btnSquare} w-full py-4 text-base`}>
              + 새 계약 생성
            </Link>
          )}
        </div>

        <div className="space-y-4">
          <div role="group" aria-label="거래 목록 구분" className="flex gap-4 border-b border-line">
            {(
              [
                ["active", `진행 중 ${active.length}`],
                ["done", `끝난 거래 ${done.length}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={tab === k}
                onClick={() => setTab(k)}
                className={`-mb-px border-b-2 px-1 pb-2 text-sm font-bold ${
                  tab === k ? "border-ink text-ink" : "border-transparent text-ink-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-2">
              {tab === "active" ? "진행 중인 거래가 없습니다." : "끝난 거래가 없습니다."}
            </p>
          ) : (
            <ul
              className="grid gap-3 md:grid-cols-2 lg:gap-4"
              aria-label={tab === "active" ? "진행 중 거래" : "끝난 거래"}
            >
              {list.map((d) => (
                <DealCard key={d.id} deal={d} role={role} now={now} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
