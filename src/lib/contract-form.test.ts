import { describe, expect, it } from "vitest";
import {
  BUDGET_LAST,
  BUDGET_STOPS,
  FULL_BUDGET,
  allErrors,
  amountRangeError,
  budgetErrors,
  budgetIndexFor,
  budgetValueAt,
  counterChoices,
  firstErrorStep,
  parseDraft,
  parseRevisionText,
  reviewSections,
  stepErrors,
  stepRevision,
} from "./contract-form";
import { createDeal } from "./deal-machine";
import { formatWon } from "./format";
import { hashTerms } from "./hash";
import { ME_CLIENT, ME_WORKER } from "./personas";
import type { Terms } from "./types";

const NOW = new Date("2026-11-17T03:00:00Z");
const filled: Terms = {
  title: "  싱글 믹싱 ",
  workType: "믹싱·마스터링",
  amount: 450000,
  deadline: "2026-12-01",
  revisionLimit: 2,
  fileFormats: ["WAV", "MP3"],
  scope: "1곡 믹싱 ",
  paymentRoute: "operator",
};

describe("예산 범위", () => {
  it("슬라이더 양 끝은 하한 없음·상한 없음", () => {
    expect(budgetValueAt(0, "min")).toBe(0);
    expect(budgetValueAt(BUDGET_LAST, "max")).toBeNull();
    expect(budgetValueAt(3, "min")).toBe(BUDGET_STOPS[3]);
    expect(budgetValueAt(3, "max")).toBe(BUDGET_STOPS[3]);
  });

  it("직접 입력한 금액은 손잡이 위치로 바뀐다(최소는 내림, 최대는 올림)", () => {
    expect(budgetIndexFor(0, "min")).toBe(0);
    expect(budgetIndexFor(350000, "min")).toBe(2); // 30만 칸
    expect(budgetIndexFor(350000, "max")).toBe(3); // 50만 칸
    expect(budgetIndexFor(null, "max")).toBe(BUDGET_LAST);
    expect(budgetIndexFor(9_000_000, "max")).toBe(BUDGET_LAST);
  });

  it("범위 검증: 최소가 최대보다 크면 오류", () => {
    expect(budgetErrors(FULL_BUDGET)).toEqual([]);
    expect(budgetErrors({ min: 300000, max: 500000 })).toEqual([]);
    expect(budgetErrors({ min: 600000, max: 500000 })).toEqual(["최소 금액이 최대 금액보다 큽니다."]);
    expect(budgetErrors({ min: 0, max: 0 })).toHaveLength(1);
  });

  it("확정 금액이 없거나 범위 밖이면 안내", () => {
    const r = { min: 300000, max: 500000 };
    expect(amountRangeError(0, r)).toMatch(/계약 금액\(확정\)을 적어/);
    expect(amountRangeError(200000, r)).toMatch(/최소 금액/);
    expect(amountRangeError(600000, r)).toMatch(/최대 금액/);
    expect(amountRangeError(300000, r)).toBeNull();
    expect(amountRangeError(500000, r)).toBeNull();
    expect(amountRangeError(99_000_000, FULL_BUDGET)).toBeNull();
  });

  it("금액 단계 오류에 범위 밖 확정 금액이 들어간다", () => {
    const errs = stepErrors(3, { ...filled, amount: 600000 }, { min: 300000, max: 500000 });
    expect(errs.some((e) => e.includes("최대 금액"))).toBe(true);
    expect(firstErrorStep({ ...filled, amount: 600000 }, { min: 300000, max: 500000 })).toBe(3);
  });
});

describe("수정 가능 횟수: 다이얼과 직접 입력", () => {
  it("직접 입력은 0~10 정수만 받는다", () => {
    expect(parseRevisionText("3")).toEqual({ value: 3, error: null });
    expect(parseRevisionText(" 0 ").value).toBe(0);
    expect(parseRevisionText("11").error).toMatch(/0~10회/);
    expect(parseRevisionText("2.5").error).not.toBeNull();
    expect(parseRevisionText("").error).not.toBeNull();
  });

  it("다이얼 한 칸 이동은 끝에서 멈추고, 입력이 비면 0부터", () => {
    expect(stepRevision(stepRevision(5, 1), -1)).toBe(5);
    expect(stepRevision(2, 1)).toBe(3);
    expect(stepRevision(10, 1)).toBe(10);
    expect(stepRevision(0, -1)).toBe(0);
    expect(stepRevision(NaN, 1)).toBe(1);
  });

  it("입력칸 → 다이얼 → 입력칸으로 같은 값이 오간다", () => {
    for (let n = 0; n <= 10; n++) {
      const typed = parseRevisionText(String(n)).value; // 입력칸이 정한 값을 다이얼이 받는다
      const fromDial = stepRevision(typed, 0); // 다이얼이 그 칸에 선다
      expect(parseRevisionText(String(fromDial)).value).toBe(n); // 다이얼 값이 입력칸 글자로 돌아온다
    }
  });

  it("잘못된 입력은 수정·검수 단계 오류가 된다", () => {
    expect(stepErrors(4, { ...filled, revisionLimit: parseRevisionText("11").value }, FULL_BUDGET)).toHaveLength(1);
  });
});

describe("확인하기 표와 실제 계약이 같은 원본에서 나온다", () => {
  it("표의 값 = 만들어진 거래 조건으로 다시 만든 표, 금액 행 = 거래 금액", async () => {
    expect(allErrors(filled, FULL_BUDGET)).toEqual([]);
    const counter = { label: "의뢰인", name: ME_CLIENT.name };
    const shown = reviewSections(filled, counter, NOW);
    const r = createDeal({ id: "t-1", terms: filled, worker: ME_WORKER, client: ME_CLIENT, proposer: { role: "worker", name: ME_WORKER.name } }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(reviewSections(r.deal.terms, counter, NOW)).toEqual(shown);
    const money = shown.find((s) => s.id === "rv-money")!;
    expect(money.rows[0].text).toBe(formatWon(r.deal.terms.amount));
    // 계약 조건에는 예산 범위가 들어가지 않는다(필드 목록이 그대로)
    expect(Object.keys(r.deal.terms).sort()).toEqual(
      ["amount", "deadline", "fileFormats", "paymentRoute", "revisionLimit", "scope", "title", "workType"].sort(),
    );
    // 해시도 같은 조건에서 같은 값
    expect(await hashTerms(r.deal.terms)).toBe(await hashTerms({ ...filled, title: "싱글 믹싱", scope: "1곡 믹싱" }));
  });

  it("체크박스형 조건은 ✓/— 행으로, 수정 횟수·마감은 '2회'·'D-n'으로", () => {
    const s = reviewSections(filled, { label: "의뢰인", name: "x" }, NOW);
    const files = s.find((x) => x.id === "rv-scope")!.rows.filter((r) => r.check !== undefined);
    expect(files.filter((r) => r.check).map((r) => r.label)).toEqual(["납품 파일: WAV", "납품 파일: MP3"]);
    expect(s.find((x) => x.id === "rv-revision")!.rows[0].text).toBe("2회");
    expect(s.find((x) => x.id === "rv-schedule")!.rows[0].text).toMatch(/D-1[45]/);
  });
});

describe("작성 값 넘기기", () => {
  it("저장 모양이 틀리면 버리고, NaN(JSON null)은 되돌린다", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft({ v: 2 })).toBeNull();
    const d = parseDraft(JSON.parse(JSON.stringify({ v: 1, role: "worker", counterId: "c", terms: { ...filled, revisionLimit: NaN }, budget: FULL_BUDGET })));
    expect(Number.isNaN(d!.terms.revisionLimit)).toBe(true);
    expect(d!.budget.max).toBeNull();
  });

  it("의뢰인의 상대 목록에는 공연·라이브 창작자가 없다", () => {
    expect(counterChoices("client").map((c) => c.id)).not.toContain("w-bamhaneul");
  });
});
