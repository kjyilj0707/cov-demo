// 작업 유형 "기타"의 작업 내용(workTypeDetail) 추가가 기존 거래·해시와 호환되는지 확인한다.
import { describe, expect, it } from "vitest";
import { createDeal, transition, validateTerms, WORK_TYPE_DETAIL_MAX } from "./deal-machine";
import { workTypeText } from "./format";
import { hashTerms } from "./hash";
import { buildSeed } from "./seed";
import type { Deal, Terms } from "./types";

const NOW = new Date("2026-11-17T00:00:00Z");
const base: Terms = {
  title: "싱글 믹싱",
  workType: "기타",
  amount: 300000,
  deadline: "2026-12-01",
  revisionLimit: 2,
  fileFormats: ["WAV"],
  scope: "1곡",
  paymentRoute: "operator",
};
const make = (terms: Terms) =>
  createDeal({ id: "t1", terms, worker: { id: "w", name: "w" }, client: { id: "c", name: "c" }, proposer: { role: "worker", name: "w" } }, NOW);

/** 필드를 추가하기 전 코드로 계산해 둔 해시(같은 입력이면 지금도 같아야 한다) */
const BEFORE = {
  gitaWithoutDetail: "c960c9a73b65fdb21e4d5b89bc4f06ef04f9dd6525171b26fe642d31f94d59c7",
  seed: {
    "demo-mix-7a31": "5695d31e3286a9bcb6be1962ed608fbb6b10db7a221d7c43baecfe30a44b9eb8",
    "demo-ses-9e04": "211168a9573660e2226f5f3894c0fff81be5f79d38080fe156b57d13c1a9f0d6",
    "demo-vid-d317": "f1d1b694ff41f45c17dae95dee3a0ba8604a2465f4ffdc5532c87b25bb0cae59",
    "demo-pst-41bd": "809c9bfebb65ddce6e2140bf83536475b692c8841687d4b1ca24f089dbdb0718",
    "demo-voc-5c20": "d939c70a22b99fc3861307f2af9cea1f4030454f31b93a0267e68e823ebfebe2",
    "demo-cmp-2f88": "7954ba82abac49acfcff0739e1a8fbbda34b14e4c2b0cfc0b173c194615e33c7",
  } as Record<string, string>,
};

describe("기존 거래 해시는 그대로", () => {
  it("시연 시드의 동의 해시가 필드 추가 전과 같고, 스냅샷을 다시 계산해도 같다", async () => {
    const seed = await buildSeed(new Date("2026-11-17T03:00:00Z"));
    const agreed = seed.filter((d) => d.agreement);
    expect(agreed.length).toBe(Object.keys(BEFORE.seed).length);
    for (const d of agreed) {
      expect(d.agreement!.hash, d.id).toBe(BEFORE.seed[d.id]);
      expect(await hashTerms(d.agreement!.snapshot), d.id).toBe(d.agreement!.hash);
      expect("workTypeDetail" in d.terms, d.id).toBe(false);
    }
  });

  it("브라우저에 저장돼 있던(필드 없는) 거래를 JSON으로 다시 읽어도 해시 대조가 맞다", async () => {
    const seed = await buildSeed(new Date("2026-11-17T03:00:00Z"));
    const stored = JSON.parse(JSON.stringify(seed)) as Deal[];
    for (const d of stored.filter((x) => x.agreement)) expect(await hashTerms(d.agreement!.snapshot)).toBe(d.agreement!.hash);
  });
});

describe("기타 작업 내용", () => {
  it("기타 + 내용이면 스냅샷·해시에 들어간다(앞뒤 공백 제거)", async () => {
    const r = make({ ...base, workTypeDetail: "  라이브 음원 편집 " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deal.terms.workTypeDetail).toBe("라이브 음원 편집");
    const h = await hashTerms(r.deal.terms);
    expect(h).not.toBe(BEFORE.gitaWithoutDetail);
    expect(workTypeText(r.deal.terms)).toBe("기타 · 라이브 음원 편집");
    // 동의하면 스냅샷에도 그대로 남고 해시가 맞는다
    const a = transition(r.deal, { type: "agree", hash: h }, { role: "client", name: "c" }, NOW);
    expect(a.ok).toBe(true);
    if (a.ok) {
      expect(a.deal.agreement!.snapshot.workTypeDetail).toBe("라이브 음원 편집");
      expect(await hashTerms(a.deal.agreement!.snapshot)).toBe(a.deal.agreement!.hash);
    }
  });

  it("기타인데 내용이 비었거나 공백뿐이거나 너무 길면 검증 실패", () => {
    expect(validateTerms(base).some((e) => e.includes("작업 내용"))).toBe(true);
    expect(validateTerms({ ...base, workTypeDetail: "   " }).some((e) => e.includes("작업 내용"))).toBe(true);
    expect(validateTerms({ ...base, workTypeDetail: "가".repeat(WORK_TYPE_DETAIL_MAX + 1) }).some((e) => e.includes(`${WORK_TYPE_DETAIL_MAX}자`))).toBe(true);
    expect(validateTerms({ ...base, workTypeDetail: "가".repeat(WORK_TYPE_DETAIL_MAX) })).toEqual([]);
    expect(make(base).ok).toBe(false);
  });

  it("다른 유형에서는 내용이 무시되고(저장 안 됨) 해시도 필드 없을 때와 같다", async () => {
    const plain = make({ ...base, workType: "영상" });
    const withDetail = make({ ...base, workType: "영상", workTypeDetail: "무시될 글" });
    expect(plain.ok && withDetail.ok).toBe(true);
    if (!plain.ok || !withDetail.ok) return;
    expect("workTypeDetail" in withDetail.deal.terms).toBe(false);
    expect(await hashTerms(withDetail.deal.terms)).toBe(await hashTerms(plain.deal.terms));
    expect(workTypeText({ workType: "영상", workTypeDetail: "무시될 글" })).toBe("영상");
  });
});
