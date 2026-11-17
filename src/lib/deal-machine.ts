/**
 * 거래 상태 전이 규칙. 이 파일 한 곳에만 둔다.
 *
 * 화면은 `createDeal`, `transition`, `availableActions`만 부른다.
 * 실제 서비스에서는 같은 규칙이 서버(cov-backend)와 DB(cov-data)에 있어야 하며,
 * 화면에서 버튼을 숨기는 것만으로는 권한을 지킨다고 보지 않는다.
 * 이 시연판은 서버가 없어서 이 파일이 "서버 역할"을 흉내 낸다.
 */
import type {
  Actor,
  ActorRole,
  Deal,
  DealStatus,
  HistoryEntry,
  Party,
  Terms,
} from "./types";
import { FILE_FORMATS, WORK_TYPES } from "./types";

/** 검수 무응답 자동 승인 기한. 실제 값은 미정이며 시연값으로 7일을 쓴다. */
export const AUTO_APPROVE_DAYS = 7;
export const AUTO_APPROVE_IS_UNDECIDED = true;

export const MAX_REVISION_LIMIT = 10;

/** 작업 유형 "기타"의 작업 내용 글자 수 한도(앞뒤 공백 제외) */
export const WORK_TYPE_DETAIL_MAX = 30;

export const STATUS_LABEL: Record<DealStatus, string> = {
  proposed: "조건 동의 대기",
  awaiting_deposit: "입금 대기",
  deposit_reported: "입금 확인 대기",
  in_progress: "작업 중",
  in_review: "검수 중",
  awaiting_payout: "지급 대기",
  settled: "정산 완료",
  disputed: "분쟁 처리 중",
  cancelled: "취소됨",
};

/** 직접 송금 경로에서는 같은 상태라도 이름이 다르다. */
export function statusLabel(deal: Pick<Deal, "status" | "terms">): string {
  if (deal.terms.paymentRoute === "direct") {
    if (deal.status === "awaiting_deposit") return "송금 대기";
    if (deal.status === "deposit_reported") return "수령 확인 대기";
    if (deal.status === "awaiting_payout") return "정산 확인 대기";
  }
  return STATUS_LABEL[deal.status];
}

export const TERMINAL: DealStatus[] = ["settled", "cancelled"];

/** 진행 막대·타임라인용 정상 흐름 순서 */
export const MAIN_FLOW: DealStatus[] = [
  "proposed",
  "awaiting_deposit",
  "deposit_reported",
  "in_progress",
  "in_review",
  "awaiting_payout",
  "settled",
];

export type Action =
  | { type: "edit_terms"; terms: Terms }
  | { type: "agree"; hash: string }
  | { type: "decline"; reason: string }
  | { type: "withdraw"; reason: string }
  | { type: "report_deposit"; depositorName: string }
  | { type: "confirm_deposit"; depositorName: string; amount: number }
  | { type: "confirm_received" }
  | { type: "submit_delivery"; fileNames: string[]; note?: string }
  | { type: "approve"; note?: string }
  | { type: "request_revision"; note: string }
  | { type: "auto_approve" }
  | { type: "confirm_payout" }
  | { type: "confirm_settlement" }
  | { type: "open_dispute"; reason: string }
  | { type: "resolve_dispute"; reason: string }
  | { type: "cancel"; reason: string };

export type ActionType = Action["type"];

export const ACTION_LABEL: Record<ActionType, string> = {
  edit_terms: "조건 수정",
  agree: "조건 동의",
  decline: "조건 거절",
  withdraw: "제안 철회",
  report_deposit: "이체 완료 알림",
  confirm_deposit: "입금 확인",
  confirm_received: "대금 수령 확인",
  submit_delivery: "납품 제출",
  approve: "검수 승인",
  request_revision: "수정 요청",
  auto_approve: "무응답 자동 승인",
  confirm_payout: "지급 완료",
  confirm_settlement: "정산 확인",
  open_dispute: "분쟁 접수",
  resolve_dispute: "분쟁 해소",
  cancel: "거래 취소",
};

export type ErrorCode =
  | "INVALID_TERMS"
  | "NOT_ALLOWED_IN_STATUS"
  | "WRONG_ROLE"
  | "WRONG_ROUTE"
  | "TERMS_LOCKED"
  | "REVISION_LIMIT_EXCEEDED"
  | "AMOUNT_MISMATCH"
  | "REVIEW_DEADLINE_NOT_REACHED"
  | "REASON_REQUIRED"
  | "MISSING_INPUT";

export type Result =
  | { ok: true; deal: Deal }
  | { ok: false; code: ErrorCode; message: string };

function fail(code: ErrorCode, message: string): Result {
  return { ok: false, code, message };
}

// ---------------------------------------------------------------------------
// 조건 검사
// ---------------------------------------------------------------------------

export function validateTerms(t: Terms): string[] {
  const errors: string[] = [];
  if (!t.title || !t.title.trim()) errors.push("프로젝트 제목을 적어 주세요.");
  if (!WORK_TYPES.includes(t.workType)) errors.push("작업 유형을 골라 주세요.");
  if (t.workType === "기타") {
    const detail = typeof t.workTypeDetail === "string" ? t.workTypeDetail.trim() : "";
    if (!detail) errors.push("작업 유형이 기타이면 작업 내용을 적어 주세요.");
    else if (detail.length > WORK_TYPE_DETAIL_MAX)
      errors.push(`기타 작업 유형의 내용은 ${WORK_TYPE_DETAIL_MAX}자 이내로 적어 주세요.`);
  }
  if (!Number.isInteger(t.amount) || t.amount <= 0)
    errors.push("금액은 1원 이상의 정수로 적어 주세요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.deadline) || Number.isNaN(Date.parse(t.deadline)))
    errors.push("최종 납기일을 골라 주세요.");
  if (
    !Number.isInteger(t.revisionLimit) ||
    t.revisionLimit < 0 ||
    t.revisionLimit > MAX_REVISION_LIMIT
  )
    errors.push(`수정 가능 횟수는 0~${MAX_REVISION_LIMIT}회 사이로 정해 주세요.`);
  if (!Array.isArray(t.fileFormats) || t.fileFormats.length === 0)
    errors.push("납품 파일 형식을 하나 이상 골라 주세요.");
  else if (t.fileFormats.some((f) => !(FILE_FORMATS as readonly string[]).includes(f)))
    errors.push("알 수 없는 파일 형식이 있습니다.");
  if (!t.scope || !t.scope.trim()) errors.push("작업 범위를 적어 주세요.");
  if (t.paymentRoute !== "operator" && t.paymentRoute !== "direct")
    errors.push("대금 경로를 골라 주세요.");
  return errors;
}

function normalizeTerms(t: Terms): Terms {
  return {
    title: t.title.trim(),
    workType: t.workType,
    // "기타"이고 내용이 있을 때만 키를 둔다(없으면 해시 입력에서 빠져 기존 해시와 같다)
    ...(t.workType === "기타" && typeof t.workTypeDetail === "string" && t.workTypeDetail.trim()
      ? { workTypeDetail: t.workTypeDetail.trim() }
      : {}),
    amount: t.amount,
    deadline: t.deadline,
    revisionLimit: t.revisionLimit,
    fileFormats: [...t.fileFormats],
    scope: t.scope.trim(),
    paymentRoute: t.paymentRoute,
  };
}

// ---------------------------------------------------------------------------
// 생성
// ---------------------------------------------------------------------------

export interface CreateInput {
  id: string;
  terms: Terms;
  worker: Party;
  client: Party;
  proposer: Actor; // role은 worker 또는 client
}

export function createDeal(input: CreateInput, now: Date): Result {
  const { proposer } = input;
  if (proposer.role !== "worker" && proposer.role !== "client")
    return fail("WRONG_ROLE", "계약 초안은 작업자나 의뢰인만 만들 수 있습니다.");
  const errors = validateTerms(input.terms);
  if (errors.length) return fail("INVALID_TERMS", errors.join(" "));
  const at = now.toISOString();
  const deal: Deal = {
    id: input.id,
    createdAt: at,
    terms: normalizeTerms(input.terms),
    worker: { ...input.worker },
    client: { ...input.client },
    proposedBy: proposer.role,
    status: "proposed",
    revisionsUsed: 0,
    deliveries: [],
    reviews: [],
    history: [
      {
        at,
        action: "create",
        from: null,
        to: "proposed",
        actor: proposer,
        reason: "계약 초안 작성, 상대방에게 조건 확인 요청",
      },
    ],
  };
  return { ok: true, deal };
}

// ---------------------------------------------------------------------------
// 누가 무엇을 할 수 있나
// ---------------------------------------------------------------------------

function counterpartyOf(deal: Deal): "worker" | "client" {
  return deal.proposedBy === "worker" ? "client" : "worker";
}

/** 지금 이 역할이 누를 수 있는 동작. 화면은 버튼을 보여 줄지 정할 때만 쓴다. */
export function availableActions(deal: Deal, role: ActorRole, now?: Date): ActionType[] {
  const s = deal.status;
  const route = deal.terms.paymentRoute;
  const out: ActionType[] = [];
  if (s === "proposed") {
    if (role === deal.proposedBy) out.push("edit_terms", "withdraw");
    if (role === counterpartyOf(deal)) out.push("agree", "decline");
  }
  if (s === "awaiting_deposit" && role === "client") out.push("report_deposit");
  if (s === "deposit_reported") {
    if (route === "operator" && role === "operator") out.push("confirm_deposit");
    if (route === "direct" && role === "worker") out.push("confirm_received");
  }
  if (s === "in_progress" && role === "worker") out.push("submit_delivery");
  if (s === "in_review") {
    if (role === "client") out.push("approve", "request_revision");
    if (role === "system" && now && deal.reviewDeadline && now >= new Date(deal.reviewDeadline))
      out.push("auto_approve");
  }
  if (s === "awaiting_payout") {
    if (route === "operator" && role === "operator") out.push("confirm_payout");
    if (route === "direct" && role === "worker") out.push("confirm_settlement");
  }
  if (role === "operator") {
    if (DISPUTABLE.includes(s)) out.push("open_dispute");
    if (s === "disputed") out.push("resolve_dispute");
    if (!TERMINAL.includes(s)) out.push("cancel");
  }
  return out;
}

const DISPUTABLE: DealStatus[] = [
  "awaiting_deposit",
  "deposit_reported",
  "in_progress",
  "in_review",
  "awaiting_payout",
];

/** 계약 성립(양측 동의) 뒤에는 조건을 바꿀 수 없다. */
export function isTermsLocked(deal: Deal): boolean {
  return deal.agreement !== undefined || deal.status !== "proposed";
}

export function revisionsLeft(deal: Deal): number {
  return Math.max(0, deal.terms.revisionLimit - deal.revisionsUsed);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// 전이
// ---------------------------------------------------------------------------

function move(
  deal: Deal,
  to: DealStatus,
  action: ActionType,
  actor: Actor,
  now: Date,
  reason?: string,
): Deal {
  const entry: HistoryEntry = {
    at: now.toISOString(),
    action,
    from: deal.status,
    to,
    actor,
    reason,
  };
  return { ...deal, status: to, history: [...deal.history, entry] };
}

function needReason(r: string | undefined): r is string {
  return typeof r === "string" && r.trim().length > 0;
}

/**
 * 거래에 동작 하나를 적용한다. 원본은 바꾸지 않고 새 거래를 돌려준다.
 * 허용되지 않은 동작이면 ok:false와 이유를 돌려준다.
 */
export function transition(deal: Deal, action: Action, actor: Actor, now: Date): Result {
  // 조건 수정은 잠금 여부를 먼저 본다(성립 후 수정 차단).
  if (action.type === "edit_terms" && isTermsLocked(deal)) {
    return fail("TERMS_LOCKED", "계약이 성립된 뒤에는 조건을 고칠 수 없습니다.");
  }

  const allowed = availableActions(deal, actor.role, now);
  if (!allowed.includes(action.type)) {
    // 상태는 맞는데 역할이 틀린 경우와, 지금 상태에서 아예 불가능한 경우를 구분한다.
    const anyRole = (["worker", "client", "operator", "system"] as ActorRole[]).some((r) =>
      availableActions(deal, r, now).includes(action.type),
    );
    if (action.type === "auto_approve" && deal.status === "in_review") {
      return fail(
        "REVIEW_DEADLINE_NOT_REACHED",
        "검수 기한이 아직 지나지 않아 자동 승인할 수 없습니다.",
      );
    }
    if (anyRole) {
      return fail(
        "WRONG_ROLE",
        `${statusLabel(deal)} 상태에서 '${ACTION_LABEL[action.type]}'은(는) 이 역할이 할 수 없습니다.`,
      );
    }
    const routeOnly =
      (action.type === "confirm_deposit" || action.type === "confirm_payout") &&
      deal.terms.paymentRoute === "direct";
    const routeOnly2 =
      (action.type === "confirm_received" || action.type === "confirm_settlement") &&
      deal.terms.paymentRoute === "operator";
    if (routeOnly || routeOnly2) {
      return fail("WRONG_ROUTE", "이 거래의 대금 경로에서는 쓰지 않는 단계입니다.");
    }
    return fail(
      "NOT_ALLOWED_IN_STATUS",
      `${statusLabel(deal)} 상태에서는 '${ACTION_LABEL[action.type]}'을(를) 할 수 없습니다.`,
    );
  }

  const at = now.toISOString();

  switch (action.type) {
    case "edit_terms": {
      const errors = validateTerms(action.terms);
      if (errors.length) return fail("INVALID_TERMS", errors.join(" "));
      const next = move(deal, "proposed", action.type, actor, now, "동의 전 조건 수정");
      return { ok: true, deal: { ...next, terms: normalizeTerms(action.terms) } };
    }
    case "agree": {
      if (!/^[0-9a-f]{64}$/.test(action.hash))
        return fail("MISSING_INPUT", "조건 스냅샷의 해시값이 없습니다.");
      const to: DealStatus = "awaiting_deposit";
      const next = move(
        deal,
        to,
        action.type,
        actor,
        now,
        "양측 동의로 계약 성립. 조건 스냅샷과 해시 기록, 조건 잠금",
      );
      return {
        ok: true,
        deal: {
          ...next,
          agreement: {
            snapshot: structuredClone(deal.terms),
            hash: action.hash,
            agreedAt: at,
            agreedBy: actor,
          },
        },
      };
    }
    case "decline":
    case "withdraw": {
      if (!needReason(action.reason)) return fail("REASON_REQUIRED", "사유를 적어 주세요.");
      return { ok: true, deal: move(deal, "cancelled", action.type, actor, now, action.reason.trim()) };
    }
    case "report_deposit": {
      if (!needReason(action.depositorName))
        return fail("MISSING_INPUT", "입금자명을 적어 주세요.");
      const why =
        deal.terms.paymentRoute === "operator"
          ? `의뢰인이 운영자 확인 계좌로 이체했다고 알림 (입금자명: ${action.depositorName.trim()})`
          : `의뢰인이 작업자에게 직접 송금했다고 알림 (입금자명: ${action.depositorName.trim()})`;
      const next = move(deal, "deposit_reported", action.type, actor, now, why);
      return {
        ok: true,
        deal: {
          ...next,
          deposit: { reportedAt: at, reportedDepositorName: action.depositorName.trim() },
        },
      };
    }
    case "confirm_deposit": {
      if (!needReason(action.depositorName))
        return fail("MISSING_INPUT", "통장에 찍힌 입금자명을 적어 주세요.");
      const agreed = deal.agreement?.snapshot.amount ?? deal.terms.amount;
      if (action.amount !== agreed)
        return fail(
          "AMOUNT_MISMATCH",
          `입금액이 계약 금액과 다릅니다. 확인한 금액과 계약 금액을 다시 대조해 주세요.`,
        );
      const next = move(
        deal,
        "in_progress",
        action.type,
        actor,
        now,
        `운영자가 입금 확인 (입금자명: ${action.depositorName.trim()}, 확인자: ${actor.name})`,
      );
      return {
        ok: true,
        deal: {
          ...next,
          deposit: {
            ...deal.deposit,
            confirmedAt: at,
            confirmedBy: actor.name,
            depositorName: action.depositorName.trim(),
            amount: action.amount,
          },
        },
      };
    }
    case "confirm_received": {
      const next = move(deal, "in_progress", action.type, actor, now, "작업자가 직접 송금 수령 확인");
      return {
        ok: true,
        deal: {
          ...next,
          deposit: {
            ...deal.deposit,
            confirmedAt: at,
            confirmedBy: actor.name,
            depositorName: deal.deposit?.reportedDepositorName,
            amount: deal.agreement?.snapshot.amount ?? deal.terms.amount,
          },
        },
      };
    }
    case "submit_delivery": {
      const files = action.fileNames.map((f) => f.trim()).filter(Boolean);
      if (files.length === 0) return fail("MISSING_INPUT", "납품 파일 이름을 하나 이상 적어 주세요.");
      const round = deal.revisionsUsed;
      const deadline = addDays(now, AUTO_APPROVE_DAYS).toISOString();
      const why =
        round === 0 ? "첫 납품 제출, 검수 요청" : `수정 ${round}회차 반영본 제출, 검수 요청`;
      const next = move(deal, "in_review", action.type, actor, now, why);
      return {
        ok: true,
        deal: {
          ...next,
          reviewDeadline: deadline,
          deliveries: [
            ...deal.deliveries,
            { round, fileNames: files, note: action.note?.trim() || undefined, submittedAt: at },
          ],
        },
      };
    }
    case "approve": {
      const next = move(deal, "awaiting_payout", action.type, actor, now, "의뢰인 검수 승인");
      return {
        ok: true,
        deal: {
          ...next,
          reviewDeadline: undefined,
          reviews: [
            ...deal.reviews,
            { round: deal.revisionsUsed, decision: "approved", note: action.note, at },
          ],
        },
      };
    }
    case "request_revision": {
      if (!needReason(action.note)) return fail("REASON_REQUIRED", "수정할 내용을 적어 주세요.");
      if (deal.revisionsUsed >= deal.terms.revisionLimit) {
        return fail(
          "REVISION_LIMIT_EXCEEDED",
          `약속한 수정 ${deal.terms.revisionLimit}회를 모두 썼습니다. 추가 수정은 추가 단가 협의가 필요합니다(산정식 미정).`,
        );
      }
      const used = deal.revisionsUsed + 1;
      const next = move(
        deal,
        "in_progress",
        action.type,
        actor,
        now,
        `수정 요청 ${used}/${deal.terms.revisionLimit}: ${action.note.trim()}`,
      );
      return {
        ok: true,
        deal: {
          ...next,
          revisionsUsed: used,
          reviewDeadline: undefined,
          reviews: [
            ...deal.reviews,
            { round: deal.revisionsUsed, decision: "revision_requested", note: action.note.trim(), at },
          ],
        },
      };
    }
    case "auto_approve": {
      const next = move(
        deal,
        "awaiting_payout",
        action.type,
        actor,
        now,
        `검수 기한(${AUTO_APPROVE_DAYS}일, 미정·시연값) 안에 응답이 없어 자동 승인`,
      );
      return {
        ok: true,
        deal: {
          ...next,
          reviewDeadline: undefined,
          reviews: [...deal.reviews, { round: deal.revisionsUsed, decision: "auto_approved", at }],
        },
      };
    }
    case "confirm_payout": {
      const next = move(
        deal,
        "settled",
        action.type,
        actor,
        now,
        `운영자가 작업자에게 송금 후 지급 완료 처리 (처리자: ${actor.name})`,
      );
      return { ok: true, deal: { ...next, payout: { paidAt: at, paidBy: actor.name } } };
    }
    case "confirm_settlement": {
      const next = move(
        deal,
        "settled",
        action.type,
        actor,
        now,
        "직접 송금 거래: 작업자가 정산 완료 확인",
      );
      return { ok: true, deal: { ...next, payout: { paidAt: at, paidBy: "직접 송금(작업자 확인)" } } };
    }
    case "open_dispute": {
      if (!needReason(action.reason)) return fail("REASON_REQUIRED", "분쟁 사유를 적어 주세요.");
      const next = move(
        deal,
        "disputed",
        action.type,
        actor,
        now,
        `${statusLabel(deal)} 단계에서 분쟁 접수: ${action.reason.trim()}`,
      );
      return { ok: true, deal: { ...next, statusBeforeDispute: deal.status } };
    }
    case "resolve_dispute": {
      if (!needReason(action.reason)) return fail("REASON_REQUIRED", "해소 내용을 적어 주세요.");
      const back = deal.statusBeforeDispute ?? "in_progress";
      const next = move(deal, back, action.type, actor, now, `분쟁 해소: ${action.reason.trim()}`);
      return { ok: true, deal: { ...next, statusBeforeDispute: undefined } };
    }
    case "cancel": {
      if (!needReason(action.reason)) return fail("REASON_REQUIRED", "취소 사유를 적어 주세요.");
      const stage =
        deal.status === "disputed" && deal.statusBeforeDispute
          ? `분쟁 처리 중(${STATUS_LABEL[deal.statusBeforeDispute]})`
          : statusLabel(deal);
      return {
        ok: true,
        deal: move(deal, "cancelled", action.type, actor, now, `${stage} 단계에서 취소: ${action.reason.trim()}`),
      };
    }
  }
}

/** 검수 기한이 지난 거래를 모두 자동 승인한다(시간 빨리 감기 뒤 호출). */
export function runAutoApprovals(deals: Deal[], now: Date): Deal[] {
  const system: Actor = { role: "system", name: "CoV 자동 처리" };
  return deals.map((d) => {
    if (!availableActions(d, "system", now).includes("auto_approve")) return d;
    const r = transition(d, { type: "auto_approve" }, system, now);
    return r.ok ? r.deal : d;
  });
}
