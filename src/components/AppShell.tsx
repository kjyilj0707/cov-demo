"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AUTO_APPROVE_DAYS } from "@/lib/deal-machine";
import { formatDateTime } from "@/lib/format";
import { ROLE_PERSONA } from "@/lib/personas";
import { demoNow, fastForward, resetDemo, setRole, useDemo } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["worker", "client", "operator"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const demo = useDemo();
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const role = demo?.role ?? "worker";
  const tabs =
    role === "operator"
      ? [
          { href: "/", label: "홈" },
          { href: "/admin/", label: "운영" },
          { href: "/ledger/", label: "대금 장부" },
          { href: "/profile/", label: "프로필" },
        ]
      : [
          { href: "/", label: "홈" },
          { href: "/new/", label: "계약" },
          { href: "/profile/", label: "프로필" },
        ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        본문으로 건너뛰기
      </a>

      <div role="note" className="no-print bg-ink px-4 py-2 text-center text-[13px] leading-snug text-white">
        <strong className="font-semibold">시범거래 안내</strong>: 결제대행(PG) 미연동. 대금은 운영자가 수기로
        확인·전달합니다. <span className="opacity-80">이 화면의 모든 이름·계좌·거래는 가상입니다.</span>
      </div>

      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pt-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            CoV <span className="text-sm font-medium text-ink-2">시연판</span>
          </Link>
          <button
            type="button"
            onClick={() => setToolsOpen((v) => !v)}
            aria-expanded={toolsOpen}
            aria-controls="demo-tools"
            className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-medium text-ink-2"
          >
            시연 도구
          </button>
        </div>

        <fieldset className="mx-auto w-full max-w-xl px-4 pb-3 pt-2">
          <legend className="sr-only">보는 역할 바꾸기</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-line/60 p-1">
            {ROLES.map((r) => {
              const p = ROLE_PERSONA[r];
              const checked = role === r;
              return (
                <label
                  key={r}
                  className={`cursor-pointer rounded-lg px-2 py-1.5 text-center text-[13px] leading-tight has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                    checked ? "bg-card font-semibold text-ink shadow-sm" : "text-ink-2"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={checked}
                    onChange={() => setRole(r)}
                    className="sr-only"
                    disabled={!demo}
                  />
                  <span className="block">{p.title}</span>
                  <span className="block truncate text-[11px] font-normal text-ink-2">{p.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {toolsOpen && (
          <div id="demo-tools" className="mx-auto w-full max-w-xl px-4 pb-3">
            <div className="rounded-xl border border-line bg-card p-3 text-[13px] text-ink-2">
              <p>
                시연 시각: <strong className="text-ink">{demo ? formatDateTime(demoNow(demo).toISOString()) : "-"}</strong>
                {demo && demo.clockOffsetMs > 0 && (
                  <span> (실제보다 {Math.round(demo.clockOffsetMs / 86400_000)}일 뒤)</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-accent-soft px-3 py-2 font-semibold text-accent"
                  onClick={() => {
                    fastForward(AUTO_APPROVE_DAYS);
                    setNotice(`시간을 ${AUTO_APPROVE_DAYS}일 빨리 감았습니다. 검수 기한이 지난 거래는 자동 승인됩니다.`);
                  }}
                >
                  시간 {AUTO_APPROVE_DAYS}일 빨리 감기
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-line px-3 py-2 font-semibold text-ink"
                  onClick={async () => {
                    if (!window.confirm("시연 데이터를 처음 상태로 되돌릴까요? 지금까지 만든 거래가 사라집니다.")) return;
                    await resetDemo();
                    setNotice("시연 데이터를 처음 상태로 되돌렸습니다.");
                  }}
                >
                  시연 데이터 초기화
                </button>
              </div>
              <p role="status" className="mt-2 min-h-[1em] text-ink">
                {notice}
              </p>
            </div>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pb-40 pt-4">
        {demo ? children : <p className="py-16 text-center text-ink-2">시연 데이터를 불러오는 중…</p>}
      </main>

      <nav
        aria-label="주요 메뉴"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-xl">
          {tabs.map((t) => (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={isActive(t.href) ? "page" : undefined}
                className={`flex h-14 items-center justify-center text-[13px] font-semibold ${
                  isActive(t.href) ? "text-accent" : "text-ink-2"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
