import { TERMINAL } from "./deal-machine";
import type { Deal, Role } from "./types";

/** 이 역할의 "나"가 낀 거래만 고른다. 운영자는 전부 본다. */
export function dealsFor(deals: Deal[], role: Role, myId: string | null): Deal[] {
  if (role === "operator") return deals;
  return deals.filter((d) => (role === "worker" ? d.worker.id : d.client.id) === myId);
}

/** 계약 금액: 성립했으면 스냅샷 금액, 아니면 제안 금액. 화면은 이 값을 그대로 보여 준다. */
export function agreedAmount(d: Deal): number {
  return d.agreement?.snapshot.amount ?? d.terms.amount;
}

export interface Summary {
  activeCount: number;
  /** 성립한(동의가 끝난) 진행 중 거래 금액. 동의 대기 거래는 뺀다. */
  activeAmount: number;
  pendingCount: number;
  settledAmount: number;
}

export function summarize(deals: Deal[]): Summary {
  let activeCount = 0;
  let activeAmount = 0;
  let settledAmount = 0;
  let pendingCount = 0;
  for (const d of deals) {
    if (d.status === "settled") settledAmount += agreedAmount(d);
    else if (!TERMINAL.includes(d.status)) {
      activeCount += 1;
      if (d.agreement) activeAmount += agreedAmount(d);
      else pendingCount += 1;
    }
  }
  return { activeCount, activeAmount, settledAmount, pendingCount };
}

export interface TrustProfile {
  completed: number;
  /** 0~1, 응답할 일이 없었으면 null */
  responseRate: number | null;
  responded: number;
  requests: number;
  /** 0~1, 상대가 없으면 null */
  recontractRate: number | null;
  counterparties: number;
  repeatCounterparties: number;
}

/**
 * 신뢰도 프로필(시연용 정의, 실제 정의는 미정).
 * - 완료 건수: 정산 완료 거래 수
 * - 응답률: 내게 온 요청(조건 동의 요청, 작업자는 수정 요청, 의뢰인은 검수 요청) 중
 *   직접 응답한 비율. 아직 기다리는 요청은 빼고, 자동 승인된 검수는 무응답으로 센다.
 * - 재계약률: 거래한 상대 중 2건 이상 거래한 상대의 비율(취소 제외)
 */
export function trustProfile(all: Deal[], side: "worker" | "client", partyId: string): TrustProfile {
  const mine = all.filter((d) => (side === "worker" ? d.worker.id : d.client.id) === partyId);
  const completed = mine.filter((d) => d.status === "settled").length;

  let requests = 0;
  let responded = 0;
  for (const d of mine) {
    const h = d.history;
    for (let i = 0; i < h.length; i++) {
      const e = h[i];
      const rest = h.slice(i + 1);
      // 조건 동의 요청: 상대가 제안했을 때
      if (e.action === "create" && d.proposedBy !== side) {
        const answer = rest.find((x) => ["agree", "decline", "withdraw", "cancel"].includes(x.action));
        if (!answer) continue; // 아직 대기 중
        if (answer.action === "withdraw" || answer.action === "cancel") continue;
        requests++;
        responded++;
      }
      if (side === "client" && e.action === "submit_delivery") {
        const answer = rest.find((x) =>
          ["approve", "request_revision", "auto_approve", "cancel", "open_dispute"].includes(x.action),
        );
        if (!answer || answer.action === "cancel" || answer.action === "open_dispute") continue;
        requests++;
        if (answer.action !== "auto_approve") responded++;
      }
      if (side === "worker" && e.action === "request_revision") {
        const answer = rest.find((x) => ["submit_delivery", "cancel", "open_dispute"].includes(x.action));
        if (!answer || answer.action !== "submit_delivery") continue;
        requests++;
        responded++;
      }
    }
  }

  const counts = new Map<string, number>();
  for (const d of mine) {
    if (d.status === "cancelled") continue;
    const other = side === "worker" ? d.client.id : d.worker.id;
    counts.set(other, (counts.get(other) ?? 0) + 1);
  }
  const counterparties = counts.size;
  const repeatCounterparties = [...counts.values()].filter((n) => n >= 2).length;

  return {
    completed,
    requests,
    responded,
    responseRate: requests ? responded / requests : null,
    counterparties,
    repeatCounterparties,
    recontractRate: counterparties ? repeatCounterparties / counterparties : null,
  };
}
