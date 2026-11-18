// "나의 거래" 화면의 목록 고르기·이슈 모으기. 화면은 이 결과를 그대로 보여 준다.
// 금액·상태는 거래 데이터(상태 기계가 만든 값)를 읽기만 하고 새로 계산하지 않는다.
import { STATUS_LABEL, TERMINAL, availableActions, type ActionType } from "./deal-machine";
import { daysUntil } from "./format";
import { ME_CLIENT, ME_WORKER } from "./personas";
import type { Deal, DealStatus, Party, Role } from "./types";

export type MyTab = "activity" | "issues" | "account";
export const MY_TABS: { id: MyTab; label: string }[] = [
  { id: "activity", label: "활동" },
  { id: "issues", label: "이슈" },
  { id: "account", label: "계정" },
];

/** 활동 탭 왼쪽 메뉴. 작업자·의뢰인은 요약/판매/구매, 운영자는 요약/처리 대기/전체 거래 */
export type ActivityView = "summary" | "sell" | "buy" | "ops" | "all";
export const ACTIVITY_MENU: Record<"party" | "operator", { id: ActivityView; label: string }[]> = {
  party: [
    { id: "summary", label: "요약" },
    { id: "sell", label: "판매 활동" },
    { id: "buy", label: "구매 활동" },
  ],
  operator: [
    { id: "summary", label: "요약" },
    { id: "ops", label: "운영 처리 대기" },
    { id: "all", label: "전체 거래" },
  ],
};

export function menuFor(role: Role) {
  return ACTIVITY_MENU[role === "operator" ? "operator" : "party"];
}

/** 주소 값 검사: 모르는 값이면 기본값으로 */
export function parseTab(v: string | null): MyTab {
  return MY_TABS.some((t) => t.id === v) ? (v as MyTab) : "activity";
}
export function parseView(v: string | null, role: Role): ActivityView {
  return menuFor(role).some((m) => m.id === v) ? (v as ActivityView) : "summary";
}

/** 시연에서 이 역할로 보는 사람. 운영자는 거래 당사자가 아니다. */
export function personaFor(role: Role): Party | null {
  return role === "worker" ? ME_WORKER : role === "client" ? ME_CLIENT : null;
}

/** 판매 = 작업자로서 받은 거래, 구매 = 의뢰인으로서 맡긴 거래 */
export function sellDeals(deals: Deal[], personaId: string): Deal[] {
  return deals.filter((d) => d.worker.id === personaId);
}
export function buyDeals(deals: Deal[], personaId: string): Deal[] {
  return deals.filter((d) => d.client.id === personaId);
}

/** 운영자가 처리할 차례인 거래: 입금 확인, 지급, 분쟁 */
export const OPS_STATUSES: DealStatus[] = ["deposit_reported", "awaiting_payout", "disputed"];
export function opsDeals(deals: Deal[]): Deal[] {
  return deals.filter((d) => OPS_STATUSES.includes(d.status));
}

/** 이 사람이 낀 거래 전부(판매·구매). 운영자는 전체. */
export function involvedDeals(deals: Deal[], role: Role): Deal[] {
  const p = personaFor(role);
  if (!p) return deals;
  return deals.filter((d) => d.worker.id === p.id || d.client.id === p.id);
}

export type StatusFilter =
  | "all"
  | "active"
  | "proposed"
  | "deposit"
  | "in_progress"
  | "in_review"
  | "awaiting_payout"
  | "settled"
  | "trouble";

export const STATUS_FILTERS: { id: StatusFilter; label: string; statuses: DealStatus[] | null }[] = [
  { id: "all", label: "전체", statuses: null },
  {
    id: "active",
    label: "진행 중",
    statuses: ["proposed", "awaiting_deposit", "deposit_reported", "in_progress", "in_review", "awaiting_payout", "disputed"],
  },
  { id: "proposed", label: STATUS_LABEL.proposed, statuses: ["proposed"] },
  // 입금 대기(의뢰인 차례)와 입금 확인 대기(운영자 차례)를 함께 묶는다
  { id: "deposit", label: "입금 대기·확인", statuses: ["awaiting_deposit", "deposit_reported"] },
  { id: "in_progress", label: STATUS_LABEL.in_progress, statuses: ["in_progress"] },
  { id: "in_review", label: STATUS_LABEL.in_review, statuses: ["in_review"] },
  { id: "awaiting_payout", label: STATUS_LABEL.awaiting_payout, statuses: ["awaiting_payout"] },
  { id: "settled", label: "끝난 거래", statuses: ["settled"] },
  { id: "trouble", label: "분쟁·취소", statuses: ["disputed", "cancelled"] },
];

export function parseFilter(v: string | null): StatusFilter {
  return STATUS_FILTERS.some((f) => f.id === v) ? (v as StatusFilter) : "all";
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s/g, "");
}

/** 상태 필터와 검색어(거래 이름·상대 이름·거래번호)로 거른다 */
export function filterDeals(deals: Deal[], filter: StatusFilter, query: string): Deal[] {
  const f = STATUS_FILTERS.find((x) => x.id === filter);
  const q = norm(query);
  return deals.filter((d) => {
    if (f?.statuses && !f.statuses.includes(d.status)) return false;
    if (!q) return true;
    return norm([d.terms.title, d.worker.name, d.client.name, d.id].join(" ")).includes(q);
  });
}

export function countByFilter(deals: Deal[]): Record<StatusFilter, number> {
  const out = {} as Record<StatusFilter, number>;
  for (const f of STATUS_FILTERS) out[f.id] = filterDeals(deals, f.id, "").length;
  return out;
}

export type SortKey = "recent" | "deadline";
export function sortDeals(deals: Deal[], key: SortKey): Deal[] {
  const copy = [...deals];
  if (key === "deadline") copy.sort((a, b) => a.terms.deadline.localeCompare(b.terms.deadline));
  else copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return copy;
}

/** 마감 며칠 전부터 "기한 임박"으로 보나(시연용 기준, 확정 아님) */
export const DEADLINE_SOON_DAYS = 3;

export type IssueKind = "dispute" | "revision" | "overdue" | "deadline" | "cancelled";
export const ISSUE_LABEL: Record<IssueKind, string> = {
  dispute: "분쟁",
  revision: "수정 요청",
  overdue: "마감 지남",
  deadline: "기한 임박",
  cancelled: "취소",
};

export interface Issue {
  deal: Deal;
  kind: IssueKind;
  detail: string;
}

/**
 * 신경 써야 할 거래. 한 거래에 하나만, 위 순서(분쟁 > 수정 요청 > 마감 지남 > 기한 임박 > 취소)로 고른다.
 * - 분쟁: 분쟁 처리 중
 * - 수정 요청: 작업 중이고 마지막 검수가 수정 요청
 * - 마감 지남 / 기한 임박: 끝나지 않은 거래의 마감이 지났거나 DEADLINE_SOON_DAYS일 안
 * - 취소: 취소된 거래
 */
export function collectIssues(deals: Deal[], now: Date): Issue[] {
  const out: Issue[] = [];
  for (const d of deals) {
    const left = daysUntil(d.terms.deadline, now);
    const lastReview = d.reviews[d.reviews.length - 1];
    if (d.status === "disputed") {
      out.push({ deal: d, kind: "dispute", detail: "분쟁 처리 중입니다. 운영자 확인을 기다립니다." });
    } else if (d.status === "in_progress" && lastReview?.decision === "revision_requested") {
      out.push({
        deal: d,
        kind: "revision",
        detail: `수정 ${d.revisionsUsed}/${d.terms.revisionLimit}회차 요청이 들어와 반영을 기다립니다.`,
      });
    } else if (!TERMINAL.includes(d.status) && left < 0) {
      out.push({ deal: d, kind: "overdue", detail: `마감이 ${-left}일 지났습니다.` });
    } else if (!TERMINAL.includes(d.status) && left <= DEADLINE_SOON_DAYS) {
      out.push({ deal: d, kind: "deadline", detail: left === 0 ? "오늘 마감입니다." : `마감까지 ${left}일 남았습니다.` });
    } else if (d.status === "cancelled") {
      out.push({ deal: d, kind: "cancelled", detail: "취소된 거래입니다." });
    }
  }
  const order: IssueKind[] = ["dispute", "revision", "overdue", "deadline", "cancelled"];
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/* ───────────── 홈 현황판 ───────────── */
// 홈은 "내 계약이 지금 어디까지 왔나"만 보여 준다. 차례 판단은 deal-machine의 availableActions를 그대로 읽고,
// 금액·상태는 새로 계산하지 않는다. 목록 검색·필터·이슈는 나의 거래 화면이 맡는다.

/** 홈에서 "할 일"로 보는 동작과 그 문구. 조건 수정·철회, 분쟁 접수·취소 같은 선택 동작은 할 일로 세지 않는다. */
const TODO_TEXT: Partial<Record<ActionType, (d: Deal) => string>> = {
  agree: () => "조건 확인하고 동의하기",
  report_deposit: (d) => (d.terms.paymentRoute === "direct" ? "작업자에게 송금하고 알리기" : "운영자 계좌로 입금하고 알리기"),
  confirm_received: () => "대금을 받았는지 확인하기",
  submit_delivery: (d) => (d.revisionsUsed > 0 ? `수정 ${d.revisionsUsed}회차 반영본 납품하기` : "작업 결과물 납품하기"),
  approve: () => "납품물 검수하기",
  confirm_settlement: () => "정산 완료 확인하기",
  confirm_deposit: () => "입금 확인하기",
  confirm_payout: () => "작업자에게 지급하고 완료 처리하기",
  resolve_dispute: () => "분쟁 처리하기",
};

/** 이 거래에서 "나"의 자리. 운영자는 operator, 당사자는 시연 인물이 앉은 쪽 */
export function sideIn(deal: Deal, role: Role): Role {
  if (role === "operator") return "operator";
  const p = personaFor(role);
  return p && deal.client.id === p.id ? "client" : "worker";
}

/** 내가 지금 눌러야 할 일(없으면 null) */
export function todoFor(deal: Deal, role: Role): string | null {
  for (const a of availableActions(deal, sideIn(deal, role))) {
    const text = TODO_TEXT[a];
    if (text) return text(deal);
  }
  return null;
}

/** 내 차례가 아닐 때 누구를 기다리는지 */
export function waitingText(deal: Deal): string {
  const direct = deal.terms.paymentRoute === "direct";
  switch (deal.status) {
    case "proposed":
      return "상대의 조건 동의 대기";
    case "awaiting_deposit":
      return direct ? "의뢰인 송금 대기" : "의뢰인 입금 대기";
    case "deposit_reported":
      return direct ? "작업자 수령 확인 대기" : "운영자 입금 확인 대기";
    case "in_progress":
      return "작업자 작업 중";
    case "in_review":
      return "의뢰인 검수 대기";
    case "awaiting_payout":
      return direct ? "작업자 정산 확인 대기" : "운영자 지급 대기";
    case "disputed":
      return "운영자 분쟁 처리 중";
    default:
      return STATUS_LABEL[deal.status];
  }
}

/** 대금이 어디까지 갔는지 한 줄(상태 이름을 대금 쪽 말로 바꿔 읽는다. 금액 계산은 하지 않는다) */
export function paymentStage(deal: Pick<Deal, "status" | "terms">): string {
  const direct = deal.terms.paymentRoute === "direct";
  switch (deal.status) {
    case "proposed":
      return "동의 전";
    case "awaiting_deposit":
      return "입금 전";
    case "deposit_reported":
      return direct ? "작업자 수령 확인 중" : "운영자 입금 확인 중";
    case "in_progress":
    case "in_review":
      return direct ? "작업자 수령 확인됨" : "운영자 입금 확인됨";
    case "awaiting_payout":
      return direct ? "정산 확인 대기" : "작업자 지급 대기";
    case "settled":
      return "정산 완료";
    case "disputed":
      return "분쟁 처리 중";
    case "cancelled":
      return "거래 취소";
  }
}

export interface BoardItem {
  deal: Deal;
  /** 할 일 또는 기다리는 일 한 줄 */
  note: string;
}

export interface Board {
  /** 내가 할 일이 있는 거래(마감 빠른 순) */
  todo: BoardItem[];
  /** 진행 중이지만 상대·운영자 차례인 거래(마감 빠른 순) */
  waiting: BoardItem[];
  /** 정산 완료·취소(최근 순) */
  done: Deal[];
  /** 이 사람이 낀 거래 수(0이면 홈에 사용법을 보여 준다) */
  total: number;
}

export function homeBoard(deals: Deal[], role: Role): Board {
  const mine = involvedDeals(deals, role);
  const todo: BoardItem[] = [];
  const waiting: BoardItem[] = [];
  const done: Deal[] = [];
  for (const d of mine) {
    if (TERMINAL.includes(d.status)) {
      done.push(d);
      continue;
    }
    const t = todoFor(d, role);
    if (t) todo.push({ deal: d, note: t });
    else waiting.push({ deal: d, note: waitingText(d) });
  }
  const byDeadline = (a: BoardItem, b: BoardItem) => a.deal.terms.deadline.localeCompare(b.deal.terms.deadline);
  const lastAt = (d: Deal) => d.history.at(-1)?.at ?? d.createdAt;
  return {
    todo: todo.sort(byDeadline),
    waiting: waiting.sort(byDeadline),
    done: done.sort((a, b) => lastAt(b).localeCompare(lastAt(a))),
    total: mine.length,
  };
}
