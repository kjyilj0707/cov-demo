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

type IconName = "home" | "list" | "plus" | "user" | "check" | "book";
type Tab = { href: string; label: string; icon: IconName; also?: string[] };

/** 하단 탭 아이콘. 색은 currentColor(글자색 토큰)를 따른다. */
function TabIcon({ name }: { name: IconName }) {
  const d: Record<IconName, string> = {
    home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
    plus: "M12 5v14M5 12h14",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
    check: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d[name]} />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const demo = useDemo();
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const role = demo?.role ?? "worker";
  const tabs: Tab[] =
    role === "operator"
      ? [
          { href: "/", label: "홈", icon: "home" },
          { href: "/deals/", label: "전체 거래", icon: "list", also: ["/deal/"] },
          { href: "/admin/", label: "운영", icon: "check" },
          { href: "/ledger/", label: "대금 장부", icon: "book" },
          { href: "/profile/", label: "프로필", icon: "user" },
        ]
      : [
          { href: "/", label: "홈", icon: "home" },
          // 계약 상세(/deal/)는 거래 목록에서 들어가는 하위 화면이라 "나의 거래"를 켠다.
          { href: "/deals/", label: "나의 거래", icon: "list", also: ["/deal/"] },
          { href: "/new/", label: "계약 만들기", icon: "plus" },
          { href: "/profile/", label: "프로필", icon: "user" },
        ];

  const isActive = (t: Tab) =>
    t.href === "/" ? pathname === "/" : [t.href, ...(t.also ?? [])].some((h) => pathname === h || pathname === h.replace(/\/$/, "") || pathname.startsWith(h));

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        본문으로 건너뛰기
      </a>

      <div role="note" className="no-print bg-ink px-4 py-2 text-center text-[13px] leading-snug text-on-ink">
        <strong className="font-semibold">시범거래 안내</strong>: 결제대행(PG) 미연동. 대금은 운영자가 수기로
        확인·전달합니다. <span className="opacity-80">이 화면의 모든 이름·계좌·거래는 가상입니다.</span>
      </div>

      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pt-3">
          <Link href="/" aria-label="CoV 시연판 홈" className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[22px] font-black leading-none tracking-tight text-ink">
              C<span className="text-accent">o</span>V
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-ink-2">시연판</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setToolsOpen((v) => !v);
                setLoginOpen(false);
              }}
              aria-expanded={toolsOpen}
              aria-controls="demo-tools"
              className="min-h-9 rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-medium text-ink-2"
            >
              시연 도구
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginOpen((v) => !v);
                setToolsOpen(false);
              }}
              aria-expanded={loginOpen}
              aria-controls="login-note"
              className="min-h-9 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-on-ink"
            >
              로그인
            </button>
          </div>
        </div>

        {loginOpen && (
          <div id="login-note" className="mx-auto w-full max-w-xl px-4 pt-2">
            <div role="status" className="rounded-xl border border-line bg-card p-3 text-[13px] text-ink-2">
              <p className="font-semibold text-ink">시연판에는 로그인이 없습니다.</p>
              <p className="mt-1">
                아래의 역할 버튼(작업자 / 의뢰인 / 운영자)을 눌러 보는 사람을 바꿔 주세요. 실제 서비스에서는 이메일·구글·카카오로
                로그인합니다.
              </p>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                className="mt-2 font-semibold text-accent underline"
              >
                닫기
              </button>
            </div>
          </div>
        )}

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
        <ul className="mx-auto flex w-full max-w-xl pb-[env(safe-area-inset-bottom)]">
          {tabs.map((t) => {
            const on = isActive(t);
            return (
              <li key={t.href} className="min-w-0 flex-1">
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 px-1 text-[12px] font-semibold leading-none ${
                    on ? "text-accent" : "text-ink-2"
                  }`}
                >
                  <TabIcon name={t.icon} />
                  <span className="truncate">{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
