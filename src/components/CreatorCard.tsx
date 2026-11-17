"use client";

import Link from "next/link";
import { pct, trustFor, type Creator } from "@/lib/creators";
import { ME_WORKER } from "@/lib/personas";
import type { Deal } from "@/lib/types";

/** 첫 글자 동그라미(사진 대신). 색은 토큰만 쓴다. */
export function Monogram({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-extrabold text-accent ${
        size === "lg" ? "size-14 text-xl" : "size-11 text-base"
      }`}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function CreatorCard({ creator, deals, backQuery }: { creator: Creator; deals: Deal[]; backQuery: string }) {
  const t = trustFor({ party: creator, side: "worker", creator }, deals);
  const href = `/profile/?id=${encodeURIComponent(creator.id)}&from=search${backQuery ? `&${backQuery}` : ""}`;
  return (
    <li className="h-full">
      <Link href={href} className="flex h-full flex-col rounded-xl border border-line bg-card p-4 transition-colors hover:border-accent">
        <div className="flex items-start gap-3">
          <Monogram name={creator.name} />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold leading-snug">
              {creator.name}
              {creator.id === ME_WORKER.id && (
                <span className="ml-1.5 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-[11px] font-semibold text-accent">
                  시연 작업자
                </span>
              )}
            </h3>
            <p className="text-[13px] text-ink-2">{creator.field}</p>
            <p className="mt-1.5 text-sm leading-snug">{creator.intro}</p>
          </div>
        </div>
        <ul aria-label="대표 키워드" className="mb-3 mt-3 flex flex-wrap gap-1.5">
          {creator.keywords.map((k) => (
            <li key={k} className="rounded-full bg-muted px-2.5 py-1 text-[12px] text-ink-2">
              #{k}
            </li>
          ))}
        </ul>
        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px]">
          <div className="flex gap-1">
            <dt className="text-ink-2">완료</dt>
            <dd className="font-semibold">{t.completed}건</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-2">응답률</dt>
            <dd className="font-semibold">{pct(t.responseRate)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-2">재계약률</dt>
            <dd className="font-semibold">{pct(t.recontractRate)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}
