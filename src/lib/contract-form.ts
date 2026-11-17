// 계약 만들기 단계 화면과 확인하기 페이지가 함께 쓰는 값·검사.
// 예산 범위(budget)는 화면 안에서만 쓰는 값이다. 계약(조건 스냅샷·해시·대금 흐름)에는
// 지금처럼 terms.amount(확정 금액) 하나만 들어간다.
import { MAX_REVISION_LIMIT, validateTerms } from "./deal-machine";
import { daysUntil, formatDate, formatWon, workTypeText } from "./format";
import { CREATORS, canContractWith, findCreator } from "./creators";
import { CLIENT_CHOICES } from "./personas";
import { FILE_FORMATS, PAYMENT_ROUTE_LABEL, type Party, type Terms } from "./types";

/* ───────────── 계약 상대 ───────────── */

/** 의뢰인이 고를 수 있는 작업자: 홈 검색의 가상 창작자 중 계약을 열어 둔 분야의 창작자(공연·라이브 제외) */
export const WORKER_CHOICES: Party[] = CREATORS.filter(canContractWith).map((c) => ({ id: c.id, name: c.name }));

/** 작업자는 의뢰인을, 의뢰인은 작업자를 고른다 */
export function counterChoices(role: "worker" | "client"): Party[] {
  return role === "worker" ? CLIENT_CHOICES : WORKER_CHOICES;
}

export interface CounterHit {
  party: Party;
  /** 이름 아래 한 줄(창작자는 대표 분야) */
  sub: string;
  /** 공연·라이브처럼 지금은 계약할 수 없는 상대 */
  paused: boolean;
}

/**
 * 계약 상대 검색(이름). 이 서비스(시연 데이터)에 있는 사람만 찾는다.
 * 작업자는 의뢰인을, 의뢰인은 작업자를 찾는다. 공연·라이브 창작자는 결과에 보이되 고를 수 없다.
 */
export function searchCounterparts(role: "worker" | "client", query: string): CounterHit[] {
  const q = query.toLowerCase().replace(/\s/g, "");
  if (!q) return [];
  const pool: CounterHit[] =
    role === "worker"
      ? CLIENT_CHOICES.map((p) => ({ party: p, sub: "의뢰인", paused: false }))
      : CREATORS.map((c) => ({ party: { id: c.id, name: c.name }, sub: c.field, paused: !canContractWith(c) }));
  return pool.filter((h) => h.party.name.toLowerCase().replace(/\s/g, "").includes(q));
}

/** 1단계 상대 검사: 고르지 않았거나 고를 수 없는 상대면 문장 */
export function counterError(role: "worker" | "client", id: string): string | null {
  if (!counterChoices(role).some((c) => c.id === id)) return "계약 상대를 이름으로 검색해서 골라 주세요.";
  return null;
}

/** 계약을 아직 열지 않은 분야(공연·라이브)의 창작자인가 */
export function isPausedCreator(id: string | null | undefined): boolean {
  const c = id ? findCreator(id) : undefined;
  return c !== undefined && !canContractWith(c);
}

/* ───────────── 예산 범위 ───────────── */

/** 슬라이더 칸(원). 음악·디자인 외주 금액대에 맞춘 시연용 눈금 */
export const BUDGET_STOPS = [100000, 200000, 300000, 500000, 700000, 1000000, 1500000, 2000000, 3000000, 5000000];
export const BUDGET_LAST = BUDGET_STOPS.length - 1;
/** 눈금 라벨: [칸 번호, 글자] */
export const BUDGET_TICKS: [number, string][] = [
  [0, "10만 원 이하"],
  [3, "50만"],
  [5, "100만"],
  [7, "200만"],
  [BUDGET_LAST, "500만 원 이상"],
];

/** min 0 = 하한 없음, max null = 상한 없음 */
export interface BudgetRange {
  min: number;
  max: number | null;
}
export const FULL_BUDGET: BudgetRange = { min: 0, max: null };

/** 슬라이더 칸 → 금액. 맨 왼쪽 최소 손잡이는 "하한 없음", 맨 오른쪽 최대 손잡이는 "상한 없음" */
export function budgetValueAt(index: number, which: "min" | "max"): number | null {
  const i = Math.max(0, Math.min(BUDGET_LAST, Math.round(index)));
  if (which === "min") return i === 0 ? 0 : BUDGET_STOPS[i];
  return i === BUDGET_LAST ? null : BUDGET_STOPS[i];
}

/** 금액 → 슬라이더 칸(직접 입력했을 때 손잡이 위치). 최소는 내림, 최대는 올림 */
export function budgetIndexFor(value: number | null, which: "min" | "max"): number {
  if (which === "max") {
    if (value === null) return BUDGET_LAST;
    const i = BUDGET_STOPS.findIndex((s) => s >= value);
    return i < 0 ? BUDGET_LAST : i;
  }
  if (value === null || value <= 0) return 0;
  let i = 0;
  for (let k = 0; k < BUDGET_STOPS.length; k++) if (BUDGET_STOPS[k] <= value) i = k;
  return i;
}

/** 300000 → "30만 원", 1250000 → "125만 원", 55000 → "55,000원" */
export function formatManwon(n: number): string {
  if (n >= 10000 && n % 10000 === 0) return `${new Intl.NumberFormat("ko-KR").format(n / 10000)}만 원`;
  return formatWon(n);
}

export function budgetText(r: BudgetRange): string {
  const lo = r.min > 0 ? formatManwon(r.min) : "하한 없음";
  const hi = r.max !== null ? formatManwon(r.max) : "상한 없음";
  return `${lo} ~ ${hi}`;
}

export function budgetErrors(r: BudgetRange): string[] {
  const out: string[] = [];
  if (!Number.isInteger(r.min) || r.min < 0) out.push("최소 금액은 0원 이상으로 적어 주세요.");
  if (r.max !== null && (!Number.isInteger(r.max) || r.max <= 0)) out.push("최대 금액은 1원 이상으로 적어 주세요.");
  if (r.max !== null && r.min > r.max) out.push("최소 금액이 최대 금액보다 큽니다.");
  return out;
}

/** 확정 금액이 범위 안인지. 문제가 없으면 null */
export function amountRangeError(amount: number, r: BudgetRange): string | null {
  if (!Number.isInteger(amount) || amount <= 0) return "계약 금액(확정)을 적어 주세요. 확정 금액이 없으면 동의 요청을 보낼 수 없습니다.";
  if (amount < r.min) return `계약 금액이 예산 범위의 최소 금액(${formatWon(r.min)})보다 적습니다.`;
  if (r.max !== null && amount > r.max) return `계약 금액이 예산 범위의 최대 금액(${formatWon(r.max)})보다 많습니다.`;
  return null;
}

/** 입력칸 글자 → 원 단위 정수(숫자만). 비면 null */
export function parseWon(text: string): number | null {
  const d = text.replace(/[^0-9]/g, "");
  return d ? Number(d) : null;
}

/* ───────────── 수정 가능 횟수 ───────────── */

export const REVISION_MIN = 0;
export const REVISION_MAX = MAX_REVISION_LIMIT;

/** 직접 입력칸 글자 → 값. 범위 밖이거나 정수가 아니면 error. 검사 기준은 validateTerms와 같다. */
export function parseRevisionText(text: string): { value: number; error: string | null } {
  const t = text.trim();
  if (t === "") return { value: NaN, error: "수정 가능 횟수를 적어 주세요." };
  if (!/^\d+$/.test(t)) return { value: NaN, error: "수정 가능 횟수는 숫자로 적어 주세요." };
  const v = Number(t);
  if (v < REVISION_MIN || v > REVISION_MAX)
    return { value: NaN, error: `수정 가능 횟수는 ${REVISION_MIN}~${REVISION_MAX}회 사이로 정해 주세요.` };
  return { value: v, error: null };
}

/** 다이얼 한 칸 이동(범위 끝에서 멈춘다). 값이 비어 있으면 0부터 */
export function stepRevision(value: number, delta: number): number {
  const base = Number.isInteger(value) ? value : REVISION_MIN;
  return Math.max(REVISION_MIN, Math.min(REVISION_MAX, base + delta));
}

/* ───────────── 단계 ───────────── */

export const CONTRACT_STEPS = [
  { n: 1, title: "상대·작업" },
  { n: 2, title: "범위·결과물" },
  { n: 3, title: "금액·일정" },
  { n: 4, title: "수정·검수" },
  { n: 5, title: "확인하기" },
] as const;
export const LAST_FORM_STEP = 4;

/** validateTerms의 문장을 단계별로 나눈다(같은 검사를 한 번만 둔다) */
const STEP_KEYS: Record<number, string[]> = {
  1: ["제목", "작업 유형"],
  2: ["파일 형식", "작업 범위"],
  3: ["납기일", "대금 경로"],
  4: ["수정 가능 횟수"],
};

export function stepErrors(step: number, terms: Terms, budget: BudgetRange): string[] {
  const base = validateTerms(terms).filter((e) => (STEP_KEYS[step] ?? []).some((k) => e.includes(k)));
  if (step !== 3) return base;
  const amt = amountRangeError(terms.amount, budget);
  return [...budgetErrors(budget), ...(amt ? [amt] : []), ...base];
}

/** 확인하기로 넘어가거나 보내기 전 전체 검사 */
export function allErrors(terms: Terms, budget: BudgetRange): string[] {
  const fromSteps = [1, 2, 3, 4].flatMap((s) => stepErrors(s, terms, budget));
  // 단계로 나누지 못한 검사가 남으면(규칙이 늘어난 경우) 그대로 보탠다
  const rest = validateTerms(terms).filter((e) => !fromSteps.includes(e) && !e.startsWith("금액은"));
  return [...fromSteps, ...rest];
}

/** 처음으로 오류가 나는 단계(없으면 null) */
export function firstErrorStep(terms: Terms, budget: BudgetRange): number | null {
  for (const s of [1, 2, 3, 4]) if (stepErrors(s, terms, budget).length) return s;
  return null;
}

/** 오늘(시연 시각) + days 를 한국 날짜 YYYY-MM-DD로 */
export function ymdAfter(now: Date, days: number): string {
  const d = new Date(now.getTime() + days * 86400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}

/* ───────────── 작성 중인 값 넘기기(sessionStorage) ───────────── */

export interface ContractDraft {
  v: 1;
  /** 작성한 역할. 확인하기에서 역할이 바뀌었으면 다시 쓰게 한다 */
  role: "worker" | "client";
  counterId: string;
  terms: Terms;
  budget: BudgetRange;
}

const DRAFT_KEY = "cov-mvp-demo:new-draft";

export function saveDraft(d: ContractDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // 저장이 막힌 브라우저에서는 확인하기 페이지가 첫 단계로 안내한다
  }
}

export function loadDraft(): ContractDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? parseDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // 무시
  }
}

/** 저장된 값의 모양 검사. JSON에서 NaN은 null이 되므로 되돌린다 */
export function parseDraft(x: unknown): ContractDraft | null {
  if (!x || typeof x !== "object") return null;
  const d = x as Partial<ContractDraft>;
  if (d.v !== 1 || (d.role !== "worker" && d.role !== "client") || typeof d.counterId !== "string") return null;
  const t = d.terms as Terms | undefined;
  const b = d.budget as BudgetRange | undefined;
  if (!t || typeof t !== "object" || !b || typeof b.min !== "number") return null;
  return {
    v: 1,
    role: d.role,
    counterId: d.counterId,
    terms: { ...t, revisionLimit: typeof t.revisionLimit === "number" ? t.revisionLimit : NaN, fileFormats: [...(t.fileFormats ?? [])] },
    budget: { min: b.min, max: typeof b.max === "number" ? b.max : null },
  };
}

/* ───────────── 확인하기 표 ───────────── */

export interface ReviewRow {
  label: string;
  text: string;
  /** 체크박스형 조건: true = ✓, false = — */
  check?: boolean;
}
export interface ReviewSection {
  id: string;
  title: string;
  /** "수정"을 누르면 돌아갈 단계 */
  step: number;
  rows: ReviewRow[];
}

/**
 * 확인하기 표. 계약에 실제로 들어갈 terms 하나에서만 만든다(예산 범위는 넣지 않는다).
 * 보내기 버튼도 같은 terms를 createDeal에 넘긴다.
 */
export function reviewSections(
  terms: Terms,
  counter: { label: string; name: string },
  now: Date,
): ReviewSection[] {
  const left = terms.deadline ? daysUntil(terms.deadline, now) : null;
  return [
    {
      id: "rv-summary",
      title: "조건 요약",
      step: 1,
      rows: [
        { label: counter.label, text: counter.name },
        { label: "프로젝트 제목", text: terms.title.trim() },
        { label: "작업 유형", text: workTypeText(terms) },
      ],
    },
    {
      id: "rv-scope",
      title: "결과물·범위",
      step: 2,
      rows: [
        { label: "작업 범위", text: terms.scope.trim() },
        ...FILE_FORMATS.map((f) => {
          const on = terms.fileFormats.includes(f);
          return { label: `납품 파일: ${f}`, text: on ? "포함" : "미포함", check: on };
        }),
      ],
    },
    {
      id: "rv-money",
      title: "금액·대금",
      step: 3,
      rows: [
        { label: "계약 금액(확정)", text: formatWon(terms.amount) },
        ...(["operator", "direct"] as const).map((r) => {
          const on = terms.paymentRoute === r;
          return { label: `대금 경로: ${PAYMENT_ROUTE_LABEL[r]}`, text: on ? "선택" : "선택 안 함", check: on };
        }),
      ],
    },
    {
      id: "rv-revision",
      title: "수정·검수",
      step: 4,
      rows: [{ label: "수정 가능 횟수", text: `${terms.revisionLimit}회` }],
    },
    {
      id: "rv-schedule",
      title: "일정",
      step: 3,
      rows: [
        {
          label: "최종 납기일",
          text: terms.deadline
            ? `${formatDate(terms.deadline)} (${left !== null && left < 0 ? `${-left}일 지남` : `D-${left}`})`
            : "",
        },
      ],
    },
  ];
}
