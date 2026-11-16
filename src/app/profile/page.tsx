"use client";

import { useState } from "react";
import { Card } from "@/components/bits";
import { CLIENT_CHOICES, ME_CLIENT, ME_WORKER } from "@/lib/personas";
import { useDemo } from "@/lib/store";
import { trustProfile } from "@/lib/stats";
import type { Party } from "@/lib/types";

type Option = { key: string; side: "worker" | "client"; party: Party };

const OPTIONS: Option[] = [
  { key: `w:${ME_WORKER.id}`, side: "worker", party: ME_WORKER },
  ...CLIENT_CHOICES.map<Option>((p) => ({ key: `c:${p.id}`, side: "client", party: p })),
];

function pct(n: number | null): string {
  return n === null ? "기록 없음" : `${Math.round(n * 100)}%`;
}

export default function ProfilePage() {
  const demo = useDemo();
  const [picked, setPicked] = useState<string | null>(null);
  if (!demo) return null;
  const defaultKey = demo.role === "client" ? `c:${ME_CLIENT.id}` : `w:${ME_WORKER.id}`;
  const opt = OPTIONS.find((o) => o.key === (picked ?? defaultKey)) ?? OPTIONS[0];
  const p = trustProfile(demo.deals, opt.side, opt.party.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">신뢰도 프로필</h1>
        <p className="mt-1 text-sm text-ink-2">시연 데이터에서 계산한 값입니다. 지표의 정확한 정의는 아직 정해지지 않았습니다.</p>
      </div>

      <div>
        <label htmlFor="who" className="mb-1 block text-sm font-semibold">
          누구의 프로필
        </label>
        <select
          id="who"
          className="w-full rounded-xl border border-line bg-card px-3 py-2.5"
          value={opt.key}
          onChange={(e) => setPicked(e.target.value)}
        >
          {OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.party.name} ({o.side === "worker" ? "작업자" : "의뢰인"})
            </option>
          ))}
        </select>
      </div>

      <Card aria-labelledby="pf-name">
        <p className="text-[13px] text-ink-2">{opt.side === "worker" ? "작업자" : "의뢰인"}</p>
        <h2 id="pf-name" className="text-lg font-extrabold">
          {opt.party.name}
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="완료 건수" value={`${p.completed}건`} />
          <Stat label="응답률" value={pct(p.responseRate)} />
          <Stat label="재계약률" value={pct(p.recontractRate)} />
        </dl>
      </Card>

      <Card aria-labelledby="pf-def">
        <h2 id="pf-def" className="text-base font-bold">
          이렇게 계산했어요(시연용 정의)
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li>
            <strong className="text-ink">완료 건수</strong>: 정산 완료까지 간 거래 수.
          </li>
          <li>
            <strong className="text-ink">응답률</strong>: 받은 요청(조건 동의 요청,{" "}
            {opt.side === "worker" ? "수정 요청" : "검수 요청"}) 중 직접 응답한 비율.
            {opt.side === "client" && " 무응답 자동 승인은 응답하지 않은 것으로 셉니다."} 아직 기다리는 요청은 뺍니다.
            지금 {p.requests}건 중 {p.responded}건.
          </li>
          <li>
            <strong className="text-ink">재계약률</strong>: 거래한 상대 중 2건 이상 거래한 상대의 비율(취소 제외). 지금{" "}
            {p.counterparties}명 중 {p.repeatCounterparties}명.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper p-3">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold">{value}</dd>
    </div>
  );
}
