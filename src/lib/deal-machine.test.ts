import { describe, expect, it } from "vitest";
import {
  addDays,
  availableActions,
  createDeal,
  isTermsLocked,
  runAutoApprovals,
  transition,
  type Action,
  type Result,
} from "./deal-machine";
import { hashTerms } from "./hash";
import type { Actor, Deal, Terms } from "./types";

const worker: Actor = { role: "worker", name: "가상 작업자" };
const client: Actor = { role: "client", name: "가상 의뢰인" };
const operator: Actor = { role: "operator", name: "가상 운영자" };
const system: Actor = { role: "system", name: "CoV 자동 처리" };

const T0 = new Date("2026-11-01T00:00:00.000Z");
const later = (h: number) => new Date(T0.getTime() + h * 3600_000);

function terms(over: Partial<Terms> = {}): Terms {
  return {
    title: "시연곡 믹싱",
    workType: "믹싱·마스터링",
    amount: 300000,
    deadline: "2026-12-01",
    revisionLimit: 2,
    fileFormats: ["WAV"],
    scope: "보컬 포함 1곡 믹싱",
    paymentRoute: "operator",
    ...over,
  };
}

function ok(r: Result): Deal {
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
  return r.deal;
}

function newDeal(over: Partial<Terms> = {}, proposer: Actor = worker): Deal {
  return ok(
    createDeal(
      {
        id: "d1",
        terms: terms(over),
        worker: { id: "w", name: worker.name },
        client: { id: "c", name: client.name },
        proposer,
      },
      T0,
    ),
  );
}

async function agreed(over: Partial<Terms> = {}): Promise<Deal> {
  const d = newDeal(over);
  return ok(transition(d, { type: "agree", hash: await hashTerms(d.terms) }, client, later(1)));
}

function step(d: Deal, a: Action, actor: Actor, h: number): Deal {
  return ok(transition(d, a, actor, later(h)));
}

describe("정상 흐름 (운영자 수령)", () => {
  it("초안부터 정산 완료까지 가고, 모든 전이가 이력에 남는다", async () => {
    let d = await agreed();
    expect(d.status).toBe("awaiting_deposit");
    expect(d.agreement?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(d.agreement?.snapshot).toEqual(d.terms);

    d = step(d, { type: "report_deposit", depositorName: "가상의뢰인" }, client, 2);
    expect(d.status).toBe("deposit_reported");
    d = step(d, { type: "confirm_deposit", depositorName: "가상의뢰인", amount: 300000 }, operator, 3);
    expect(d.status).toBe("in_progress");
    expect(d.deposit?.confirmedBy).toBe(operator.name);

    d = step(d, { type: "submit_delivery", fileNames: ["mix_v1.wav"] }, worker, 4);
    expect(d.status).toBe("in_review");
    d = step(d, { type: "approve" }, client, 5);
    expect(d.status).toBe("awaiting_payout");
    d = step(d, { type: "confirm_payout" }, operator, 6);
    expect(d.status).toBe("settled");
    expect(d.payout?.paidBy).toBe(operator.name);

    expect(d.history.map((h) => h.to)).toEqual([
      "proposed",
      "awaiting_deposit",
      "deposit_reported",
      "in_progress",
      "in_review",
      "awaiting_payout",
      "settled",
    ]);
    for (const h of d.history) {
      expect(h.actor.name).toBeTruthy();
      expect(h.at).toBeTruthy();
      expect(h.reason).toBeTruthy();
    }
  });

  it("입금액이 계약 금액과 다르면 입금 확인을 막는다", async () => {
    let d = await agreed();
    d = step(d, { type: "report_deposit", depositorName: "가상의뢰인" }, client, 2);
    const r = transition(d, { type: "confirm_deposit", depositorName: "가상의뢰인", amount: 30000 }, operator, later(3));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AMOUNT_MISMATCH");
  });

  it("검수 기한이 지나면 자동 승인되고, 기한 전에는 안 된다", async () => {
    let d = await agreed();
    d = step(d, { type: "report_deposit", depositorName: "가" }, client, 2);
    d = step(d, { type: "confirm_deposit", depositorName: "가", amount: 300000 }, operator, 3);
    d = step(d, { type: "submit_delivery", fileNames: ["a.wav"] }, worker, 4);

    const early = transition(d, { type: "auto_approve" }, system, later(5));
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.code).toBe("REVIEW_DEADLINE_NOT_REACHED");

    const [after] = runAutoApprovals([d], addDays(later(4), 7));
    expect(after.status).toBe("awaiting_payout");
    expect(after.reviews.at(-1)?.decision).toBe("auto_approved");
    expect(after.history.at(-1)?.actor.role).toBe("system");
  });
});

describe("수정 횟수", () => {
  it("약속한 횟수까지 수정 요청을 받고, 초과하면 막는다", async () => {
    let d = await agreed({ revisionLimit: 2 });
    d = step(d, { type: "report_deposit", depositorName: "가" }, client, 2);
    d = step(d, { type: "confirm_deposit", depositorName: "가", amount: 300000 }, operator, 3);

    d = step(d, { type: "submit_delivery", fileNames: ["v1.wav"] }, worker, 4);
    d = step(d, { type: "request_revision", note: "보컬 크게" }, client, 5);
    expect(d.revisionsUsed).toBe(1);
    expect(d.status).toBe("in_progress");

    d = step(d, { type: "submit_delivery", fileNames: ["v2.wav"] }, worker, 6);
    d = step(d, { type: "request_revision", note: "베이스 줄이기" }, client, 7);
    expect(d.revisionsUsed).toBe(2);

    d = step(d, { type: "submit_delivery", fileNames: ["v3.wav"] }, worker, 8);
    const r = transition(d, { type: "request_revision", note: "한 번 더" }, client, later(9));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("REVISION_LIMIT_EXCEEDED");
      expect(r.message).toContain("산정식 미정");
    }
    // 막힌 뒤에도 승인은 할 수 있다.
    expect(step(d, { type: "approve" }, client, 9).status).toBe("awaiting_payout");
  });

  it("수정 가능 횟수 0이면 첫 수정 요청부터 막는다", async () => {
    let d = await agreed({ revisionLimit: 0 });
    d = step(d, { type: "report_deposit", depositorName: "가" }, client, 2);
    d = step(d, { type: "confirm_deposit", depositorName: "가", amount: 300000 }, operator, 3);
    d = step(d, { type: "submit_delivery", fileNames: ["v1.wav"] }, worker, 4);
    const r = transition(d, { type: "request_revision", note: "x" }, client, later(5));
    expect(r.ok).toBe(false);
  });
});

describe("직접 송금 경로", () => {
  it("의뢰인 송금 → 작업자 수령 확인, 정산은 작업자가 확인하고 운영자 입금·지급 처리는 막힌다", async () => {
    let d = await agreed({ paymentRoute: "direct" });
    d = step(d, { type: "report_deposit", depositorName: "가상의뢰인" }, client, 2);

    const opConfirm = transition(
      d,
      { type: "confirm_deposit", depositorName: "가상의뢰인", amount: 300000 },
      operator,
      later(3),
    );
    expect(opConfirm.ok).toBe(false);
    expect(availableActions(d, "operator")).not.toContain("confirm_deposit");

    d = step(d, { type: "confirm_received" }, worker, 3);
    expect(d.status).toBe("in_progress");
    d = step(d, { type: "submit_delivery", fileNames: ["poster.pdf"] }, worker, 4);
    d = step(d, { type: "approve" }, client, 5);

    const opPayout = transition(d, { type: "confirm_payout" }, operator, later(6));
    expect(opPayout.ok).toBe(false);

    d = step(d, { type: "confirm_settlement" }, worker, 6);
    expect(d.status).toBe("settled");
  });

  it("운영자 수령 경로에서는 작업자 수령 확인을 쓸 수 없다", async () => {
    let d = await agreed();
    d = step(d, { type: "report_deposit", depositorName: "가" }, client, 2);
    const r = transition(d, { type: "confirm_received" }, worker, later(3));
    expect(r.ok).toBe(false);
  });
});

describe("성립 후 조건 수정 차단", () => {
  it("동의 전에는 제안자가 고칠 수 있고, 동의 뒤에는 누구도 못 고친다", async () => {
    const d = newDeal();
    expect(isTermsLocked(d)).toBe(false);
    const edited = step(d, { type: "edit_terms", terms: terms({ amount: 350000 }) }, worker, 1);
    expect(edited.terms.amount).toBe(350000);

    const a = ok(
      transition(edited, { type: "agree", hash: await hashTerms(edited.terms) }, client, later(2)),
    );
    expect(isTermsLocked(a)).toBe(true);
    for (const actor of [worker, client, operator]) {
      const r = transition(a, { type: "edit_terms", terms: terms({ amount: 1 }) }, actor, later(3));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("TERMS_LOCKED");
    }
    expect(a.agreement?.snapshot.amount).toBe(350000);
  });

  it("같은 조건이면 해시가 같고, 금액 한 자리만 달라도 해시가 바뀐다", async () => {
    const h1 = await hashTerms(terms());
    const h2 = await hashTerms({ ...terms(), scope: "보컬 포함 1곡 믹싱" });
    const h3 = await hashTerms(terms({ amount: 300001 }));
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("잘못된 조건으로는 초안을 만들 수 없다", () => {
    const r = createDeal(
      {
        id: "x",
        terms: terms({ amount: -1, fileFormats: [] }),
        worker: { id: "w", name: "w" },
        client: { id: "c", name: "c" },
        proposer: worker,
      },
      T0,
    );
    expect(r.ok).toBe(false);
  });
});

describe("잘못된 역할의 전이 차단", () => {
  it("제안자는 자기 초안에 스스로 동의할 수 없다", async () => {
    const d = newDeal();
    const r = transition(d, { type: "agree", hash: await hashTerms(d.terms) }, worker, later(1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("WRONG_ROLE");
  });

  it("의뢰인이 제안했으면 작업자가 동의한다", async () => {
    const d = newDeal({}, client);
    expect(availableActions(d, "worker")).toContain("agree");
    expect(availableActions(d, "client")).not.toContain("agree");
  });

  it("작업자는 입금 확인·검수 승인·지급 완료를 할 수 없다", async () => {
    let d = await agreed();
    d = step(d, { type: "report_deposit", depositorName: "가" }, client, 2);
    expect(transition(d, { type: "confirm_deposit", depositorName: "가", amount: 300000 }, worker, later(3)).ok).toBe(false);
    d = step(d, { type: "confirm_deposit", depositorName: "가", amount: 300000 }, operator, 3);
    d = step(d, { type: "submit_delivery", fileNames: ["a.wav"] }, worker, 4);
    const selfApprove = transition(d, { type: "approve" }, worker, later(5));
    expect(selfApprove.ok).toBe(false);
    if (!selfApprove.ok) expect(selfApprove.code).toBe("WRONG_ROLE");
    d = step(d, { type: "approve" }, client, 5);
    expect(transition(d, { type: "confirm_payout" }, worker, later(6)).ok).toBe(false);
    expect(transition(d, { type: "confirm_payout" }, client, later(6)).ok).toBe(false);
  });

  it("의뢰인은 납품을 제출할 수 없고, 운영자는 검수 승인을 대신할 수 없다", async () => {
    let d = await agreed();
    d = step(d, { type: "report_deposit", depositorName: "가" }, client, 2);
    d = step(d, { type: "confirm_deposit", depositorName: "가", amount: 300000 }, operator, 3);
    expect(transition(d, { type: "submit_delivery", fileNames: ["a"] }, client, later(4)).ok).toBe(false);
    d = step(d, { type: "submit_delivery", fileNames: ["a"] }, worker, 4);
    expect(transition(d, { type: "approve" }, operator, later(5)).ok).toBe(false);
  });

  it("허용되지 않은 순서(동의 전 납품)는 막는다", () => {
    const d = newDeal();
    const r = transition(d, { type: "submit_delivery", fileNames: ["a"] }, worker, later(1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_ALLOWED_IN_STATUS");
  });
});

describe("분쟁·취소", () => {
  it("운영자만 분쟁을 열 수 있고, 해소하면 이전 단계로 돌아간다", async () => {
    let d = await agreed();
    d = step(d, { type: "report_deposit", depositorName: "가" }, client, 2);
    d = step(d, { type: "confirm_deposit", depositorName: "가", amount: 300000 }, operator, 3);
    expect(transition(d, { type: "open_dispute", reason: "x" }, client, later(4)).ok).toBe(false);
    expect(transition(d, { type: "open_dispute", reason: "  " }, operator, later(4)).ok).toBe(false);
    d = step(d, { type: "open_dispute", reason: "납기 지연" }, operator, 4);
    expect(d.status).toBe("disputed");
    expect(d.history.at(-1)?.reason).toContain("작업 중 단계에서 분쟁 접수");
    d = step(d, { type: "resolve_dispute", reason: "납기 3일 연장 합의" }, operator, 5);
    expect(d.status).toBe("in_progress");
  });

  it("취소 사유와 취소된 단계가 이력에 남고, 취소 뒤에는 아무 전이도 안 된다", async () => {
    let d = await agreed();
    d = step(d, { type: "cancel", reason: "의뢰인 사정" }, operator, 2);
    expect(d.status).toBe("cancelled");
    expect(d.history.at(-1)?.reason).toBe("입금 대기 단계에서 취소: 의뢰인 사정");
    expect(availableActions(d, "operator")).toEqual([]);
    expect(transition(d, { type: "report_deposit", depositorName: "가" }, client, later(3)).ok).toBe(false);
  });
});
