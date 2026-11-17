"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Card, Field, btnPrimary, btnSecondary, inputCls } from "@/components/bits";
import { TermsForm, emptyTerms } from "@/components/TermsForm";
import { CREATORS, canContractWith, findCreator } from "@/lib/creators";
import { formatDate, formatWon } from "@/lib/format";
import { CLIENT_CHOICES, ME_CLIENT, ME_WORKER } from "@/lib/personas";
import { PAYMENT_ROUTE_LABEL, type Terms } from "@/lib/types";
import { addDeal, useDemo } from "@/lib/store";

/** 의뢰인이 고를 수 있는 작업자: 홈 검색의 가상 창작자 중 계약을 열어 둔 분야의 창작자(공연·라이브 제외) */
const WORKER_CHOICES = CREATORS.filter(canContractWith).map((c) => ({ id: c.id, name: c.name }));

export default function NewDealPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-2">불러오는 중…</p>}>
      <NewDealView />
    </Suspense>
  );
}

function NewDealView() {
  const demo = useDemo();
  const router = useRouter();
  // 창작자 프로필의 "이 창작자와 계약 만들기"에서 오면 ?worker=<id>로 상대가 미리 골라져 있다.
  const presetWorker = useSearchParams().get("worker");
  const [counterId, setCounterId] = useState(presetWorker ?? "");
  const [draft, setDraft] = useState<Terms | null>(null);
  if (!demo) return null;

  if (demo.role === "operator") {
    return (
      <div className="space-y-4 py-8 text-center">
        <h1 className="text-xl font-bold">새 계약 만들기</h1>
        <p className="text-ink-2">계약 초안은 작업자나 의뢰인이 만듭니다. 위에서 역할을 바꿔 주세요.</p>
        <Link href="/admin/" className={btnPrimary}>
          운영자 화면으로
        </Link>
      </div>
    );
  }

  const isWorker = demo.role === "worker";
  // 주소를 직접 고쳐 ?worker=공연·라이브 창작자로 들어와도 계약 양식을 열지 않는다.
  // (화면에서 막는 것일 뿐이다. 실제 서비스에서는 서버도 같은 검사를 해야 한다.)
  const pausedCreator = !isWorker && presetWorker ? findCreator(presetWorker) : undefined;
  if (pausedCreator && !canContractWith(pausedCreator)) {
    return (
      <div className="space-y-4 py-8 text-center">
        <h1 className="text-xl font-bold">공연 계약은 준비 중입니다</h1>
        <p className="text-ink-2">
          {pausedCreator.name}은(는) 공연·라이브 분야 창작자입니다. 공연은 파일 납품이 없어 지금의 계약 절차와 맞지 않아, 계약
          방식이 정해질 때까지 계약을 만들 수 없습니다.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/profile/?id=${encodeURIComponent(pausedCreator.id)}`} className={btnPrimary}>
            프로필로 돌아가기
          </Link>
          <Link href="/new/" className={btnSecondary}>
            다른 창작자와 계약 만들기
          </Link>
        </div>
      </div>
    );
  }
  const choices = isWorker ? CLIENT_CHOICES : WORKER_CHOICES;
  const selected = choices.find((c) => c.id === counterId) ?? choices[0];
  const presetCreator = !isWorker && presetWorker ? findCreator(presetWorker) : undefined;
  const initialTerms = presetCreator ? { ...emptyTerms(), workType: presetCreator.workType } : emptyTerms();

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">새 계약 만들기</h1>
        <p className="mt-1 text-sm text-ink-2">
          조건을 정해 보내면 상대가 확인하고 동의할 때 계약이 성립합니다. 성립 뒤에는 조건을 고칠 수 없습니다.
        </p>
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="lg:max-w-2xl">
          <TermsForm
            key={presetCreator?.id ?? "blank"}
            onChange={setDraft}
            initial={initialTerms}
            submitLabel="상대에게 조건 확인 요청 보내기"
            before={
              <Field
                id="counter"
                label={isWorker ? "의뢰인" : "작업자"}
                hint={
                  !isWorker && selected.id !== ME_WORKER.id
                    ? `시연판에서는 가상 상대 중에서 고릅니다. 작업자 역할 버튼을 누르면 이 거래의 작업자(${selected.name}) 입장이 됩니다.`
                    : "시연판에서는 가상 상대 중에서 고릅니다. 실제 서비스에서는 초대 링크로 상대를 부릅니다."
                }
              >
                <select
                  id="counter"
                  className={inputCls}
                  value={selected.id}
                  onChange={(e) => setCounterId(e.target.value)}
                  aria-describedby="counter-hint"
                >
                  {choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            }
            onSubmit={(terms) => {
              const r = addDeal({
                terms,
                worker: isWorker ? ME_WORKER : selected,
                client: isWorker ? selected : ME_CLIENT,
              });
              if (!r.ok) return r.message;
              router.push(`/deal/?id=${encodeURIComponent(r.id!)}`);
              return null;
            }}
          />
        </div>
        <TermsPreview
          terms={draft ?? initialTerms}
          counterLabel={isWorker ? "의뢰인" : "작업자"}
          counterName={selected.name}
        />
      </div>
    </div>
  );
}

/** 데스크톱 오른쪽 요약. 입력한 값을 그대로 보여 줄 뿐 계산하지 않는다. */
function TermsPreview({
  terms,
  counterLabel,
  counterName,
}: {
  terms: Terms;
  counterLabel: string;
  counterName: string;
}) {
  const empty = <span className="text-ink-2">아직 비어 있음</span>;
  const rows: [string, React.ReactNode][] = [
    [counterLabel, counterName],
    ["프로젝트 제목", terms.title.trim() || empty],
    ["작업 유형", terms.workType],
    ["금액", terms.amount > 0 ? formatWon(terms.amount) : empty],
    ["최종 납기일", terms.deadline ? formatDate(terms.deadline) : empty],
    ["수정 가능 횟수", Number.isNaN(terms.revisionLimit) ? empty : `${terms.revisionLimit}회`],
    ["납품 파일 형식", terms.fileFormats.length ? terms.fileFormats.join(", ") : empty],
    ["대금 경로", PAYMENT_ROUTE_LABEL[terms.paymentRoute]],
  ];
  return (
    <aside aria-labelledby="preview-title" className="hidden lg:sticky lg:top-36 lg:block">
      <Card>
        <h2 id="preview-title" className="text-base font-bold">
          보낼 조건 미리보기
        </h2>
        <dl className="mt-3 divide-y divide-line text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="shrink-0 text-ink-2">{k}</dt>
              <dd className="min-w-0 text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-xl bg-muted p-3 text-[13px] text-ink-2">
          상대가 동의하면 이 조건이 잠기고 해시값과 동의 시각이 기록됩니다. 그 뒤에는 조건을 고칠 수 없습니다.
        </p>
      </Card>
    </aside>
  );
}
