"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  allErrors,
  clearDraft,
  counterChoices,
  firstErrorStep,
  isPausedCreator,
  loadDraft,
  reviewSections,
  type ContractDraft,
} from "@/lib/contract-form";
import { formatDate, formatWon, workTypeText } from "@/lib/format";
import { ME_CLIENT, ME_WORKER } from "@/lib/personas";
import { addDeal, demoNow, useDemo } from "@/lib/store";
import { PAYMENT_ROUTE_LABEL } from "@/lib/types";

/*
 * 계약 만들기 > 확인하기. 작성 중인 값은 같은 탭의 sessionStorage에서 읽는다(정적 내보내기라 서버가 없다).
 * 표와 요약 카드, "동의 요청 보내기"는 모두 같은 draft.terms 하나에서 나온다.
 */
const btnBlack = "inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-4 text-base font-bold text-on-ink";
const btnLine = "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-ink bg-card px-4 text-[15px] font-bold text-ink";
const NOTE = "동의 요청을 보내면, 상대가 동의한 뒤에는 조건을 바꿀 수 없습니다. 동의하면 조건이 잠기고 해시값과 동의 시각이 기록됩니다.";

export default function ReviewPage() {
  const demo = useDemo();
  if (!demo) return null;
  // demo를 불러온 뒤(브라우저에서만) 그리므로 sessionStorage를 바로 읽어도 된다
  return <ReviewView key={demo.role} role={demo.role} now={demoNow(demo)} />;
}

function Notice({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-ink-2">{body}</p>
      <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 font-bold text-on-accent">
        {cta}
      </Link>
    </div>
  );
}

function ReviewView({ role, now }: { role: "worker" | "client" | "operator"; now: Date }) {
  const router = useRouter();
  const [draft] = useState<ContractDraft | null>(() => loadDraft());
  const [tab, setTab] = useState("rv-summary");
  const sending = useRef(false);
  const [error, setError] = useState("");

  if (!draft)
    return (
      <Notice
        title="확인할 계약이 없습니다"
        body="작성 중인 내용은 같은 탭 안에서만 넘어옵니다. 계약 만들기 첫 단계부터 작성해 주세요."
        href="/new/"
        cta="계약 만들기로"
      />
    );
  if (role === "operator" || role !== draft.role)
    return (
      <Notice
        title="역할이 바뀌었습니다"
        body={`이 계약은 ${draft.role === "worker" ? "작업자" : "의뢰인"} 역할로 작성했습니다. 위에서 역할을 되돌리거나 새로 작성해 주세요.`}
        href="/new/"
        cta="계약 만들기로"
      />
    );
  const counter = counterChoices(draft.role).find((c) => c.id === draft.counterId);
  if (!counter || (draft.role === "client" && isPausedCreator(draft.counterId)))
    return <Notice title="계약 상대를 다시 골라 주세요" body="고른 상대와는 지금 계약을 만들 수 없습니다." href="/new/?step=1" cta="상대 고르기" />;
  const bad = firstErrorStep(draft.terms, draft.budget);
  if (bad !== null || allErrors(draft.terms, draft.budget).length)
    return (
      <Notice
        title="아직 다 적지 않았습니다"
        body="비어 있거나 맞지 않는 항목이 있습니다. 해당 단계에서 고쳐 주세요."
        href={`/new/?step=${bad ?? 1}`}
        cta="고치러 가기"
      />
    );

  const terms = draft.terms;
  const counterLabel = draft.role === "worker" ? "의뢰인" : "작업자";
  const sections = reviewSections(terms, { label: counterLabel, name: counter.name }, now);

  function send() {
    // 빠르게 두 번 눌러도 거래가 한 번만 만들어지게 막는다.
    if (sending.current) return;
    sending.current = true;
    const r = addDeal({
      terms,
      worker: draft!.role === "worker" ? ME_WORKER : counter!,
      client: draft!.role === "worker" ? counter! : ME_CLIENT,
    });
    if (!r.ok) {
      sending.current = false;
      setError(r.message);
      return;
    }
    clearDraft();
    router.push(`/deal/?id=${encodeURIComponent(r.id!)}`);
  }

  const summary: [string, string][] = [
    ["작업", terms.title.trim()],
    ["작업 유형", workTypeText(terms)],
    [counterLabel, counter.name],
    ["대금 경로", PAYMENT_ROUTE_LABEL[terms.paymentRoute]],
    ["수정 횟수", `${terms.revisionLimit}회`],
    ["마감일", formatDate(terms.deadline)],
  ];

  return (
    <div className="pb-28 md:pb-0">
      <Link href="/new/?step=4" className="inline-flex min-h-9 items-center text-sm font-semibold text-ink-2 hover:text-ink">
        ‹ 계속 수정하기
      </Link>
      <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight lg:text-[34px]">계약 내용 확인</h1>
      <p className="mt-1 text-sm text-ink-2">보내기 전에 계약에 들어갈 조건을 한 번에 확인합니다.</p>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <nav aria-label="확인 항목" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
            <ul className="flex border-b border-line">
              {sections.map((s) => (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={tab === s.id ? "true" : undefined}
                    onClick={() => {
                      setTab(s.id);
                      const el = document.getElementById(s.id);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      el?.focus({ preventScroll: true });
                    }}
                    className={`-mb-px min-h-11 whitespace-nowrap border-b-2 px-3 text-[15px] md:px-4 ${
                      tab === s.id ? "border-ink font-bold text-ink" : "border-transparent text-ink-2 hover:text-ink"
                    }`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <table className="mt-4 w-full border-collapse border border-line text-[15px]">
            <caption className="sr-only">계약에 들어갈 조건</caption>
            {sections.map((s) => (
              <tbody key={s.id}>
                <tr>
                  <th colSpan={2} scope="colgroup" className="border border-line bg-muted px-4 py-3 text-left">
                    <span className="flex items-center justify-between gap-3">
                      <span id={s.id} tabIndex={-1} className="scroll-mt-48 font-bold focus:outline-none">
                        {s.title}
                      </span>
                      <Link href={`/new/?step=${s.step}`} className="text-[13px] font-semibold text-ink underline">
                        수정<span className="sr-only">: {s.title}</span>
                      </Link>
                    </span>
                  </th>
                </tr>
                {s.rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className="w-[42%] border border-line px-4 py-3 text-left align-top font-normal text-ink-2 sm:w-[34%]">
                      {r.label}
                    </th>
                    <td className="border border-line px-4 py-3 align-top">
                      {r.check === undefined ? (
                        <span className="whitespace-pre-wrap font-semibold">{r.text}</span>
                      ) : (
                        <>
                          <span aria-hidden="true" className={r.check ? "font-bold text-ink" : "text-ink-2"}>
                            {r.check ? "✓" : "—"}
                          </span>
                          <span className="sr-only">{r.text}</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          <p className="mt-3 text-[13px] text-ink-2">
            예산 범위는 금액을 정할 때만 쓰고 계약에는 들어가지 않습니다. 위 표가 상대에게 보내는 조건 전부입니다.
          </p>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="mt-5 hidden md:block lg:hidden">
            <button type="button" onClick={send} className={btnBlack}>
              이 내용으로 동의 요청 보내기
            </button>
          </div>
        </div>

        {/* 컴퓨터: 오른쪽 고정 요약 카드 */}
        <aside aria-labelledby="sum-amount" className="hidden lg:sticky lg:top-40 lg:block">
          <div className="rounded-lg border border-line bg-card p-5">
            <p className="text-[13px] text-ink-2">계약 금액(확정)</p>
            <p id="sum-amount" className="mt-1 text-3xl font-extrabold tracking-tight">
              {formatWon(terms.amount)}
            </p>
            <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
              {summary.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-ink-2">{k}</dt>
                  <dd className="min-w-0 text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg bg-muted p-3 text-[13px] text-ink-2">{NOTE}</p>
            <div className="mt-4 space-y-2">
              <Link href="/new/?step=4" className={btnLine}>
                ← 계속 수정하기
              </Link>
              <button type="button" onClick={send} className={btnBlack}>
                이 내용으로 동의 요청 보내기
              </button>
            </div>
          </div>
        </aside>
      </div>

      <p className="mt-4 text-[13px] text-ink-2 lg:hidden">{NOTE}</p>

      {/* 휴대폰: 아래 고정 바(하단 탭 위) */}
      <div className="no-print fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-card md:hidden">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[12px] text-ink-2">계약 금액(확정)</p>
            <p className="text-lg font-extrabold">{formatWon(terms.amount)}</p>
          </div>
          <button type="button" onClick={send} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-ink px-4 text-[15px] font-bold text-on-ink">
            동의 요청 보내기
          </button>
        </div>
      </div>
    </div>
  );
}
