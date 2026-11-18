"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { setRole } from "@/lib/store";
import { ROLE_LABEL, type Deal, type Role } from "@/lib/types";

/**
 * 초대 링크(조건 동의 전 거래에만).
 * - 초안을 만든 쪽: 링크 복사 + 카톡·DM 안내 + 시연용 "상대로 보기"(헤더 역할 전환과 같은 일).
 * - 링크로 들어온 상대(?invite=1): 누가 보낸 계약인지 안내.
 *
 * 시연판에는 서버가 없어 거래가 이 브라우저에만 저장된다. 그래서 링크를 다른 기기에서 열면 거래가 보이지 않고,
 * "상대로 보기"로 같은 브라우저에서 상대 화면을 흉내 낸다. 실제 서비스에서는 링크를 연 사람이 로그인하면
 * 서버가 그 계정을 이 거래의 상대로 붙이고, 링크 하나로 한 번만 쓰게 하는 등 권한 검사도 서버가 한다.
 */
export function InvitePanel({ deal, role, invited, justCreated }: { deal: Deal; role: Role; invited: boolean; justCreated: boolean }) {
  if (deal.status !== "proposed") return null;
  const proposer = deal.proposedBy;
  const counter: "worker" | "client" = proposer === "worker" ? "client" : "worker";
  if (role === proposer) return <SenderBox deal={deal} counter={counter} justCreated={justCreated} />;
  if (role === counter && invited) return <InvitedBox deal={deal} proposer={proposer} />;
  return null;
}

function inviteUrl(dealId: string): string {
  if (typeof window === "undefined") return "";
  const u = new URL(window.location.href);
  u.search = new URLSearchParams({ id: dealId, invite: "1" }).toString();
  u.hash = "";
  return u.toString();
}

function SenderBox({ deal, counter, justCreated }: { deal: Deal; counter: "worker" | "client"; justCreated: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const url = inviteUrl(deal.id);
  const counterName = deal[counter].name;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMsg("초대 링크를 복사했습니다. 카톡·DM 대화창에 붙여 넣어 보내 주세요.");
    } catch {
      // 클립보드를 쓸 수 없는 브라우저: 링크 칸을 골라 두고 직접 복사하게 한다
      inputRef.current?.select();
      setMsg("자동 복사가 막혀 있습니다. 링크 칸이 선택되어 있으니 길게 누르거나 Ctrl+C로 복사해 주세요.");
    }
  }

  return (
    <section aria-labelledby="invite-title" className="rounded-2xl border border-ink bg-card p-4">
      {justCreated && <p className="mb-1 text-[13px] font-semibold text-accent">계약 초안을 만들었습니다</p>}
      <h2 id="invite-title" className="text-base font-bold">
        {counterName}에게 초대 링크 보내기
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
        링크를 복사해 이미 이야기 나누던 카톡·DM에 붙여 넣으세요. 상대가 링크로 들어와 조건에 동의하면 계약이 성립하고 조건이 잠깁니다.
      </p>
      <label htmlFor="invite-url" className="sr-only">
        초대 링크
      </label>
      <input
        ref={inputRef}
        id="invite-url"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-3 w-full truncate rounded-lg border border-line bg-muted px-3 py-2 text-[13px] text-ink-2"
      />
      <button
        type="button"
        onClick={copy}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-[15px] font-bold text-on-accent"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 9h10v10H9zM5 15V5h10" />
        </svg>
        초대 링크 복사
      </button>
      <p role="status" aria-live="polite" className="mt-2 min-h-[1em] text-[13px] font-semibold text-ink">
        {msg}
      </p>

      <div className="mt-3 rounded-lg bg-muted p-3 text-[13px] text-ink-2">
        <p>
          <strong className="text-ink">시연판 안내</strong>: 거래가 이 브라우저에만 저장되어, 다른 기기에서 링크를 열면 거래가 보이지
          않습니다. 아래 버튼으로 상대가 링크를 열었을 때의 화면을 확인하세요.
        </p>
        <button
          type="button"
          onClick={() => {
            setRole(counter);
            router.replace(`/deal/?id=${encodeURIComponent(deal.id)}&invite=1`, { scroll: false });
          }}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-ink bg-card px-4 text-[14px] font-bold text-ink"
        >
          상대({ROLE_LABEL[counter]})로 보기
        </button>
      </div>
    </section>
  );
}

function InvitedBox({ deal, proposer }: { deal: Deal; proposer: "worker" | "client" }) {
  const router = useRouter();
  return (
    <section aria-labelledby="invited-title" className="rounded-2xl border border-ink bg-card p-4">
      <p className="text-[13px] font-semibold text-accent">초대 링크로 들어왔습니다</p>
      <h2 id="invited-title" className="mt-0.5 text-base font-bold">
        {deal[proposer].name}이(가) 보낸 계약 조건입니다
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
        조건을 끝까지 확인하고 동의하거나 거절해 주세요. 동의하면 계약이 성립하고, 그 뒤에는 조건을 바꿀 수 없습니다.
      </p>
      <button
        type="button"
        onClick={() => {
          setRole(proposer);
          router.replace(`/deal/?id=${encodeURIComponent(deal.id)}`, { scroll: false });
        }}
        className="mt-3 text-[13px] font-semibold text-ink underline underline-offset-4"
      >
        시연: 보낸 사람({ROLE_LABEL[proposer]})으로 돌아가기
      </button>
    </section>
  );
}
