"use client";

import Link from "next/link";
import { OperatorOnly } from "@/components/bits";
import { statusLabel } from "@/lib/deal-machine";
import { formatDate, formatWon } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { agreedAmount } from "@/lib/stats";
import { PAYMENT_ROUTE_LABEL } from "@/lib/types";

export default function LedgerPage() {
  const demo = useDemo();
  if (!demo) return null;
  if (demo.role !== "operator") return <OperatorOnly />;
  const rows = demo.deals.filter((d) => d.agreement);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">대금 장부</h1>
        <p className="mt-1 text-sm text-ink-2">
          계약이 성립한 거래의 대금 흐름입니다. 실제 서비스에서는 이 표가 Notion 대금 장부로 동기화됩니다
          (시연판은 모의, 동기화 없음).
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card" tabIndex={0} role="region" aria-label="대금 장부 표(가로로 스크롤)">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <caption className="sr-only">대금 장부</caption>
          <thead className="bg-muted text-left text-ink-2">
            <tr>
              {["거래", "금액", "입금자명", "입금 확인일", "지급일", "대금 경로", "상태"].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-0">
                <th scope="row" className="px-3 py-2 text-left font-semibold">
                  <Link href={`/deal/?id=${encodeURIComponent(d.id)}`} className="hover:text-accent hover:underline">
                    {d.terms.title}
                  </Link>
                  <span className="block font-normal text-ink-2">
                    {d.client.name} → {d.worker.name}
                  </span>
                </th>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatWon(agreedAmount(d))}</td>
                <td className="whitespace-nowrap px-3 py-2">{d.deposit?.depositorName ?? d.deposit?.reportedDepositorName ?? "-"}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatDate(d.deposit?.confirmedAt)}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatDate(d.payout?.paidAt)}</td>
                <td className="whitespace-nowrap px-3 py-2">{PAYMENT_ROUTE_LABEL[d.terms.paymentRoute]}</td>
                <td className="whitespace-nowrap px-3 py-2">{statusLabel(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-ink-2">
        직접 송금 거래의 입금 확인일·지급일은 작업자가 남긴 수령·정산 확인 시각입니다. 운영자 계좌를 거치지 않습니다.
      </p>
    </div>
  );
}
