import { describe, expect, it } from "vitest";
import {
  buyDeals,
  collectIssues,
  countByFilter,
  filterDeals,
  involvedDeals,
  menuFor,
  opsDeals,
  parseFilter,
  parseTab,
  parseView,
  sellDeals,
  sortDeals,
} from "./my-deals";
import { ME_CLIENT, ME_WORKER } from "./personas";
import { buildSeed } from "./seed";
import type { Deal } from "./types";

const NOW = new Date("2026-11-17T03:00:00Z");

describe("주소 값 읽기", () => {
  it("모르는 값은 기본값", () => {
    expect(parseTab("issues")).toBe("issues");
    expect(parseTab("nope")).toBe("activity");
    expect(parseFilter("trouble")).toBe("trouble");
    expect(parseFilter(null)).toBe("all");
  });

  it("역할에 없는 메뉴는 요약으로", () => {
    expect(parseView("sell", "worker")).toBe("sell");
    expect(parseView("ops", "worker")).toBe("summary");
    expect(parseView("sell", "operator")).toBe("summary");
    expect(menuFor("operator").map((m) => m.id)).toEqual(["summary", "ops", "all"]);
  });
});

describe("시연 데이터의 판매·구매 활동", async () => {
  const deals = await buildSeed(NOW);

  it("작업자·의뢰인 페르소나 모두 판매와 구매가 한 건 이상 있다", () => {
    for (const p of [ME_WORKER, ME_CLIENT]) {
      expect(sellDeals(deals, p.id).length, `${p.name} 판매`).toBeGreaterThan(0);
      expect(buyDeals(deals, p.id).length, `${p.name} 구매`).toBeGreaterThan(0);
    }
  });

  it("판매+구매 = 낀 거래 전부, 운영자는 전체", () => {
    const mine = involvedDeals(deals, "worker");
    expect(mine.length).toBe(sellDeals(deals, ME_WORKER.id).length + buyDeals(deals, ME_WORKER.id).length);
    expect(involvedDeals(deals, "operator")).toHaveLength(deals.length);
  });

  it("상태 필터 개수는 그 필터로 거른 결과와 같고, 전체는 모두", () => {
    const c = countByFilter(deals);
    expect(c.all).toBe(deals.length);
    expect(c.settled).toBe(filterDeals(deals, "settled", "").length);
  });

  it("검색은 거래 이름·상대 이름에서 띄어쓰기 무시하고 찾는다", () => {
    expect(filterDeals(deals, "all", "카페달무리").map((d) => d.id)).toEqual(["demo-cmp-2f88"]);
    expect(filterDeals(deals, "all", "나무그늘").map((d) => d.id)).toEqual(["demo-voc-5c20"]);
    expect(filterDeals(deals, "all", "없는거래xyz")).toEqual([]);
  });

  it("운영 처리 대기는 입금 확인·지급·분쟁만", () => {
    for (const d of opsDeals(deals)) expect(["deposit_reported", "awaiting_payout", "disputed"]).toContain(d.status);
  });

  it("마감 빠른 순 정렬", () => {
    const s = sortDeals(deals, "deadline").map((d) => d.terms.deadline);
    expect(s).toEqual([...s].sort());
  });
});

describe("collectIssues", () => {
  const base = (over: Partial<Deal>): Deal =>
    ({
      id: "x",
      createdAt: NOW.toISOString(),
      terms: { title: "t", workType: "기타", amount: 1, deadline: "2026-12-31", revisionLimit: 2, fileFormats: [], scope: "", paymentRoute: "operator" },
      worker: ME_WORKER,
      client: ME_CLIENT,
      proposedBy: "client",
      status: "in_progress",
      revisionsUsed: 0,
      deliveries: [],
      reviews: [],
      history: [],
      ...over,
    }) as Deal;

  it("분쟁 > 수정 요청 > 마감 지남 > 기한 임박 > 취소 순, 문제없는 거래는 빠진다", () => {
    const issues = collectIssues(
      [
        base({ id: "ok" }),
        base({ id: "cancel", status: "cancelled" }),
        base({ id: "soon", terms: { ...base({}).terms, deadline: "2026-11-19" } }),
        base({ id: "late", terms: { ...base({}).terms, deadline: "2026-11-10" } }),
        base({ id: "rev", revisionsUsed: 1, reviews: [{ round: 0, decision: "revision_requested", at: NOW.toISOString() }] }),
        base({ id: "disp", status: "disputed" }),
      ],
      NOW,
    );
    expect(issues.map((i) => [i.deal.id, i.kind])).toEqual([
      ["disp", "dispute"],
      ["rev", "revision"],
      ["late", "overdue"],
      ["soon", "deadline"],
      ["cancel", "cancelled"],
    ]);
  });

  it("끝난 거래는 마감이 지나도 이슈가 아니다", () => {
    expect(collectIssues([base({ status: "settled", terms: { ...base({}).terms, deadline: "2026-01-01" } })], NOW)).toEqual([]);
  });
});
