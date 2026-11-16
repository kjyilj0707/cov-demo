"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { btnPrimary } from "@/components/bits";
import { formatDate, formatDateTime, formatWon } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { PAYMENT_ROUTE_LABEL } from "@/lib/types";

export default function PrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintView />
    </Suspense>
  );
}

/**
 * 인쇄용 계약 요약. 실제 서비스의 "PDF 사본 양측 발송"을 흉내 낸다.
 * 법률 문구는 지어내지 않는다. 표준계약서 템플릿이 정해지면 그 문장만 넣는다.
 */
function PrintView() {
  const id = useSearchParams().get("id") ?? "";
  const demo = useDemo();
  if (!demo) return null;
  const deal = demo.deals.find((d) => d.id === id);
  if (!deal || !deal.agreement) {
    return (
      <p className="py-16 text-center text-ink-2">
        계약이 성립한 거래만 요약을 볼 수 있습니다.{" "}
        <Link href="/" className="font-semibold text-accent underline">
          홈으로
        </Link>
      </p>
    );
  }
  const a = deal.agreement;
  const t = a.snapshot;
  return (
    <article className="space-y-4 rounded-2xl border border-line bg-card p-5 print:border-0 print:p-0">
      <div className="no-print flex items-center justify-between gap-2">
        <Link href={`/deal/?id=${encodeURIComponent(deal.id)}`} className="text-sm font-semibold text-ink-2">
          ← 거래로 돌아가기
        </Link>
        <button type="button" className={btnPrimary} onClick={() => window.print()}>
          인쇄 / PDF로 저장
        </button>
      </div>

      <header>
        <p className="text-[13px] text-ink-2">CoV 계약 조건 요약 · 시연판 견본</p>
        <h1 className="mt-1 text-xl font-extrabold">{t.title}</h1>
      </header>

      <p className="rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
        이 문서는 양측이 동의한 조건을 정리한 시연용 요약입니다. 계약서 본문(법률 문구)은 표준계약서 템플릿이 정해진 뒤
        그 문장만 넣을 예정이며, 시연판에는 없습니다. 실제 이메일 발송도 하지 않습니다.
      </p>

      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">동의한 계약 조건</caption>
        <tbody>
          {(
            [
              ["작업자", deal.worker.name],
              ["의뢰인", deal.client.name],
              ["작업 유형", t.workType],
              ["금액", formatWon(t.amount)],
              ["최종 납기일", formatDate(t.deadline)],
              ["수정 가능 횟수", `${t.revisionLimit}회`],
              ["납품 파일 형식", t.fileFormats.join(", ")],
              ["대금 경로", PAYMENT_ROUTE_LABEL[t.paymentRoute]],
              ["작업 범위", t.scope],
              ["계약 성립 시각", formatDateTime(a.agreedAt)],
              ["조건 스냅샷 SHA-256", a.hash],
              ["거래번호", deal.id],
            ] as [string, string][]
          ).map(([k, v]) => (
            <tr key={k} className="border-b border-line align-top">
              <th scope="row" className="w-32 py-2 pr-3 text-left font-medium text-ink-2">
                {k}
              </th>
              <td className={`py-2 ${k.includes("SHA") ? "break-all font-mono text-[12px]" : ""}`}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[13px] text-ink-2">
        PDF 사본 발송 대상: {deal.worker.name}, {deal.client.name} (모의 표시)
      </p>
    </article>
  );
}
