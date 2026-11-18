"use client";

import Link from "next/link";
import { MAIN_FLOW, statusLabel } from "@/lib/deal-machine";
import { daysUntil, formatDate, formatWon } from "@/lib/format";
import { paymentStage } from "@/lib/my-deals";
import { agreedAmount } from "@/lib/stats";
import type { Deal, DealStatus, Role } from "@/lib/types";
import { PAYMENT_ROUTE_LABEL, ROLE_LABEL } from "@/lib/types";

const TONE: Record<DealStatus, string> = {
  proposed: "bg-accent-soft text-accent",
  awaiting_deposit: "bg-warn-soft text-warn",
  deposit_reported: "bg-warn-soft text-warn",
  in_progress: "bg-accent-soft text-accent",
  in_review: "bg-accent-soft text-accent",
  awaiting_payout: "bg-warn-soft text-warn",
  settled: "bg-ok-soft text-ok",
  disputed: "bg-danger-soft text-danger",
  cancelled: "bg-line text-ink-2",
};

export function StatusBadge({ deal }: { deal: Deal }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[deal.status]}`}>
      {statusLabel(deal)}
    </span>
  );
}

export function Card({ children, className = "", ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`rounded-2xl border border-line bg-card p-4 ${className}`} {...rest}>
      {children}
    </section>
  );
}

/** 정상 흐름 기준 진행 정도(0~1). 분쟁·취소는 직전 단계 기준. */
export function progressOf(deal: Deal): number {
  let s = deal.status;
  if (s === "disputed") s = deal.statusBeforeDispute ?? "in_progress";
  if (s === "cancelled") {
    const prev = [...deal.history].reverse().find((h) => h.to !== "cancelled" && h.to !== "disputed");
    s = prev?.to ?? "proposed";
  }
  const i = MAIN_FLOW.indexOf(s);
  return Math.max(0, i) / (MAIN_FLOW.length - 1);
}

export function ProgressBar({ deal }: { deal: Deal }) {
  const pct = Math.round(progressOf(deal) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-label="거래 진행 정도"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        className={`h-full rounded-full ${deal.status === "cancelled" ? "bg-ink-3" : deal.status === "disputed" ? "bg-danger" : "bg-accent"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function revisionText(deal: Deal): string {
  return `수정 ${deal.revisionsUsed}/${deal.terms.revisionLimit}`;
}

/**
 * 거래 카드(홈 현황판과 나의 거래 목록이 함께 쓴다).
 * side: 이 거래에서 "나"의 자리. 판매·구매 활동처럼 역할과 다른 자리의 거래를 보여 줄 때 넘긴다.
 * note: 홈 현황판의 한 줄(mine = 내가 할 일, 아니면 기다리는 일).
 */
export function DealCard({
  deal,
  role: viewRole,
  now,
  side,
  note,
}: {
  deal: Deal;
  role: Role;
  now: Date;
  side?: "worker" | "client";
  note?: { text: string; mine: boolean };
}) {
  const role: Role = viewRole === "operator" ? "operator" : (side ?? viewRole);
  const other =
    role === "worker"
      ? `의뢰인 ${deal.client.name}`
      : role === "client"
        ? `작업자 ${deal.worker.name}`
        : `${deal.worker.name} ↔ ${deal.client.name}`;
  const myRole = role === "operator" ? "운영자 보기" : ROLE_LABEL[role];
  const left = daysUntil(deal.terms.deadline, now);
  const done = deal.status === "settled" || deal.status === "cancelled";
  return (
    <li className="h-full">
      <Link
        href={`/deal/?id=${encodeURIComponent(deal.id)}`}
        className="block h-full rounded-lg border border-line bg-card p-4 transition-colors hover:border-ink"
      >
        {note && (
          <p
            className={`mb-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-bold ${
              note.mine ? "bg-accent text-on-accent" : "bg-muted text-ink-2"
            }`}
          >
            <span className="sr-only">{note.mine ? "내가 할 일: " : "기다리는 일: "}</span>
            <span className="truncate">{note.text}</span>
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold leading-snug">{deal.terms.title}</h3>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {myRole} · {other}
            </p>
          </div>
          <StatusBadge deal={deal} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
          <div>
            <dt className="text-ink-2">수정</dt>
            <dd className="font-semibold">
              {deal.revisionsUsed}/{deal.terms.revisionLimit}
            </dd>
          </div>
          <div>
            <dt className="text-ink-2">마감</dt>
            <dd className="font-semibold">
              {formatDate(deal.terms.deadline)}
              {!done && (
                <span className={`block text-[12px] font-normal ${left < 0 ? "text-danger" : "text-ink-2"}`}>
                  {left < 0 ? `(${-left}일 지남)` : `(D-${left})`}
                </span>
              )}
            </dd>
          </div>
          <div className="text-right">
            <dt className="text-ink-2">금액</dt>
            <dd className="font-semibold">{formatWon(agreedAmount(deal))}</dd>
          </div>
        </dl>
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar deal={deal} />
          <span className="shrink-0 text-[11px] text-ink-2">
            <span className="sr-only">대금: </span>
            {PAYMENT_ROUTE_LABEL[deal.terms.paymentRoute]} · {paymentStage(deal)}
          </span>
        </div>
      </Link>
    </li>
  );
}

export function Field({
  label,
  children,
  hint,
  id,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[13px] text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-card px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus-visible:outline-3 focus-visible:outline-accent";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-[15px] font-bold text-on-accent disabled:opacity-50";
export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-card px-4 py-2.5 text-[15px] font-bold text-ink disabled:opacity-50";
export const btnDanger =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-danger/40 bg-card px-4 py-2.5 text-[15px] font-bold text-danger disabled:opacity-50";

export function OperatorOnly() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-lg font-bold">운영자 전용 화면입니다</h1>
      <p className="mt-2 text-sm text-ink-2">
        위의 역할 전환에서 &lsquo;운영자(CEO)&rsquo;를 고르면 볼 수 있습니다. 실제 서비스에서는 서버가 권한을 확인합니다.
      </p>
    </div>
  );
}
