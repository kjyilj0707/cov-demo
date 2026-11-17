// 홈 검색에 쓰는 가상 창작자 목록. DB가 없어서 정적 데이터로 둔다.
// 모든 이름·소개는 시연용으로 지어낸 것이며 실존 인물·업체와 관계없다.
import { ME_CLIENT, ME_WORKER, OTHER_CLIENT } from "./personas";
import { trustProfile } from "./stats";
import type { Deal, Party, WorkType } from "./types";

/** 분야 안의 세부 분야(카테고리 더보기 패널의 오른쪽 목록) */
export interface Subcategory {
  id: string;
  label: string;
  /**
   * 세부 분야 검색 낱말. 창작자 자신의 글(이름·대표 분야·소개·키워드)에 이 중 하나라도 들어 있으면
   * 그 세부 분야로 본다. 분야 공통 키워드는 비교에 넣지 않는다(넣으면 분야 안 모든 창작자가 걸린다).
   */
  keywords: string[];
}

export interface Category {
  id: string;
  label: string;
  /** 배너 카드에 붙는 짧은 설명 */
  blurb: string;
  /** 검색어가 이 낱말들과 맞으면 이 분야로 본다 */
  keywords: string[];
  subcategories: Subcategory[];
}

// 공연·라이브(live)는 2026-11-17 팀 회의에서 새로 만든 분야이며 분류는 아직 확정 전이다.
// 공연은 파일 납품이 없어 계약 흐름(WORK_TYPES)과 맞지 않으므로 검색·분야 화면에서만 쓴다.
export const CATEGORIES: Category[] = [
  {
    id: "mixing",
    label: "믹싱·마스터링",
    blurb: "음원 완성도 다듬기",
    keywords: ["믹싱", "마스터링", "음원", "사운드"],
    subcategories: [
      { id: "mix", label: "믹싱", keywords: ["믹싱"] },
      { id: "master", label: "마스터링", keywords: ["마스터링"] },
      { id: "tuning", label: "보정(튠·타이밍)", keywords: ["보정", "튠", "타이밍", "피치"] },
    ],
  },
  {
    id: "session",
    label: "세션·녹음",
    blurb: "연주·보컬 녹음",
    keywords: ["세션", "녹음", "드럼", "베이스", "기타", "보컬"],
    subcategories: [
      { id: "instrument", label: "악기 세션", keywords: ["악기", "드럼", "베이스", "기타", "건반"] },
      { id: "vocal", label: "보컬 녹음·디렉팅", keywords: ["보컬", "디렉팅"] },
      { id: "narration", label: "내레이션", keywords: ["내레이션", "성우"] },
    ],
  },
  {
    id: "live",
    label: "공연·라이브",
    blurb: "DJ·클럽·라이브 무대",
    keywords: ["공연", "라이브", "DJ", "디제이", "클럽", "행사"],
    subcategories: [
      { id: "dj", label: "DJ", keywords: ["DJ", "디제이"] },
      { id: "club", label: "클럽 공연", keywords: ["클럽"] },
      { id: "live-session", label: "라이브 세션 연주", keywords: ["라이브 세션", "세션 연주", "밴드"] },
      { id: "event", label: "행사 공연", keywords: ["행사", "축제", "파티"] },
    ],
  },
  {
    id: "compose",
    label: "작·편곡",
    blurb: "곡 만들기·편곡",
    keywords: ["작곡", "편곡", "작·편곡", "현악", "피아노"],
    subcategories: [
      { id: "composing", label: "작곡", keywords: ["작곡", "배경음악"] },
      { id: "arranging", label: "편곡", keywords: ["편곡"] },
      { id: "topline", label: "탑라인", keywords: ["탑라인", "멜로디"] },
    ],
  },
  {
    id: "artwork",
    label: "앨범 아트워크",
    blurb: "재킷·커버 그림",
    keywords: ["앨범", "아트워크", "커버", "재킷", "일러스트"],
    subcategories: [
      { id: "cover", label: "커버 일러스트", keywords: ["커버", "일러스트"] },
      { id: "jacket", label: "재킷 디자인", keywords: ["재킷", "패키지"] },
    ],
  },
  {
    id: "design",
    label: "디자인",
    blurb: "포스터·로고·굿즈",
    keywords: ["디자인", "포스터", "로고", "타이포", "굿즈", "브랜딩"],
    subcategories: [
      { id: "poster", label: "포스터", keywords: ["포스터"] },
      { id: "logo", label: "로고", keywords: ["로고", "브랜딩"] },
      { id: "goods", label: "굿즈", keywords: ["굿즈", "머천다이즈"] },
    ],
  },
  {
    id: "photo",
    label: "사진",
    blurb: "프로필·공연 촬영",
    // "공연"만 두면 검색어 "공연"이 사진 분야로 잡혀서 "공연 촬영"으로 좁혔다.
    keywords: ["사진", "촬영", "프로필", "공연 촬영"],
    subcategories: [
      { id: "profile-photo", label: "프로필", keywords: ["프로필"] },
      { id: "stage-photo", label: "공연 현장", keywords: ["공연 촬영", "현장"] },
    ],
  },
  {
    id: "video",
    label: "영상",
    blurb: "뮤직비디오·홍보 영상",
    keywords: ["영상", "뮤직비디오", "편집", "홍보", "숏폼"],
    subcategories: [
      { id: "mv", label: "뮤직비디오", keywords: ["뮤직비디오"] },
      { id: "live-clip", label: "라이브 클립", keywords: ["라이브 클립", "공연 영상"] },
      { id: "shortform", label: "숏폼", keywords: ["숏폼", "쇼츠", "릴스"] },
    ],
  },
  {
    id: "mediaart",
    label: "미디어아트",
    blurb: "프로젝션·인터랙티브",
    keywords: ["미디어아트", "프로젝션", "인터랙티브", "전시", "모션"],
    subcategories: [
      { id: "projection", label: "프로젝션", keywords: ["프로젝션", "매핑"] },
      { id: "vj", label: "VJ", keywords: ["VJ", "브이제이"] },
      { id: "interactive", label: "인터랙티브", keywords: ["인터랙티브", "센서"] },
    ],
  },
];

export function findCategory(id: string | null | undefined): Category | undefined {
  return id ? CATEGORIES.find((k) => k.id === id) : undefined;
}

/** 분야 안의 세부 분야. 분야가 다르거나 없으면 undefined */
export function findSubcategory(categoryId: string | null | undefined, subId: string | null | undefined): Subcategory | undefined {
  return subId ? findCategory(categoryId)?.subcategories.find((s) => s.id === subId) : undefined;
}

/**
 * 카테고리 패널에서 지금 보는 화면. list가 null이면 세부 분야 목록,
 * "all"이면 분야 전체 창작자 목록, 그 밖에는 그 세부 분야의 창작자 목록.
 * 주소에는 ?sheet=분야&list=… 로 남겨 프로필에서 돌아오면 그대로 다시 연다.
 */
export interface SheetView {
  cat: string;
  list: string | null;
}

export const SHEET_LIST_ALL = "all";

/** 주소 값에서 패널 상태를 읽는다. 없는 분야면 null, 없는 세부 분야면 세부 분야 목록으로 본다. */
export function parseSheetView(sheet: string | null, list: string | null): SheetView | null {
  const k = findCategory(sheet);
  if (!k) return null;
  const ok = list === SHEET_LIST_ALL || (list !== null && findSubcategory(k.id, list) !== undefined);
  return { cat: k.id, list: ok ? list : null };
}

/** 패널 창작자 목록의 분야·세부 분야 이름. 예: "미디어아트 › 인터랙티브", "미디어아트 전체" */
export function sheetListLabel(view: SheetView): string {
  const k = findCategory(view.cat);
  if (!k) return "";
  const sub = findSubcategory(view.cat, view.list);
  return sub ? `${k.label} › ${sub.label}` : `${k.label} 전체`;
}

/** 홈 검색창 아래 "많이 찾는 키워드" 알약. 누르면 그 낱말로 검색한다. */
export const POPULAR_KEYWORDS = ["믹싱", "앨범 커버", "공연 포스터", "뮤직비디오", "프로필 사진", "보컬 녹음", "프로젝션"];

/** 시연용 고정 신뢰도(실제 거래 기록이 없는 가상 창작자에게만 쓴다) */
export interface StaticTrust {
  completed: number;
  responseRate: number;
  recontractRate: number;
}

export interface Creator extends Party {
  /** 대표 분야(한 줄) */
  field: string;
  intro: string;
  categories: string[];
  keywords: string[];
  /** "이 창작자와 계약 만들기"에서 미리 골라 둘 작업 유형 */
  workType: WorkType;
  /** 없으면 시연 거래 기록에서 계산한다(온결 스튜디오) */
  staticTrust?: StaticTrust;
}

export const CREATORS: Creator[] = [
  {
    ...ME_WORKER,
    field: "믹싱·마스터링 / 작·편곡",
    intro: "밴드 음원 믹싱과 마스터링을 주로 합니다. 레퍼런스 곡을 같이 정하고 시작해요.",
    categories: ["mixing", "compose"],
    keywords: ["밴드", "믹싱", "마스터링", "인디"],
    workType: "믹싱·마스터링",
  },
  {
    id: "w-saebyeok",
    name: "새벽녘 사운드랩",
    field: "믹싱·마스터링",
    intro: "어쿠스틱·발라드 음원의 따뜻한 질감을 살리는 믹싱을 합니다. 보컬 튠·타이밍 보정도 함께 해요.",
    categories: ["mixing"],
    keywords: ["어쿠스틱", "발라드", "믹싱", "마스터링"],
    workType: "믹싱·마스터링",
    staticTrust: { completed: 23, responseRate: 0.96, recontractRate: 0.41 },
  },
  {
    id: "w-moraesigye",
    name: "모래시계 세션",
    field: "세션·녹음 (드럼·베이스)",
    intro: "드럼과 베이스 세션 연주, 원격 녹음 파일 납품까지 합니다.",
    categories: ["session"],
    keywords: ["드럼", "베이스", "세션", "원격 녹음"],
    workType: "세션·녹음",
    staticTrust: { completed: 31, responseRate: 0.92, recontractRate: 0.55 },
  },
  {
    id: "w-namugeuneul",
    name: "나무그늘 녹음실",
    field: "세션·녹음 (보컬·내레이션)",
    intro: "보컬 녹음과 디렉팅, 오디오북 내레이션 녹음을 합니다.",
    categories: ["session"],
    keywords: ["보컬", "녹음", "디렉팅", "내레이션"],
    workType: "세션·녹음",
    staticTrust: { completed: 12, responseRate: 0.88, recontractRate: 0.33 },
  },
  {
    id: "w-bamhaneul",
    name: "밤하늘 레코드",
    field: "공연·라이브 (DJ·클럽)",
    intro: "클럽 파티와 행사 DJ 공연을 합니다. 하우스·디스코 셋을 자리 분위기에 맞춰 짜 드려요.",
    categories: ["live"],
    keywords: ["DJ", "클럽", "파티", "하우스"],
    // 공연은 계약 흐름(WORK_TYPES)에 맞는 유형이 아직 없어 "기타"로 둔다(분류 확정 전).
    workType: "기타",
    staticTrust: { completed: 18, responseRate: 0.93, recontractRate: 0.52 },
  },
  {
    id: "w-noeulbit",
    name: "노을빛 세션밴드",
    field: "공연·라이브 (라이브 세션 밴드)",
    intro: "축제·행사 무대와 클럽 공연에서 보컬 뒤를 받치는 라이브 세션 연주를 합니다.",
    categories: ["live"],
    keywords: ["라이브 세션", "밴드", "축제", "클럽 공연"],
    workType: "기타",
    staticTrust: { completed: 8, responseRate: 0.89, recontractRate: 0.38 },
  },
  {
    id: "w-mulgyeol",
    name: "물결음표",
    field: "작·편곡 (현악·피아노)",
    intro: "현악과 피아노 편곡, 짧은 영상용 배경 음악 작곡, 보컬 탑라인 작업을 합니다.",
    categories: ["compose"],
    keywords: ["현악", "피아노", "편곡", "배경음악"],
    workType: "작·편곡",
    staticTrust: { completed: 9, responseRate: 1, recontractRate: 0.25 },
  },
  {
    id: "w-bandibul",
    name: "반딧불 그림방",
    field: "앨범 아트워크 (일러스트)",
    intro: "손그림 느낌의 앨범 커버와 싱글 재킷 일러스트를 그립니다.",
    categories: ["artwork"],
    keywords: ["일러스트", "앨범 커버", "재킷", "손그림"],
    workType: "앨범 아트워크",
    staticTrust: { completed: 17, responseRate: 0.94, recontractRate: 0.47 },
  },
  {
    id: "w-guruemdari",
    name: "구름다리 공방",
    field: "디자인 / 앨범 아트워크",
    intro: "타이포그래피 중심의 포스터와 앨범 패키지를 디자인합니다.",
    categories: ["design", "artwork"],
    keywords: ["타이포", "포스터", "패키지", "디자인"],
    workType: "포스터·디자인",
    staticTrust: { completed: 14, responseRate: 0.9, recontractRate: 0.38 },
  },
  {
    id: "w-jongibihaeng",
    name: "종이비행기 디자인",
    field: "디자인 (포스터·로고·굿즈)",
    intro: "공연 포스터, 밴드 로고, 굿즈 시안을 한 번에 맞춰 드립니다.",
    categories: ["design"],
    keywords: ["포스터", "로고", "굿즈", "브랜딩"],
    workType: "포스터·디자인",
    staticTrust: { completed: 26, responseRate: 0.97, recontractRate: 0.5 },
  },
  {
    id: "w-binmoeum",
    name: "빛모음 사진관",
    field: "사진 (프로필·공연)",
    intro: "아티스트 프로필 사진과 공연 현장 사진을 찍습니다.",
    categories: ["photo"],
    keywords: ["프로필", "공연 촬영", "사진"],
    workType: "사진",
    staticTrust: { completed: 40, responseRate: 0.91, recontractRate: 0.6 },
  },
  {
    id: "w-neujeunohu",
    name: "늦은오후 필름",
    field: "영상 (뮤직비디오·홍보)",
    intro: "저예산 뮤직비디오 기획·촬영·편집과 홍보용 짧은 영상, 라이브 클립을 만듭니다.",
    categories: ["video"],
    keywords: ["뮤직비디오", "편집", "숏폼", "홍보 영상"],
    workType: "영상",
    staticTrust: { completed: 11, responseRate: 0.85, recontractRate: 0.27 },
  },
  {
    id: "w-byeolgaru",
    name: "별가루 미디어랩",
    field: "미디어아트 (프로젝션·인터랙티브)",
    intro: "공연 무대 프로젝션과 VJ, 전시용 인터랙티브 영상을 만듭니다.",
    categories: ["mediaart", "video"],
    keywords: ["프로젝션", "인터랙티브", "전시", "모션그래픽"],
    workType: "기타",
    staticTrust: { completed: 6, responseRate: 0.83, recontractRate: 0.5 },
  },
];

/**
 * 계약 만들기를 아직 열지 않는 분야. 공연·라이브는 파일 납품이 없어 계약 흐름과 맞지 않아
 * 분류가 확정될 때까지 계약을 막는다(2026-11-17 결정).
 */
export const CONTRACT_PAUSED_CATEGORIES = ["live"];

/** 이 창작자와 계약 만들기를 열 수 있는가 */
export function canContractWith(c: Creator): boolean {
  return !c.categories.some((id) => CONTRACT_PAUSED_CATEGORIES.includes(id));
}

/** 검색 비교용: 소문자, 공백·가운뎃점 제거 */
function norm(s: string): string {
  return s.toLowerCase().replace(/[\s·・.,/()]/g, "");
}

/** 창작자 자신의 글(분야 공통 키워드 제외). 세부 분야 비교에 쓴다. */
function ownText(c: Creator): string {
  return norm([c.name, c.field, c.intro, ...c.keywords].join(" "));
}

/** 이 창작자가 세부 분야에 해당하는가: 세부 분야 낱말 중 하나라도 창작자 글에 있으면 해당 */
export function matchesSubcategory(c: Creator, sub: Subcategory): boolean {
  const own = ownText(c);
  return sub.keywords.some((k) => own.includes(norm(k)));
}

/**
 * 키워드(자유 입력)·분야(카테고리 id)·세부 분야(id)로 창작자를 거른다. 모두 비면 전부.
 * 검색어가 어떤 분야의 이름이나 키워드와 똑같으면(예: "공연" → 공연·라이브) 그 분야 창작자를 앞에 둔다.
 */
export function searchCreators(
  query: string,
  categoryId: string | null,
  subId: string | null = null,
  list: Creator[] = CREATORS,
): Creator[] {
  const words = query
    .split(/\s+/)
    .map(norm)
    .filter(Boolean);
  const sub = findSubcategory(categoryId, subId);
  const hits = list.filter((c) => {
    if (categoryId && !c.categories.includes(categoryId)) return false;
    if (sub && !matchesSubcategory(c, sub)) return false;
    if (words.length === 0) return true;
    const catText = c.categories
      .map((id) => findCategory(id))
      .flatMap((k) => (k ? [k.label, ...k.keywords] : []));
    const hay = norm([c.name, c.field, c.intro, ...c.keywords, ...catText].join(" "));
    return words.every((w) => hay.includes(w));
  });
  if (words.length === 0) return hits;
  const exactCats = new Set(
    CATEGORIES.filter((k) => [k.label, ...k.keywords].some((t) => words.includes(norm(t)))).map((k) => k.id),
  );
  if (exactCats.size === 0) return hits;
  const rank = (c: Creator) => (c.categories.some((id) => exactCats.has(id)) ? 0 : 1);
  // Array.prototype.sort는 안정 정렬이라 같은 순위 안에서는 원래 순서가 유지된다.
  return [...hits].sort((a, b) => rank(a) - rank(b));
}

export function findCreator(id: string): Creator | undefined {
  return CREATORS.find((c) => c.id === id);
}

/** 프로필로 열 수 있는 거래 당사자(창작자 + 시연 의뢰인) */
export type ProfileSide = "worker" | "client";
export interface ProfileTarget {
  party: Party;
  side: ProfileSide;
  creator?: Creator;
}

const CLIENT_PARTIES: Party[] = [ME_CLIENT, OTHER_CLIENT];

export function findProfileTarget(id: string): ProfileTarget | undefined {
  const creator = findCreator(id);
  if (creator) return { party: { id: creator.id, name: creator.name }, side: "worker", creator };
  const client = CLIENT_PARTIES.find((p) => p.id === id);
  if (client) return { party: client, side: "client" };
  return undefined;
}

/** 시연 거래에 등장하는 의뢰인 목록(프로필 둘러보기용) */
export const DEMO_CLIENTS = CLIENT_PARTIES;

export interface TrustView {
  completed: number;
  responseRate: number | null;
  recontractRate: number | null;
  /** live = 시연 거래 기록에서 계산, static = 가상 고정값 */
  source: "live" | "static";
  detail?: ReturnType<typeof trustProfile>;
}

/** 신뢰도 표시값. 고정값이 있으면 그대로, 없으면 시연 거래 기록으로 계산한다. */
export function trustFor(target: { party: Party; side: ProfileSide; creator?: Creator }, deals: Deal[]): TrustView {
  const s = target.creator?.staticTrust;
  if (s) return { ...s, source: "static" };
  const p = trustProfile(deals, target.side, target.party.id);
  return {
    completed: p.completed,
    responseRate: p.responseRate,
    recontractRate: p.recontractRate,
    source: "live",
    detail: p,
  };
}

export function pct(n: number | null): string {
  return n === null ? "기록 없음" : `${Math.round(n * 100)}%`;
}
