"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { btnPrimary, btnSecondary, inputCls } from "@/components/bits";
import { BudgetRangeField } from "@/components/BudgetRangeField";
import { RevisionDial } from "@/components/RevisionDial";
import { emptyTerms } from "@/components/TermsForm";
import {
  CONTRACT_STEPS,
  FULL_BUDGET,
  LAST_FORM_STEP,
  amountRangeError,
  budgetText,
  counterChoices,
  firstErrorStep,
  isPausedCreator,
  loadDraft,
  parseRevisionText,
  parseWon,
  saveDraft,
  stepErrors,
  ymdAfter,
  type BudgetRange,
} from "@/lib/contract-form";
import { findCreator } from "@/lib/creators";
import { AUTO_APPROVE_DAYS } from "@/lib/deal-machine";
import { formatDate } from "@/lib/format";
import { demoNow, useDemo } from "@/lib/store";
import { FILE_FORMATS, PAYMENT_ROUTE_LABEL, WORK_TYPES, type PaymentRoute, type Terms, type WorkType } from "@/lib/types";

export default function NewDealPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-2">불러오는 중…</p>}>
      <NewDealView />
    </Suspense>
  );
}

function NewDealView() {
  const demo = useDemo();
  const params = useSearchParams();
  // 창작자 프로필의 "이 창작자와 계약 만들기"에서 오면 ?worker=<id>로 상대가 미리 골라져 있다.
  const presetWorker = params.get("worker");
  // 확인하기의 "수정"에서 오면 ?step=<단계>로 그 단계를 연다.
  const stepParam = Number(params.get("step"));
  if (!demo) return null;

  if (demo.role === "operator") {
    return (
      <div className="space-y-4 py-8 text-center">
        <h1 className="text-xl font-bold">새 계약 만들기</h1>
        <p className="text-ink-2">계약 초안은 작업자나 의뢰인이 만듭니다. 위에서 역할을 바꿔 주세요.</p>
        <Link href="/admin/" className={btnPrimary}>
          운영자 화면으로
        </Link>
      </div>
    );
  }

  const isWorker = demo.role === "worker";
  // 주소를 직접 고쳐 ?worker=공연·라이브 창작자로 들어와도 계약 양식을 열지 않는다.
  // (화면에서 막는 것일 뿐이다. 실제 서비스에서는 서버도 같은 검사를 해야 한다.)
  if (!isWorker && isPausedCreator(presetWorker)) {
    const c = findCreator(presetWorker!)!;
    return (
      <div className="space-y-4 py-8 text-center">
        <h1 className="text-xl font-bold">공연 계약은 준비 중입니다</h1>
        <p className="text-ink-2">
          {c.name}은(는) 공연·라이브 분야 창작자입니다. 공연은 파일 납품이 없어 지금의 계약 절차와 맞지 않아, 계약 방식이 정해질
          때까지 계약을 만들 수 없습니다.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/profile/?id=${encodeURIComponent(c.id)}`} className={btnPrimary}>
            프로필로 돌아가기
          </Link>
          <Link href="/new/" className={btnSecondary}>
            다른 창작자와 계약 만들기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ContractSteps
      key={demo.role}
      role={demo.role}
      presetWorker={isWorker ? null : presetWorker}
      startStep={Number.isInteger(stepParam) && stepParam >= 1 && stepParam <= LAST_FORM_STEP ? stepParam : 1}
      now={demoNow(demo)}
    />
  );
}

const card = "rounded-lg border border-line bg-card";
const choice = (on: boolean) =>
  `flex cursor-pointer rounded-lg border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
    on ? "border-ink bg-muted" : "border-line bg-card hover:border-ink-2"
  }`;

/** 단계별 안내 상자(한 줄)와 도움말. 시연판의 실제 규칙만 적는다. */
const GUIDE: Record<number, { info: string; help: string[] }> = {
  1: {
    info: "계약 상대와 작업 이름, 작업 유형을 정합니다.",
    help: [
      "시연판에서는 가상 상대 중에서 고릅니다. 실제 서비스에서는 초대 링크로 상대를 부릅니다.",
      "공연·라이브 분야 창작자는 계약 방식이 정해질 때까지 고를 수 없습니다.",
    ],
  },
  2: {
    info: "무엇을 몇 개, 어떤 파일로 넘길지 적습니다.",
    help: ["여기 적은 작업 범위와 파일 형식은 상대가 동의하면 바꿀 수 없습니다.", "파일 형식은 하나 이상 골라야 합니다."],
  },
  3: {
    info: "예산 범위는 금액을 정할 때 참고로만 쓰고 계약에는 들어가지 않습니다. 계약에는 확정 금액 하나만 들어갑니다.",
    help: [
      "계약 금액(확정)은 예산 범위 안이어야 하고, 없으면 동의 요청을 보낼 수 없습니다.",
      "부가세·수수료는 시연판에서 다루지 않습니다.",
      "대금 경로는 거래마다 정합니다. 운영자 수령이 기본입니다.",
    ],
  },
  4: {
    info: "정한 횟수를 넘는 수정은 추가 단가 협의가 필요합니다(산정식 미정).",
    help: [
      `납품 뒤 의뢰인이 ${AUTO_APPROVE_DAYS}일 안에 승인이나 수정 요청을 하지 않으면 자동 승인됩니다. 이 기한은 시연값이며 아직 정해지지 않았습니다.`,
      "수정 요청은 정한 횟수까지만 보낼 수 있습니다.",
    ],
  },
};

function ContractSteps({
  role,
  presetWorker,
  startStep,
  now,
}: {
  role: "worker" | "client";
  presetWorker: string | null;
  startStep: number;
  now: Date;
}) {
  const router = useRouter();
  const choices = counterChoices(role);
  // 작성 중인 값: 같은 탭 안에서는 sessionStorage에 남겨, 확인하기에서 "수정"으로 돌아와도 그대로 둔다.
  // 프로필에서 새로 들어오면(?worker=) 그 창작자로 새로 시작한다.
  const [init] = useState(() => {
    const d = loadDraft();
    if (d && d.role === role && (!presetWorker || presetWorker === d.counterId)) return { draft: d, resumed: true };
    const preset = presetWorker ? findCreator(presetWorker) : undefined;
    const terms: Terms = preset ? { ...emptyTerms(), workType: preset.workType } : emptyTerms();
    return {
      draft: { v: 1 as const, role, counterId: presetWorker ?? choices[0].id, terms, budget: FULL_BUDGET },
      resumed: false,
    };
  });
  const [counterId, setCounterId] = useState(init.draft.counterId);
  const [t, setT] = useState<Terms>(init.draft.terms);
  const [budget, setBudget] = useState<BudgetRange>(init.draft.budget);
  const [amountText, setAmountText] = useState(t.amount ? new Intl.NumberFormat("ko-KR").format(t.amount) : "");
  const [revText, setRevText] = useState(Number.isInteger(t.revisionLimit) ? String(t.revisionLimit) : "");
  const [step, setStep] = useState(init.resumed ? startStep : 1);
  const [reached, setReached] = useState(init.resumed ? LAST_FORM_STEP : 1);
  const [errors, setErrors] = useState<string[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const errRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const selected = choices.find((c) => c.id === counterId) ?? choices[0];
  const up = <K extends keyof Terms>(k: K, v: Terms[K]) => setT((p) => ({ ...p, [k]: v }));

  // 입력이 바뀔 때마다 같은 탭의 sessionStorage에 남긴다(확인하기 페이지로 넘기는 통로)
  useEffect(() => {
    saveDraft({ v: 1, role, counterId: selected.id, terms: t, budget });
  }, [role, selected.id, t, budget]);

  // 단계가 바뀌면 카드 제목으로 포커스(처음 열 때는 건드리지 않는다)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    titleRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  function go(n: number) {
    setErrors([]);
    setHelpOpen(false);
    setStep(n);
    setReached((r) => Math.max(r, n));
  }

  function next() {
    const errs = stepErrors(step, t, budget);
    if (errs.length) {
      setErrors(errs);
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    if (step < LAST_FORM_STEP) return go(step + 1);
    // 마지막 입력 단계: 전체를 다시 보고 확인하기 페이지로
    const bad = firstErrorStep(t, budget);
    if (bad !== null) {
      go(bad);
      setErrors(stepErrors(bad, t, budget));
      return;
    }
    saveDraft({ v: 1, role, counterId: selected.id, terms: t, budget });
    router.push("/new/review/");
  }

  const cur = CONTRACT_STEPS[step - 1];
  const guide = GUIDE[step];
  const rangeMsg = t.amount > 0 ? amountRangeError(t.amount, budget) : null;
  const quick: [string, number][] = [
    ["2주 뒤", 14],
    ["1개월 뒤", 30],
    ["2개월 뒤", 60],
  ];

  return (
    // 회색 바탕을 화면 폭 전체로 깐다(내용 폭은 그대로)
    <div className="bg-muted pb-28 [box-shadow:0_0_0_100vmax_var(--muted)] [clip-path:inset(-2rem_-100vmax_-100vmax)] md:pb-24">
      <div className="pt-2 md:grid md:grid-cols-[200px_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:pt-4">
        <div className="md:sticky md:top-36">
          <Link href="/deals/" className="inline-flex min-h-9 items-center text-sm font-semibold text-ink-2 hover:text-ink">
            ‹ 나가기
          </Link>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight lg:mt-3 lg:text-[34px]">새 계약 만들기</h1>
          <p className="mt-1 text-[13px] text-ink-2">작성한 내용은 이 탭을 닫기 전까지 남아 있습니다.</p>

          {/* 휴대폰: 진행 표시 */}
          <div className="mt-4 md:hidden">
            <p className="text-sm">
              <strong>
                {step}/{CONTRACT_STEPS.length}
              </strong>{" "}
              {cur.title}
            </p>
            <div
              role="progressbar"
              aria-label="작성 단계"
              aria-valuemin={1}
              aria-valuemax={CONTRACT_STEPS.length}
              aria-valuenow={step}
              aria-valuetext={`${CONTRACT_STEPS.length}단계 중 ${step}단계, ${cur.title}`}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
            >
              <div className="h-full bg-ink" style={{ width: `${(step / CONTRACT_STEPS.length) * 100}%` }} />
            </div>
          </div>

          {/* 컴퓨터: 세로 단계 목록 */}
          <ol aria-label="작성 단계" className="mt-8 hidden space-y-1 md:block">
            {CONTRACT_STEPS.map((s) => {
              const done = s.n < step || (s.n <= reached && s.n !== step && s.n !== 5);
              const isNow = s.n === step;
              const canGo = s.n <= reached && s.n <= LAST_FORM_STEP && !isNow;
              const mark = (
                <span
                  aria-hidden="true"
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    isNow || done ? "bg-ink text-on-ink" : "bg-line text-ink-2"
                  }`}
                >
                  {done && !isNow ? (
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : (
                    s.n
                  )}
                </span>
              );
              const text = (
                <span className={isNow ? "font-bold text-ink" : done ? "text-ink" : "text-ink-2"}>
                  {s.title}
                  <span className="sr-only">{isNow ? " (지금 단계)" : done ? " (완료)" : ""}</span>
                </span>
              );
              return (
                <li key={s.n} aria-current={isNow ? "step" : undefined}>
                  {canGo ? (
                    <button type="button" onClick={() => go(s.n)} className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-[15px] hover:bg-card">
                      {mark}
                      {text}
                    </button>
                  ) : (
                    <span className="flex min-h-11 items-center gap-3 px-2 text-[15px]">
                      {mark}
                      {text}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <section aria-labelledby="step-title" className={`${card} mt-5 md:mt-0`}>
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 lg:px-8 lg:py-5">
            <h2 id="step-title" ref={titleRef} tabIndex={-1} className="text-lg font-bold focus:outline-none lg:text-xl">
              {cur.title}
            </h2>
            <button
              type="button"
              aria-expanded={helpOpen}
              aria-controls="step-help"
              onClick={() => setHelpOpen((v) => !v)}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-line px-3 text-[13px] font-semibold text-ink-2 hover:text-ink"
            >
              <span aria-hidden="true" className="inline-flex size-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                ?
              </span>
              도움말
            </button>
          </div>

          <div className="space-y-6 px-4 py-5 lg:px-8 lg:py-7">
            {helpOpen && (
              <div id="step-help" className="rounded-lg border border-line p-3 text-[13px] text-ink-2">
                <ul className="list-disc space-y-1 pl-5">
                  {guide.help.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="flex gap-2 rounded-lg bg-accent-soft p-3 text-[13px] text-ink lg:text-sm">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
              </svg>
              {guide.info}
            </p>

            {errors.length > 0 && (
              <div ref={errRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger focus:outline-none">
                <p className="font-bold">입력을 확인해 주세요</p>
                <ul className="mt-1 list-disc pl-5">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <>
                <Item id="counter" label={role === "worker" ? "의뢰인" : "작업자"} required>
                  <select id="counter" className={inputCls} value={selected.id} onChange={(e) => setCounterId(e.target.value)}>
                    {choices.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Item>
                <Item id="title" label="프로젝트 제목" required>
                  <input
                    id="title"
                    className={inputCls}
                    value={t.title}
                    onChange={(e) => up("title", e.target.value)}
                    placeholder="예: 싱글 타이틀곡 믹싱"
                    maxLength={60}
                  />
                </Item>
                <Item id="workType" label="작업 유형" required>
                  <select id="workType" className={inputCls} value={t.workType} onChange={(e) => up("workType", e.target.value as WorkType)}>
                    {WORK_TYPES.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </Item>
              </>
            )}

            {step === 2 && (
              <>
                <Item id="scope" label="작업 범위" required hint="무엇을, 몇 개, 어떤 기준으로 하는지 적어 주세요.">
                  <textarea
                    id="scope"
                    className={`${inputCls} min-h-32`}
                    value={t.scope}
                    onChange={(e) => up("scope", e.target.value)}
                    aria-describedby="scope-hint"
                    maxLength={500}
                  />
                </Item>
                <fieldset>
                  <legend className="mb-2 text-[15px] font-bold">
                    납품 파일 형식 <Req />
                  </legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {FILE_FORMATS.map((f) => {
                      const on = t.fileFormats.includes(f);
                      return (
                        <label key={f} className={`${choice(on)} items-center gap-2 text-sm`}>
                          <input
                            type="checkbox"
                            className="size-4 accent-ink"
                            checked={on}
                            onChange={() => up("fileFormats", on ? t.fileFormats.filter((x) => x !== f) : [...t.fileFormats, f])}
                          />
                          {f}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <p id="budget-label" className="mb-2 text-[15px] font-bold">
                    예산 범위{" "}
                    <span className="text-[13px] font-normal text-ink-2">
                      (참고용, 계약에 들어가지 않음) · 지금 {budgetText(budget)}
                    </span>
                  </p>
                  <BudgetRangeField value={budget} onChange={setBudget} describedBy="budget-label" />
                </div>

                <Item
                  id="amount"
                  label="계약 금액(확정)"
                  required
                  hint="상대에게 보내고 계약서에 들어가는 금액입니다. 예산 범위 안으로 적어 주세요."
                >
                  <span className="flex items-center rounded-lg border border-line bg-card px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
                    <span aria-hidden="true" className="text-ink-2">
                      ₩
                    </span>
                    <input
                      id="amount"
                      inputMode="numeric"
                      value={amountText}
                      onChange={(e) => {
                        const n = parseWon(e.target.value);
                        setAmountText(n === null ? "" : new Intl.NumberFormat("ko-KR").format(n));
                        up("amount", n ?? 0);
                      }}
                      placeholder="예: 300,000"
                      aria-describedby={`amount-hint${rangeMsg ? " amount-range" : ""}`}
                      aria-invalid={rangeMsg ? true : undefined}
                      className="min-h-12 w-full min-w-0 bg-transparent px-2 text-right text-lg font-bold field-bare focus:outline-none"
                    />
                    <span aria-hidden="true" className="text-ink-2">
                      원
                    </span>
                  </span>
                  <p id="amount-range" aria-live="polite" className="mt-1 min-h-[1.25rem] text-[13px] font-semibold text-danger">
                    {rangeMsg}
                  </p>
                </Item>

                <Item id="deadline" label="최종 납기일" required>
                  <div className="grid grid-cols-3 gap-2">
                    {quick.map(([label, days]) => {
                      const ymd = ymdAfter(now, days);
                      const on = t.deadline === ymd;
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => up("deadline", ymd)}
                          className={`${choice(on)} flex-col items-start gap-0.5 text-left`}
                        >
                          <span className="text-sm font-bold">{label}</span>
                          <span className="text-[12px] text-ink-2">{formatDate(ymd)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <input
                    id="deadline"
                    type="date"
                    className={`${inputCls} mt-2`}
                    value={t.deadline}
                    onChange={(e) => up("deadline", e.target.value)}
                    aria-label="최종 납기일 직접 고르기"
                  />
                </Item>

                <fieldset>
                  <legend className="mb-2 text-[15px] font-bold">
                    대금 경로 <Req />
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["operator", "의뢰인이 운영자 확인 계좌로 입금하고, 검수 승인 뒤 운영자가 작업자에게 지급합니다. 입금 확인·지급은 운영자가 수기로 처리합니다."],
                        ["direct", "의뢰인이 작업자에게 직접 이체합니다. 운영자는 양측이 남긴 송금·수령 확인을 기록으로만 봅니다."],
                      ] as [PaymentRoute, string][]
                    ).map(([v, desc]) => (
                      <label key={v} className={`${choice(t.paymentRoute === v)} gap-3`}>
                        <input
                          type="radio"
                          name="paymentRoute"
                          value={v}
                          checked={t.paymentRoute === v}
                          onChange={() => up("paymentRoute", v)}
                          className="mt-1 size-4 accent-ink"
                        />
                        <span>
                          <span className="block text-sm font-bold">
                            {PAYMENT_ROUTE_LABEL[v]}
                            {v === "operator" && <span className="ml-1 font-normal text-ink-2">(기본)</span>}
                          </span>
                          <span className="block text-[13px] text-ink-2">{desc}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {step === 4 && (
              <div>
                <p id="rev-label" className="mb-2 text-[15px] font-bold">
                  수정 가능 횟수 <Req />
                </p>
                <div className="flex flex-wrap items-center gap-5">
                  <RevisionDial
                    labelledBy="rev-label"
                    value={t.revisionLimit}
                    onChange={(n) => {
                      up("revisionLimit", n);
                      setRevText(String(n));
                    }}
                  />
                  <div className="min-w-0">
                    <label htmlFor="revisionLimit" className="mb-1 block text-[13px] text-ink-2">
                      직접 입력
                    </label>
                    <span className="flex items-center gap-2">
                      <input
                        id="revisionLimit"
                        inputMode="numeric"
                        value={revText}
                        onChange={(e) => {
                          setRevText(e.target.value);
                          up("revisionLimit", parseRevisionText(e.target.value).value);
                        }}
                        aria-describedby="rev-msg"
                        aria-invalid={parseRevisionText(revText).error ? true : undefined}
                        className={`${inputCls} w-24 text-center text-lg font-bold`}
                      />
                      <span className="text-ink-2">회</span>
                    </span>
                    <p id="rev-msg" aria-live="polite" className="mt-1 min-h-[1.25rem] text-[13px] font-semibold text-danger">
                      {parseRevisionText(revText).error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 아래 고정 바: 휴대폰은 하단 탭 위에, 컴퓨터는 화면 맨 아래 */}
      <div className="no-print fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-card md:bottom-0">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-3 md:max-w-3xl lg:max-w-6xl lg:px-8">
          {step > 1 ? (
            <button type="button" onClick={() => go(step - 1)} className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-ink">
              ‹ 이전
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={next} className="inline-flex min-h-11 min-w-32 items-center justify-center rounded-lg bg-accent px-5 text-[15px] font-bold text-on-accent">
            {step < LAST_FORM_STEP ? "다음" : "확인하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Req() {
  return (
    <>
      <span aria-hidden="true" className="text-danger">
        *
      </span>
      <span className="sr-only">(필수)</span>
    </>
  );
}

function Item({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-bold">
        {label} {required && <Req />}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[13px] text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}
