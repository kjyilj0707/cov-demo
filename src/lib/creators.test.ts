import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CREATORS,
  canContractWith,
  findProfileTarget,
  findSubcategory,
  parseSheetView,
  searchCreators,
  sheetListLabel,
} from "./creators";
import { ME_CLIENT, ME_WORKER } from "./personas";

describe("creators 정적 데이터", () => {
  it("id가 겹치지 않고, 모든 카테고리 id가 실제로 있다", () => {
    const ids = CREATORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const catIds = new Set(CATEGORIES.map((c) => c.id));
    for (const c of CREATORS) for (const k of c.categories) expect(catIds.has(k)).toBe(true);
  });

  it("카테고리마다 창작자가 한 명 이상 있다", () => {
    for (const k of CATEGORIES) expect(searchCreators("", k.id).length).toBeGreaterThan(0);
  });

  it("세부 분야 id는 분야 안에서 겹치지 않고, 세부 분야마다 창작자가 한 명 이상 있다", () => {
    for (const k of CATEGORIES) {
      const subIds = k.subcategories.map((s) => s.id);
      expect(new Set(subIds).size, k.id).toBe(subIds.length);
      for (const s of k.subcategories) expect(searchCreators("", k.id, s.id).length, `${k.id}/${s.id}`).toBeGreaterThan(0);
    }
  });

  it("공연·라이브는 세션·녹음 바로 뒤에 있다", () => {
    const ids = CATEGORIES.map((k) => k.id);
    expect(ids.indexOf("live")).toBe(ids.indexOf("session") + 1);
  });
});

describe("searchCreators", () => {
  it("빈 검색이면 전부", () => {
    expect(searchCreators("", null)).toHaveLength(CREATORS.length);
  });

  it("키워드로 거른다(띄어쓰기·대소문자 무시)", () => {
    const r = searchCreators("뮤직 비디오", null);
    expect(r.map((c) => c.id)).toContain("w-neujeunohu");
    expect(r.every((c) => c.categories.includes("video") || c.keywords.join().includes("뮤직비디오"))).toBe(true);
  });

  it("카테고리 이름으로도 찾는다", () => {
    expect(searchCreators("미디어아트", null).map((c) => c.id)).toEqual(["w-byeolgaru"]);
  });

  it("키워드와 카테고리를 함께 쓰면 둘 다 맞아야 한다", () => {
    expect(searchCreators("포스터", "artwork").map((c) => c.id)).toEqual(["w-guruemdari"]);
  });

  it("\"공연\"·\"라이브\"는 공연·라이브 창작자가 먼저 나온다", () => {
    for (const q of ["공연", "라이브", "DJ"]) {
      const r = searchCreators(q, null);
      const liveCount = searchCreators("", "live").length;
      expect(r.slice(0, liveCount).every((c) => c.categories.includes("live")), q).toBe(true);
    }
  });

  it("사진 분야는 \"공연 촬영\"으로 찾는다", () => {
    expect(searchCreators("공연 촬영", null).map((c) => c.id)).toContain("w-binmoeum");
  });

  it("세부 분야는 분야 공통 키워드가 아니라 창작자 글로 거른다", () => {
    expect(searchCreators("", "live", "dj").map((c) => c.id)).toEqual(["w-bamhaneul"]);
    expect(searchCreators("", "live", "live-session").map((c) => c.id)).toEqual(["w-noeulbit"]);
    expect(searchCreators("", "design", "logo").map((c) => c.id)).toEqual(["w-jongibihaeng"]);
  });

  it("다른 분야의 세부 분야 id는 무시한다", () => {
    expect(findSubcategory("photo", "dj")).toBeUndefined();
    expect(searchCreators("", "photo", "dj")).toEqual(searchCreators("", "photo"));
  });

  it("맞는 게 없으면 빈 목록", () => {
    expect(searchCreators("없는검색어xyz", null)).toEqual([]);
  });
});

describe("findProfileTarget", () => {
  it("창작자는 작업자, 시연 의뢰인은 의뢰인으로 연다", () => {
    expect(findProfileTarget(ME_WORKER.id)?.side).toBe("worker");
    expect(findProfileTarget(ME_CLIENT.id)?.side).toBe("client");
    expect(findProfileTarget("nope")).toBeUndefined();
  });
});

describe("POPULAR_KEYWORDS", () => {
  it("인기 키워드는 모두 결과가 한 명 이상 나온다", async () => {
    const { POPULAR_KEYWORDS } = await import("./creators");
    for (const k of POPULAR_KEYWORDS) expect(searchCreators(k, null).length, k).toBeGreaterThan(0);
  });
});

describe("카테고리 패널 상태(?sheet=&list=)", () => {
  it("분야와 세부 분야·전체를 읽는다", () => {
    expect(parseSheetView("mediaart", "interactive")).toEqual({ cat: "mediaart", list: "interactive" });
    expect(parseSheetView("mediaart", "all")).toEqual({ cat: "mediaart", list: "all" });
    expect(parseSheetView("mediaart", null)).toEqual({ cat: "mediaart", list: null });
  });

  it("없는 분야면 패널을 열지 않고, 다른 분야의 세부 분야는 세부 분야 목록으로 되돌린다", () => {
    expect(parseSheetView(null, "dj")).toBeNull();
    expect(parseSheetView("nope", "all")).toBeNull();
    expect(parseSheetView("mediaart", "dj")).toEqual({ cat: "mediaart", list: null });
  });

  it("목록 제목", () => {
    expect(sheetListLabel({ cat: "mediaart", list: "interactive" })).toBe("미디어아트 › 인터랙티브");
    expect(sheetListLabel({ cat: "mediaart", list: "all" })).toBe("미디어아트 전체");
  });
});

describe("계약을 아직 열지 않는 분야", () => {
  it("공연·라이브 창작자는 계약 불가, 나머지는 가능", () => {
    for (const c of CREATORS) expect(canContractWith(c), c.id).toBe(!c.categories.includes("live"));
    expect(CREATORS.filter((c) => !canContractWith(c)).map((c) => c.id).sort()).toEqual(["w-bamhaneul", "w-noeulbit"]);
  });
});
