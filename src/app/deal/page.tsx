"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import ActionPanel from "@/components/ActionPanel";
import { Card, StatusBadge, revisionText } from "@/components/bits";
import { TermsForm } from "@/components/TermsForm";
import {
  ACTION_LABEL,
  AUTO_APPROVE_DAYS,
  MAIN_FLOW,
  isTermsLocked,
  statusLabel,
  type ActionType,
} from "@/lib/deal-machine";
import { daysUntil, formatDate, formatDateTime, formatWon } from "@/lib/format";
import { hashTerms } from "@/lib/hash";
import { OPERATOR_ACCOUNT, depositorNameRule } from "@/lib/personas";
import { act, demoNow, useDemo } from "@/lib/store";
import { agreedAmount } from "@/lib/stats";
import { PAYMENT_ROUTE_LABEL, ROLE_LABEL, type Deal, type DealStatus, type Role } from "@/lib/types";

export default function DealPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-2">불러오는 중…</p>}>
      <DealView />
    </Suspense>
  );
}

function DealView() {
  const id = useSearchParams().get("id") ?? "";
  const demo = useDemo();
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  if (!demo) return null;
  const deal = demo.deals.find((d) => d.id === id);
  if (!deal) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-bold">거래를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-ink-2">시연 데이터를 초기화했다면 목록에서 다시 골라 주세요.</p>
        <Link href="/deals/" className="mt-4 inline-block font-semibold text-accent underline">
          거래 목록으로
        </Link>
      </div>
    );
  }
  const { role } = demo;
  const now = demoNow(demo);

  // 배치: 휴대폰은 한 줄(지금 상황 → 진행 단계 → 계약 정보 → 작업 범위 → 대금 → 타임라인 → 이력 → 하단 고정 버튼).
  // lg(1024px~)는 왼쪽 본문 + 오른쪽 고정 사이드(지금 상황, 대금, 할 일 버튼) 2단.
  // 두 묶음은 휴대폰에서 display:contents로 풀리고 order로 순서를 맞춘다.
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="space-y-3">
        <Link href="/deals/" className="text-sm font-semibold text-ink-2 hover:text-ink">
          ← {role === "operator" ? "전체 거래" : "나의 거래"}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-snug lg:text-2xl">{deal.terms.title}</h1>
            <p className="mt-1 text-[13px] text-ink-2">
              작업자 {deal.worker.name} · 의뢰인 {deal.client.name}
            </p>
          </div>
          <StatusBadge deal={deal} />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <div className="contents lg:block lg:space-y-4">
          <div className="order-2">
            <Steps deal={deal} />
          </div>

          <div className="order-3">
            {editing ? (
              <Card aria-labelledby="edit-t">
                <h2 id="edit-t" className="mb-3 text-base font-bold">
                  조건 수정(동의 전)
                </h2>
                {editError && (
                  <p role="alert" className="mb-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                    {editError}
                  </p>
                )}
                <TermsForm
                  initial={deal.terms}
                  submitLabel="수정한 조건으로 다시 요청"
                  onSubmit={(terms) => {
                    const r = act(deal.id, { type: "edit_terms", terms });
                    if (!r.ok) return r.message;
                    setEditing(false);
                    setEditError("");
                    return null;
                  }}
                />
                <button
                  type="button"
                  className="mt-3 w-full text-sm font-semibold text-ink-2 underline"
                  onClick={() => setEditing(false)}
                >
                  수정 취소
                </button>
              </Card>
            ) : (
              <TermsCard deal={deal} />
            )}
          </div>

          <div className="order-4">
            <Card aria-labelledby="scope-t">
              <h2 id="scope-t" className="text-base font-bold">
                작업 범위
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{deal.terms.scope}</p>
            </Card>
          </div>

          <div className="order-6">
            <DeliveryTimeline deal={deal} />
          </div>

          <div className="order-7">
            <HistoryList deal={deal} />
          </div>
        </div>

        <aside aria-label="지금 상황과 할 일" className="contents lg:sticky lg:top-24 lg:block lg:space-y-4">
          <div className="order-1">
            <NowBox deal={deal} role={role} now={now} />
          </div>

          <div className="no-print order-8 sticky bottom-16 z-20 -mx-4 border-t border-line bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:static lg:z-auto lg:bg-card lg:p-4 lg:backdrop-blur-none">
            <h2 className="sr-only lg:not-sr-only lg:mb-3 lg:text-base lg:font-bold">지금 할 일</h2>
            <p className="sr-only" aria-live="polite">
              현재 상태: {statusLabel(deal)}
            </p>
            <ActionPanel
              key={`${deal.id}-${role}-${deal.status}`}
              deal={deal}
              role={role}
              onEditTerms={() => setEditing(true)}
            />
          </div>

          <div className="order-5">
            <PaymentCard deal={deal} role={role} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function NowBox({ deal, role, now }: { deal: Deal; role: Role; now: Date }) {
  const direct = deal.terms.paymentRoute === "direct";
  const amt = formatWon(agreedAmount(deal));
  const last = deal.history.at(-1);
  let msg: string;
  let tone = "border-accent/30 bg-accent-soft";
  const proposerSide = deal.proposedBy;
  switch (deal.status) {
    case "proposed":
      msg =
        role === proposerSide
          ? `상대(${ROLE_LABEL[proposerSide === "worker" ? "client" : "worker"]})의 동의를 기다리고 있습니다. 동의 전에는 조건을 고칠 수 있습니다.`
          : role === "operator"
            ? "양측 동의 전입니다. 운영자가 할 일은 없습니다."
            : `${ROLE_LABEL[proposerSide]}가 보낸 조건을 확인하고 동의해 주세요. 동의하면 계약이 성립하고 조건이 잠깁니다.`;
      break;
    case "awaiting_deposit":
      msg =
        role === "client"
          ? direct
            ? `작업자에게 ${amt}을 직접 송금한 뒤 '작업자에게 송금했어요'를 눌러 주세요.`
            : `운영자 확인 계좌로 ${amt}을 이체한 뒤 '이체했어요'를 눌러 주세요.`
          : direct
            ? "의뢰인의 직접 송금을 기다리고 있습니다."
            : "의뢰인이 운영자 확인 계좌로 입금하기를 기다리고 있습니다.";
      tone = "border-warn/30 bg-warn-soft";
      break;
    case "deposit_reported":
      msg = direct
        ? role === "worker"
          ? "의뢰인이 송금했다고 알렸습니다. 통장을 확인하고 '대금 수령 확인'을 눌러 주세요."
          : "작업자가 송금을 확인하기를 기다리고 있습니다."
        : role === "operator"
          ? "의뢰인이 이체했다고 알렸습니다. 통장에서 입금자명·금액을 확인하고 '입금 확인'을 눌러 주세요."
          : "운영자가 입금을 확인하고 있습니다. 확인되면 작업이 시작됩니다.";
      tone = "border-warn/30 bg-warn-soft";
      break;
    case "in_progress":
      msg =
        role === "worker"
          ? deal.revisionsUsed > 0
            ? `의뢰인이 수정 ${deal.revisionsUsed}회차를 요청했습니다. 반영해서 다시 제출해 주세요.`
            : "입금이 확인됐습니다. 작업을 마치면 납품 파일을 제출해 주세요."
          : "작업자가 작업하고 있습니다.";
      break;
    case "in_review": {
      const left = deal.reviewDeadline ? daysUntil(deal.reviewDeadline, now) : 0;
      const dl = formatDateTime(deal.reviewDeadline);
      msg =
        role === "client"
          ? `납품물을 검수해 주세요. ${dl}까지 응답이 없으면 자동 승인됩니다(남은 기간 ${left}일, 기한 ${AUTO_APPROVE_DAYS}일은 미정·시연값).`
          : `의뢰인이 검수하고 있습니다. ${dl}까지 응답이 없으면 자동 승인됩니다(기한 ${AUTO_APPROVE_DAYS}일은 미정·시연값).`;
      break;
    }
    case "awaiting_payout":
      msg = direct
        ? role === "worker"
          ? "검수가 끝났습니다. 더 받을 대금이 없으면 '정산 완료 확인'을 눌러 주세요."
          : "작업자의 정산 확인을 기다리고 있습니다."
        : role === "operator"
          ? `검수가 끝났습니다. 작업자 ${deal.worker.name}에게 ${amt}을 송금한 뒤 '지급 완료'를 눌러 주세요.`
          : "검수가 끝났습니다. 운영자가 작업자에게 대금을 지급하는 중입니다.";
      tone = "border-warn/30 bg-warn-soft";
      break;
    case "settled":
      msg = "정산까지 끝난 거래입니다.";
      tone = "border-ok/30 bg-ok-soft";
      break;
    case "disputed":
      msg = `운영자가 분쟁을 처리하고 있습니다. ${last?.reason ?? ""}`;
      tone = "border-danger/30 bg-danger-soft";
      break;
    case "cancelled":
      msg = `취소된 거래입니다. ${last?.reason ?? ""}`;
      tone = "border-line bg-line/40";
      break;
  }
  return (
    <div className={`rounded-2xl border p-4 ${tone}`} role="region" aria-label="지금 상황">
      <p className="text-[13px] font-semibold text-ink-2">지금 상황 · {statusLabel(deal)}</p>
      <p className="mt-1 text-[15px] font-semibold leading-snug">{msg}</p>
    </div>
  );
}

function Steps({ deal }: { deal: Deal }) {
  const direct = deal.terms.paymentRoute === "direct";
  const names: Record<DealStatus, string> = {
    proposed: "조건 동의",
    awaiting_deposit: direct ? "의뢰인 송금" : "운영자 계좌 입금",
    deposit_reported: direct ? "작업자 수령 확인" : "운영자 입금 확인",
    in_progress: "작업·수정",
    in_review: "검수",
    awaiting_payout: direct ? "작업자 정산 확인" : "운영자 지급",
    settled: "정산 완료",
    disputed: "분쟁",
    cancelled: "취소",
  };
  let cur: DealStatus = deal.status;
  if (cur === "disputed") cur = deal.statusBeforeDispute ?? "in_progress";
  if (cur === "cancelled") {
    const prev = [...deal.history].reverse().find((h) => h.to !== "cancelled" && h.to !== "disputed");
    cur = prev?.to ?? "proposed";
  }
  const ci = MAIN_FLOW.indexOf(cur);
  return (
    <Card aria-labelledby="steps-t">
      <h2 id="steps-t" className="text-base font-bold">
        진행 단계{" "}
        <span className="text-[13px] font-normal text-ink-2">({PAYMENT_ROUTE_LABEL[deal.terms.paymentRoute]})</span>
      </h2>
      <ol className="mt-3 grid grid-cols-7 gap-1">
        {MAIN_FLOW.map((s, i) => {
          const state = deal.status === "settled" || i < ci ? "done" : i === ci ? "now" : "todo";
          return (
            <li key={s} aria-current={state === "now" ? "step" : undefined} className="text-center">
              <span
                aria-hidden
                className={`mx-auto mb-1 block h-1.5 rounded-full ${
                  state === "done"
                    ? "bg-accent"
                    : state === "now"
                      ? deal.status === "disputed"
                        ? "bg-danger"
                        : deal.status === "cancelled"
                          ? "bg-ink-3"
                          : "bg-accent/50"
                      : "bg-line"
                }`}
              />
              <span
                className={`block text-[11px] leading-tight ${state === "now" ? "font-bold text-ink" : "text-ink-2"}`}
              >
                {names[s]}
                <span className="sr-only">
                  {state === "done" ? " (끝남)" : state === "now" ? " (현재)" : " (남음)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {(deal.status === "disputed" || deal.status === "cancelled") && (
        <p className="mt-2 text-[13px] text-ink-2">
          {deal.status === "disputed" ? "분쟁" : "취소"}이 &lsquo;{names[cur]}&rsquo; 단계에서 일어났습니다.
        </p>
      )}
    </Card>
  );
}

function TermsCard({ deal }: { deal: Deal }) {
  const locked = isTermsLocked(deal);
  const shown = deal.agreement?.snapshot ?? deal.terms;
  const [verify, setVerify] = useState<"" | "ok" | "bad">("");
  return (
    <Card aria-labelledby="terms-t">
      <div className="flex items-center justify-between gap-2">
        <h2 id="terms-t" className="text-base font-bold">
          계약 정보
        </h2>
        {deal.agreement ? (
          <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-on-ink">조건 잠김</span>
        ) : deal.status === "proposed" ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
            동의 전 · 수정 가능
          </span>
        ) : null}
      </div>
      <dl className="mt-3 divide-y divide-line text-[15px]">
        {(
          [
            ["작업 유형", shown.workType],
            ["금액", formatWon(shown.amount)],
            ["최종 납기일", formatDate(shown.deadline)],
            ["수정 가능 횟수", `${shown.revisionLimit}회 (${revisionText(deal)} 사용)`],
            ["납품 파일 형식", shown.fileFormats.join(", ")],
            ["대금 경로", PAYMENT_ROUTE_LABEL[shown.paymentRoute]],
            [
              "제안",
              `${ROLE_LABEL[deal.proposedBy]} (${deal.proposedBy === "worker" ? deal.worker.name : deal.client.name})`,
            ],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="shrink-0 text-ink-2">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {deal.agreement && (
        <div className="mt-3 space-y-2 rounded-xl bg-muted p-3 text-[13px]">
          <p>
            <span className="text-ink-2">계약 성립(양측 동의) </span>
            <strong>{formatDateTime(deal.agreement.agreedAt)}</strong>
            <span className="text-ink-2"> · 동의한 사람 {deal.agreement.agreedBy.name}</span>
          </p>
          <p className="break-all">
            <span className="text-ink-2">조건 스냅샷 SHA-256 </span>
            <code className="font-mono text-[12px]">{deal.agreement.hash}</code>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-line bg-card px-2.5 py-1.5 font-semibold"
              onClick={async () => {
                const h = await hashTerms(deal.agreement!.snapshot);
                setVerify(h === deal.agreement!.hash ? "ok" : "bad");
              }}
            >
              해시 다시 계산해 대조
            </button>
            <span role="status" className={verify === "bad" ? "font-semibold text-danger" : "font-semibold text-ok"}>
              {verify === "ok" && "일치: 동의한 조건 그대로입니다."}
              {verify === "bad" && "불일치: 조건이 바뀌었습니다."}
            </span>
          </div>
          <p className="text-ink-2">
            PDF 사본 양측 발송: <strong className="text-ink">발송됨으로 표시(모의, 실제 발송 없음)</strong> ·{" "}
            <Link
              href={`/deal/print/?id=${encodeURIComponent(deal.id)}`}
              className="font-semibold text-accent underline"
            >
              인쇄용 계약 요약 보기
            </Link>
          </p>
        </div>
      )}
      {!locked && (
        <p className="mt-3 text-[13px] text-ink-2">상대가 동의하면 이 조건이 잠기고, 그 뒤에는 고칠 수 없습니다.</p>
      )}
    </Card>
  );
}

function PaymentCard({ deal, role }: { deal: Deal; role: Role }) {
  if (deal.status === "proposed") return null;
  const direct = deal.terms.paymentRoute === "direct";
  const rule = depositorNameRule(deal.client.name, deal.id);
  const showAccount = !direct && (deal.status === "awaiting_deposit" || deal.status === "deposit_reported");
  return (
    <Card aria-labelledby="pay-t">
      <h2 id="pay-t" className="text-base font-bold">
        대금{" "}
        <span className="text-[13px] font-normal text-ink-2">· {PAYMENT_ROUTE_LABEL[deal.terms.paymentRoute]}</span>
      </h2>
      {showAccount && (role === "client" || role === "operator") && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm">
          <p className="font-semibold">운영자 확인 계좌로 입금</p>
          <p className="mt-1 text-[15px] font-bold">
            {OPERATOR_ACCOUNT.bank} {OPERATOR_ACCOUNT.number} {OPERATOR_ACCOUNT.holder}
          </p>
          <p className="mt-1">
            금액 <strong>{formatWon(agreedAmount(deal))}</strong> · 입금자명 <strong>{rule}</strong>
          </p>
          <p className="mt-1 text-[13px] text-ink-2">
            입금자명 규칙: 의뢰인 이름 + 거래번호 끝 4자리. 운영자가 이 이름으로 입금을 찾습니다. (시연용 가짜 계좌)
          </p>
        </div>
      )}
      {direct && (deal.status === "awaiting_deposit" || deal.status === "deposit_reported") && (
        <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
          의뢰인이 작업자에게 직접 송금합니다. 작업자 계좌는 CoV가 받지 않으며(MVP 범위 밖), 양측이 따로 주고받습니다.
        </p>
      )}
      <dl className="mt-3 space-y-1 text-[13px]">
        <Row
          k={direct ? "송금 알림" : "이체 알림"}
          v={
            deal.deposit?.reportedAt
              ? `${formatDateTime(deal.deposit.reportedAt)} (입금자명 ${deal.deposit.reportedDepositorName})`
              : "-"
          }
        />
        <Row
          k={direct ? "작업자 수령 확인" : "운영자 입금 확인"}
          v={
            deal.deposit?.confirmedAt
              ? `${formatDateTime(deal.deposit.confirmedAt)} · 확인자 ${deal.deposit.confirmedBy}`
              : "-"
          }
        />
        <Row
          k={direct ? "정산 확인" : "운영자 지급"}
          v={deal.payout ? `${formatDateTime(deal.payout.paidAt)} · ${deal.payout.paidBy}` : "-"}
        />
      </dl>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-ink-2">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function DeliveryTimeline({ deal }: { deal: Deal }) {
  type Item = { at: string; title: string; body?: string; kind: "submit" | "revision" | "approve" };
  const items: Item[] = [
    ...deal.deliveries.map<Item>((d) => ({
      at: d.submittedAt,
      kind: "submit",
      title: d.round === 0 ? "납품 제출" : `수정 ${d.round}회차 반영본 제출`,
      body: `${d.fileNames.join(", ")}${d.note ? ` — "${d.note}"` : ""}`,
    })),
    ...deal.reviews.map<Item>((r, i) => ({
      at: r.at,
      kind: r.decision === "revision_requested" ? "revision" : "approve",
      title:
        r.decision === "revision_requested"
          ? `수정 요청 ${deal.reviews.slice(0, i + 1).filter((x) => x.decision === "revision_requested").length}/${deal.terms.revisionLimit}`
          : r.decision === "auto_approved"
            ? "무응답 자동 승인"
            : "검수 승인",
      body: r.note,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Card aria-labelledby="dl-t">
      <h2 id="dl-t" className="text-base font-bold">
        제출·수정 요청 <span className="text-[13px] font-normal text-ink-2">({revisionText(deal)})</span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">아직 납품이 없습니다.</p>
      ) : (
        <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
          {items.map((it, i) => (
            <li key={i} className="relative">
              <span
                aria-hidden
                className={`absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-card ${
                  it.kind === "revision" ? "bg-warn" : it.kind === "approve" ? "bg-ok" : "bg-accent"
                }`}
              />
              <p className="text-sm font-bold">{it.title}</p>
              <p className="text-[12px] text-ink-2">{formatDateTime(it.at)}</p>
              {it.body && <p className="mt-0.5 text-sm">{it.body}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function HistoryList({ deal }: { deal: Deal }) {
  return (
    <Card aria-labelledby="hist-t">
      <details>
        <summary className="cursor-pointer text-base font-bold">
          <span id="hist-t">상태 이력</span>{" "}
          <span className="text-[13px] font-normal text-ink-2">({deal.history.length}건 · 누가·언제·왜)</span>
        </summary>
        <ol className="mt-3 space-y-3">
          {[...deal.history].reverse().map((h, i) => (
            <li key={i} className="rounded-xl bg-muted p-3 text-[13px]">
              <p className="font-semibold">
                {h.from ? `${STATUS_NAME(h.from, deal)} → ` : ""}
                {STATUS_NAME(h.to, deal)}
                <span className="ml-1 font-normal text-ink-2">
                  · {h.action === "create" ? "초안 작성" : (ACTION_LABEL[h.action as ActionType] ?? h.action)}
                </span>
              </p>
              <p className="text-ink-2">
                {formatDateTime(h.at)} · {ROLE_LABEL[h.actor.role]} {h.actor.name}
              </p>
              {h.reason && <p className="mt-0.5">{h.reason}</p>}
            </li>
          ))}
        </ol>
      </details>
    </Card>
  );
}

function STATUS_NAME(s: DealStatus, deal: Deal): string {
  return statusLabel({ status: s, terms: deal.terms });
}
