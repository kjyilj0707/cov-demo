"use client";

import { WheelPicker } from "@/components/WheelPicker";
import { REVISION_MAX, REVISION_MIN } from "@/lib/contract-form";

const VALUES = Array.from({ length: REVISION_MAX - REVISION_MIN + 1 }, (_, i) => REVISION_MIN + i);
const LABELS = VALUES.map((n) => `${n}회`);

/** 수정 가능 횟수 다이얼. 숫자라서 위 화살표 = 늘리기(spinbutton). 값이 비면(NaN) 다이얼은 그대로 둔다. */
export function RevisionDial({ value, onChange, labelledBy }: { value: number; onChange: (n: number) => void; labelledBy?: string }) {
  const index = Number.isInteger(value) ? value - REVISION_MIN : -1;
  return (
    <WheelPicker
      idPrefix="rev"
      mode="spinbutton"
      options={LABELS}
      index={index}
      onChange={(i) => onChange(VALUES[i])}
      labelledBy={labelledBy}
      valueText={(i) => LABELS[i]}
    />
  );
}
