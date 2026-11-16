"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, btnPrimary, inputCls } from "@/components/bits";
import { TermsForm, emptyTerms } from "@/components/TermsForm";
import { CLIENT_CHOICES, ME_CLIENT, ME_WORKER, WORKER_CHOICES } from "@/lib/personas";
import { addDeal, useDemo } from "@/lib/store";

export default function NewDealPage() {
  const demo = useDemo();
  const router = useRouter();
  const [counterId, setCounterId] = useState("");
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
  const choices = isWorker ? CLIENT_CHOICES : WORKER_CHOICES;
  const selected = choices.find((c) => c.id === counterId) ?? choices[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">새 계약 만들기</h1>
        <p className="mt-1 text-sm text-ink-2">
          조건을 정해 보내면 상대가 확인하고 동의할 때 계약이 성립합니다. 성립 뒤에는 조건을 고칠 수 없습니다.
        </p>
      </div>
      <TermsForm
        initial={emptyTerms()}
        submitLabel="상대에게 조건 확인 요청 보내기"
        before={
          <Field
            id="counter"
            label={isWorker ? "의뢰인" : "작업자"}
            hint="시연판에서는 가상 상대 중에서 고릅니다. 실제 서비스에서는 초대 링크로 상대를 부릅니다."
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
  );
}
