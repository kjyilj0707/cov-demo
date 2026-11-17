"use client";

import { useState } from "react";
import { Field, btnPrimary, inputCls } from "@/components/bits";
import { MAX_REVISION_LIMIT, WORK_TYPE_DETAIL_MAX, validateTerms } from "@/lib/deal-machine";
import { FILE_FORMATS, PAYMENT_ROUTE_LABEL, WORK_TYPES, type PaymentRoute, type Terms, type WorkType } from "@/lib/types";

export function emptyTerms(): Terms {
  return {
    title: "",
    workType: "믹싱·마스터링",
    amount: 0,
    deadline: "",
    revisionLimit: 2,
    fileFormats: [],
    scope: "",
    paymentRoute: "operator",
  };
}

/**
 * 계약 조건 입력 폼. 여기서 하는 검사는 사용자 편의용이고,
 * 같은 검사가 deal-machine(시연판의 "서버" 역할)에서 다시 돈다.
 */
export function TermsForm({
  initial,
  submitLabel,
  onSubmit,
  before,
  onChange,
}: {
  initial: Terms;
  submitLabel: string;
  onSubmit: (t: Terms) => string | null;
  before?: React.ReactNode;
  /** 입력이 바뀔 때마다 알린다(요약 미리보기용). 금액은 입력한 숫자만 뽑아 넘긴다. */
  onChange?: (t: Terms) => void;
}) {
  const [t, setT] = useState<Terms>(initial);
  const [amountText, setAmountText] = useState(initial.amount ? String(initial.amount) : "");
  const [errors, setErrors] = useState<string[]>([]);

  const toAmount = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "");
    return digits ? Number(digits) : 0;
  };
  const up = <K extends keyof Terms>(k: K, v: Terms[K]) => {
    const next = { ...t, [k]: v };
    setT(next);
    onChange?.({ ...next, amount: toAmount(amountText) });
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const digits = amountText.replace(/[^0-9]/g, "");
    const terms = { ...t, amount: digits ? Number(digits) : 0 };
    const errs = validateTerms(terms);
    if (errs.length) {
      setErrors(errs);
      return;
    }
    const serverErr = onSubmit(terms);
    setErrors(serverErr ? [serverErr] : []);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          <p className="font-bold">입력을 확인해 주세요</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {before}

      <Field id="title" label="프로젝트 제목">
        <input
          id="title"
          className={inputCls}
          value={t.title}
          onChange={(e) => up("title", e.target.value)}
          placeholder="예: 싱글 타이틀곡 믹싱"
          maxLength={60}
          required
        />
      </Field>

      <Field id="workType" label="작업 유형">
        <select
          id="workType"
          className={inputCls}
          value={t.workType}
          onChange={(e) => up("workType", e.target.value as WorkType)}
        >
          {WORK_TYPES.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </Field>

      {t.workType === "기타" && (
        <Field id="workTypeDetail" label="기타 작업 내용" hint={`예: 라이브 음원 편집 (${WORK_TYPE_DETAIL_MAX}자 이내)`}>
          <input
            id="workTypeDetail"
            className={inputCls}
            value={t.workTypeDetail ?? ""}
            onChange={(e) => up("workTypeDetail", e.target.value)}
            maxLength={WORK_TYPE_DETAIL_MAX}
            aria-describedby="workTypeDetail-hint"
            required
          />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="amount" label="금액(원)" hint="부가세·수수료는 시연판에서 다루지 않습니다.">
          <input
            id="amount"
            className={inputCls}
            inputMode="numeric"
            value={amountText}
            onChange={(e) => {
              setAmountText(e.target.value);
              onChange?.({ ...t, amount: toAmount(e.target.value) });
            }}
            placeholder="예: 300000"
            aria-describedby="amount-hint"
            required
          />
        </Field>
        <Field id="deadline" label="최종 납기일">
          <input
            id="deadline"
            type="date"
            className={inputCls}
            value={t.deadline}
            onChange={(e) => up("deadline", e.target.value)}
            required
          />
        </Field>
      </div>

      <Field
        id="revisionLimit"
        label="수정 가능 횟수"
        hint="이 횟수를 넘는 수정은 추가 단가 협의가 필요합니다(산정식 미정)."
      >
        <input
          id="revisionLimit"
          type="number"
          min={0}
          max={MAX_REVISION_LIMIT}
          className={inputCls}
          value={Number.isNaN(t.revisionLimit) ? "" : t.revisionLimit}
          onChange={(e) => up("revisionLimit", e.target.value === "" ? NaN : Number(e.target.value))}
          aria-describedby="revisionLimit-hint"
        />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">납품 파일 형식</legend>
        <div className="flex flex-wrap gap-2">
          {FILE_FORMATS.map((f) => {
            const on = t.fileFormats.includes(f);
            return (
              <label
                key={f}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                  on ? "border-accent bg-accent-soft text-accent" : "border-line bg-card text-ink"
                }`}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={on}
                  onChange={() =>
                    up("fileFormats", on ? t.fileFormats.filter((x) => x !== f) : [...t.fileFormats, f])
                  }
                />
                {f}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field id="scope" label="작업 범위 설명" hint="무엇을, 몇 개, 어떤 기준으로 하는지 적어 주세요.">
        <textarea
          id="scope"
          className={`${inputCls} min-h-28`}
          value={t.scope}
          onChange={(e) => up("scope", e.target.value)}
          aria-describedby="scope-hint"
          maxLength={500}
          required
        />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">대금 경로</legend>
        <div className="space-y-2">
          {(
            [
              ["operator", "의뢰인이 운영자 확인 계좌로 입금하고, 검수 승인 뒤 운영자가 작업자에게 지급합니다. 입금 확인·지급은 운영자가 수기로 처리합니다."],
              ["direct", "의뢰인이 작업자에게 직접 이체합니다. 운영자는 양측이 남긴 송금·수령 확인을 기록으로만 봅니다."],
            ] as [PaymentRoute, string][]
          ).map(([v, desc]) => (
            <label
              key={v}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                t.paymentRoute === v ? "border-accent bg-accent-soft" : "border-line bg-card"
              }`}
            >
              <input
                type="radio"
                name="paymentRoute"
                value={v}
                checked={t.paymentRoute === v}
                onChange={() => up("paymentRoute", v)}
                className="mt-1 size-4 accent-accent"
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

      <button type="submit" className={`${btnPrimary} w-full py-4`}>
        {submitLabel}
      </button>
    </form>
  );
}
