"use client";

import { useId, useState } from "react";
import { btnDanger, btnPrimary, btnSecondary, inputCls } from "@/components/bits";
import { ACTION_LABEL, AUTO_APPROVE_DAYS, availableActions, revisionsLeft, type ActionType } from "@/lib/deal-machine";
import { formatWon } from "@/lib/format";
import { hashTerms } from "@/lib/hash";
import { depositorNameRule } from "@/lib/personas";
import { act, demoNow } from "@/lib/store";
import { agreedAmount } from "@/lib/stats";
import type { Deal, Role } from "@/lib/types";

/** 역할·경로에 맞춘 버튼 이름 */
function buttonLabel(a: ActionType, deal: Deal): string {
  const direct = deal.terms.paymentRoute === "direct";
  switch (a) {
    case "report_deposit":
      return direct ? "작업자에게 송금했어요" : "이체했어요";
    case "confirm_deposit":
      return "입금 확인";
    case "confirm_received":
      return "대금 수령 확인";
    case "confirm_payout":
      return "송금했어요 · 지급 완료";
    case "confirm_settlement":
      return "정산 완료 확인";
    case "agree":
      return "조건에 동의하기";
    case "approve":
      return "검수 승인";
    case "submit_delivery":
      return deal.revisionsUsed > 0 ? `수정 ${deal.revisionsUsed}회차 반영본 제출` : "납품 제출";
    default:
      return ACTION_LABEL[a];
  }
}

const SECONDARY: ActionType[] = ["decline", "withdraw", "open_dispute", "cancel", "request_revision", "edit_terms"];
const DANGER: ActionType[] = ["decline", "withdraw", "cancel", "open_dispute"];

export default function ActionPanel({
  deal,
  role,
  onEditTerms,
}: {
  deal: Deal;
  role: Role;
  onEditTerms: () => void;
}) {
  const actions = availableActions(deal, role, demoNow()).filter((a) => a !== "auto_approve");
  const [open, setOpen] = useState<ActionType | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  if (actions.length === 0) {
    return (
      <p className="text-center text-[13px] text-ink-2">
        {role === "operator" && deal.terms.paymentRoute === "direct" && !["settled", "cancelled"].includes(deal.status)
          ? "직접 송금 거래입니다. 운영자는 양측 확인 기록만 봅니다."
          : "지금 이 역할이 할 일은 없습니다. 위에서 역할을 바꿔 보세요."}
        {done && (
          <span role="status" className="mt-1 block font-semibold text-ok">
            {done}
          </span>
        )}
      </p>
    );
  }

  const primary = actions.filter((a) => !SECONDARY.includes(a) || a === "request_revision");
  const others = actions.filter((a) => !primary.includes(a));

  function finish(r: { ok: true } | { ok: false; message: string }, label: string) {
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError("");
    setOpen(null);
    setDone(`${label} 처리했습니다.`);
  }

  if (open) {
    return (
      <ActionForm
        key={open}
        action={open}
        deal={deal}
        error={error}
        onCancel={() => {
          setOpen(null);
          setError("");
        }}
        onDone={finish}
      />
    );
  }

  return (
    <div className="space-y-2">
      {done && (
        <p role="status" className="text-center text-[13px] font-semibold text-ok">
          {done}
        </p>
      )}
      <div className="flex gap-2">
        {primary.map((a, i) => (
          <button
            key={a}
            type="button"
            className={`${i === 0 && a !== "request_revision" ? btnPrimary : btnSecondary} flex-1`}
            onClick={() => {
              setDone("");
              setOpen(a);
            }}
          >
            {buttonLabel(a, deal)}
          </button>
        ))}
      </div>
      {others.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {others.map((a) => (
            <button
              key={a}
              type="button"
              className={`${DANGER.includes(a) ? btnDanger : btnSecondary} min-h-9 px-3 py-1.5 text-[13px]`}
              onClick={() => {
                setDone("");
                if (a === "edit_terms") onEditTerms();
                else setOpen(a);
              }}
            >
              {buttonLabel(a, deal)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionForm({
  action,
  deal,
  error,
  onCancel,
  onDone,
}: {
  action: ActionType;
  deal: Deal;
  error: string;
  onCancel: () => void;
  onDone: (r: { ok: true } | { ok: false; message: string }, label: string) => void;
}) {
  const uid = useId();
  const [text, setText] = useState(
    action === "report_deposit" ? depositorNameRule(deal.client.name, deal.id) : "",
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = buttonLabel(action, deal);
  const left = revisionsLeft(deal);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      switch (action) {
        case "agree": {
          const hash = await hashTerms(deal.terms);
          onDone(act(deal.id, { type: "agree", hash }), "조건 동의(계약 성립)");
          break;
        }
        case "decline":
        case "withdraw":
        case "open_dispute":
        case "resolve_dispute":
        case "cancel":
          onDone(act(deal.id, { type: action, reason: text }), ACTION_LABEL[action]);
          break;
        case "report_deposit":
          onDone(act(deal.id, { type: "report_deposit", depositorName: text }), "이체 완료 알림");
          break;
        case "confirm_deposit": {
          const n = Number(amount.replace(/[^0-9]/g, ""));
          onDone(act(deal.id, { type: "confirm_deposit", depositorName: text, amount: n }), "입금 확인");
          break;
        }
        case "submit_delivery":
          onDone(
            act(deal.id, {
              type: "submit_delivery",
              fileNames: text.split(/[\n,]/),
              note,
            }),
            "납품 제출",
          );
          break;
        case "request_revision":
          onDone(act(deal.id, { type: "request_revision", note: text }), "수정 요청");
          break;
        case "approve":
        case "confirm_received":
        case "confirm_payout":
        case "confirm_settlement":
          onDone(act(deal.id, { type: action }), ACTION_LABEL[action]);
          break;
        default:
          break;
      }
    } finally {
      setBusy(false);
    }
  }

  const reasonLabel: Partial<Record<ActionType, string>> = {
    decline: "거절 사유",
    withdraw: "철회 사유",
    open_dispute: "분쟁 사유(무엇이, 누구와, 어떻게)",
    resolve_dispute: "해소 내용(합의한 내용)",
    cancel: "취소 사유",
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-labelledby={`${uid}-t`}>
      <h2 id={`${uid}-t`} className="text-base font-bold">
        {label}
      </h2>

      {action === "agree" && (
        <>
          <p className="text-sm text-ink-2">
            동의하면 계약이 성립하고, 지금 조건의 사본(스냅샷)과 해시값이 동의 시각과 함께 기록됩니다.
            <strong className="text-ink"> 성립 뒤에는 누구도 조건을 고칠 수 없습니다.</strong>
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[#2B4FD8]"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            금액 {formatWon(deal.terms.amount)}, 납기, 수정 {deal.terms.revisionLimit}회, 작업 범위, 대금 경로를 모두 확인했습니다.
          </label>
        </>
      )}

      {reasonLabel[action] && (
        <div>
          <label htmlFor={`${uid}-r`} className="mb-1 block text-sm font-semibold">
            {reasonLabel[action]} <span className="text-danger">(필수)</span>
          </label>
          <textarea id={`${uid}-r`} className={`${inputCls} min-h-20`} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-1 text-[13px] text-ink-2">상태 이력에 누가·언제와 함께 남습니다.</p>
        </div>
      )}

      {action === "report_deposit" && (
        <div>
          <label htmlFor={`${uid}-d`} className="mb-1 block text-sm font-semibold">
            보낸 사람 이름(입금자명)
          </label>
          <input id={`${uid}-d`} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-1 text-[13px] text-ink-2">
            {deal.terms.paymentRoute === "operator"
              ? "운영자가 통장에서 이 이름으로 입금을 찾습니다. 실제로 이체한 뒤에 눌러 주세요."
              : "작업자가 통장에서 이 이름으로 송금을 확인합니다."}
          </p>
        </div>
      )}

      {action === "confirm_deposit" && (
        <>
          <p className="rounded-xl bg-accent-soft p-3 text-sm">
            계약 금액 <strong>{formatWon(agreedAmount(deal))}</strong> · 의뢰인이 알린 입금자명{" "}
            <strong>{deal.deposit?.reportedDepositorName ?? "-"}</strong>
          </p>
          <div>
            <label htmlFor={`${uid}-n`} className="mb-1 block text-sm font-semibold">
              통장에 찍힌 입금자명
            </label>
            <input id={`${uid}-n`} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${uid}-a`} className="mb-1 block text-sm font-semibold">
              통장에 찍힌 입금액(원)
            </label>
            <input
              id={`${uid}-a`}
              className={inputCls}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="통장을 보고 직접 입력"
            />
            <p className="mt-1 text-[13px] text-ink-2">계약 금액과 다르면 확인이 막힙니다. 확인자로 운영자 이름이 기록됩니다.</p>
          </div>
        </>
      )}

      {action === "submit_delivery" && (
        <>
          <div>
            <label htmlFor={`${uid}-f`} className="mb-1 block text-sm font-semibold">
              납품 파일 이름(쉼표나 줄바꿈으로 구분)
            </label>
            <textarea
              id={`${uid}-f`}
              className={`${inputCls} min-h-16`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`예: final_v${deal.revisionsUsed + 1}.wav`}
            />
            <p className="mt-1 text-[13px] text-ink-2">
              시연판은 파일을 올리지 않고 이름만 기록합니다. 약속한 형식: {deal.terms.fileFormats.join(", ")}
            </p>
          </div>
          <div>
            <label htmlFor={`${uid}-m`} className="mb-1 block text-sm font-semibold">
              전할 말(선택)
            </label>
            <input id={`${uid}-m`} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="text-[13px] text-ink-2">
            제출하면 의뢰인 검수가 시작되고, {AUTO_APPROVE_DAYS}일 안에 응답이 없으면 자동 승인됩니다(기한 미정, 시연값).
          </p>
        </>
      )}

      {action === "request_revision" && (
        <>
          <p
            className={`rounded-xl p-3 text-sm ${left > 0 ? "bg-accent-soft" : "bg-warn-soft text-warn"}`}
          >
            {left > 0 ? (
              <>
                이번 요청은 <strong>수정 {deal.revisionsUsed + 1}/{deal.terms.revisionLimit}</strong>회차로 차감됩니다.
                (남은 수정 {left}회)
              </>
            ) : (
              <>
                약속한 수정 {deal.terms.revisionLimit}회를 모두 썼습니다. <strong>추가 단가 협의 필요 — 산정식 미정.</strong>
                {" "}요청을 보내면 막히는 것을 확인할 수 있습니다.
              </>
            )}
          </p>
          <div>
            <label htmlFor={`${uid}-q`} className="mb-1 block text-sm font-semibold">
              수정할 내용 <span className="text-danger">(필수)</span>
            </label>
            <textarea id={`${uid}-q`} className={`${inputCls} min-h-20`} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </>
      )}

      {action === "approve" && (
        <p className="text-sm text-ink-2">
          승인하면 검수가 끝나고{" "}
          {deal.terms.paymentRoute === "operator"
            ? "운영자가 작업자에게 대금을 지급하는 단계로 넘어갑니다."
            : "작업자의 정산 확인 단계로 넘어갑니다."}
        </p>
      )}
      {action === "confirm_received" && (
        <p className="text-sm text-ink-2">
          통장에서 의뢰인의 송금({formatWon(agreedAmount(deal))}, 입금자명 {deal.deposit?.reportedDepositorName ?? "-"})을 확인했을 때만 눌러 주세요.
        </p>
      )}
      {action === "confirm_payout" && (
        <p className="text-sm text-ink-2">
          작업자 {deal.worker.name}에게 {formatWon(agreedAmount(deal))}을 실제로 송금한 뒤에 눌러 주세요. 처리자와 시각이 대금 장부에 남습니다.
        </p>
      )}
      {action === "confirm_settlement" && (
        <p className="text-sm text-ink-2">직접 송금으로 받은 대금 외에 더 받을 금액이 없으면 눌러 주세요. 거래가 정산 완료로 닫힙니다.</p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" className={`${btnSecondary} flex-1`} onClick={onCancel}>
          닫기
        </button>
        <button
          type="submit"
          className={`${DANGER.includes(action) ? btnDanger : btnPrimary} flex-[2]`}
          disabled={busy || (action === "agree" && !checked)}
        >
          {label}
        </button>
      </div>
    </form>
  );
}
