"use client";

import Link from "next/link";
import { Card, OperatorOnly, StatusBadge } from "@/components/bits";
import { TERMINAL } from "@/lib/deal-machine";
import { formatDateTime, formatWon } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { agreedAmount } from "@/lib/stats";
import type { Deal } from "@/lib/types";

export default function AdminPage() {
  const demo = useDemo();
  if (!demo) return null;
  if (demo.role !== "operator") return <OperatorOnly />;

  const deals = demo.deals;
  const op = deals.filter((d) => d.terms.paymentRoute === "operator");
  const depositQueue = op.filter((d) => d.status === "deposit_reported");
  const waitingDeposit = op.filter((d) => d.status === "awaiting_deposit");
  const payoutQueue = op.filter((d) => d.status === "awaiting_payout");
  const disputes = deals.filter((d) => d.status === "disputed");
  const directActive = deals.filter((d) => d.terms.paymentRoute === "direct" && !TERMINAL.includes(d.status));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">운영자 화면</h1>
        <p className="mt-1 text-sm text-ink-2">
          입금 확인과 지급은 통장을 직접 보고 수기로 처리합니다. 처리 버튼은 각 거래 화면 아래에 있습니다.
        </p>
      </div>

      <Queue
        title="입금 확인 대기"
        desc="의뢰인이 '이체했어요'를 누른 거래. 통장에서 입금자명·금액을 확인하세요."
        deals={depositQueue}
        extra={(d) => `알린 입금자명 ${d.deposit?.reportedDepositorName ?? "-"} · ${formatDateTime(d.deposit?.reportedAt)}`}
      />
      <Queue
        title="지급 대기"
        desc="검수가 끝난 거래. 작업자에게 송금한 뒤 '지급 완료'를 누르세요."
        deals={payoutQueue}
        extra={(d) => `작업자 ${d.worker.name}에게 지급`}
      />
      <Queue
        title="분쟁 목록"
        desc="분쟁 사유와 해소 내용은 상태 이력에 남습니다."
        deals={disputes}
        extra={(d) => d.history.at(-1)?.reason ?? ""}
      />
      <Queue
        title="입금 전(의뢰인 이체 대기)"
        desc="아직 의뢰인이 이체를 알리지 않은 거래."
        deals={waitingDeposit}
        extra={(d) => `계약 성립 ${formatDateTime(d.agreement?.agreedAt)}`}
      />
      <Queue
        title="직접 송금 거래(기록만 보기)"
        desc="의뢰인과 작업자가 직접 주고받습니다. 운영자는 양측 확인 기록만 봅니다."
        deals={directActive}
        extra={() => ""}
      />

      <Link href="/ledger/" className="block text-center text-sm font-semibold text-accent underline">
        대금 장부 전체 보기
      </Link>
    </div>
  );
}

function Queue({
  title,
  desc,
  deals,
  extra,
}: {
  title: string;
  desc: string;
  deals: Deal[];
  extra: (d: Deal) => string;
}) {
  const id = `q-${title}`;
  return (
    <Card aria-labelledby={id}>
      <h2 id={id} className="flex items-center gap-2 text-base font-bold">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-xs ${deals.length ? "bg-accent text-white" : "bg-line text-ink-2"}`}>
          {deals.length}
        </span>
      </h2>
      <p className="mt-1 text-[13px] text-ink-2">{desc}</p>
      {deals.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">없음</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {deals.map((d) => (
            <li key={d.id}>
              <Link href={`/deal/?id=${encodeURIComponent(d.id)}`} className="flex items-start justify-between gap-3 py-2.5 hover:text-accent">
                <span className="min-w-0">
                  <span className="block font-semibold">{d.terms.title}</span>
                  <span className="block text-[13px] text-ink-2">
                    {formatWon(agreedAmount(d))} · {d.client.name} → {d.worker.name}
                  </span>
                  {extra(d) && <span className="block text-[13px] text-ink-2">{extra(d)}</span>}
                </span>
                <StatusBadge deal={d} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
