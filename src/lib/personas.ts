import type { Actor, Party, Role } from "./types";

// 모든 이름은 시연용으로 지어낸 가상 이름이다. 실존 인물·고객과 관계없다.
export const ME_WORKER: Party = { id: "w-ongyeol", name: "온결 스튜디오" };
export const ME_CLIENT: Party = { id: "c-sodabit", name: "밴드 소다빛" };
export const OTHER_CLIENT: Party = { id: "c-eunha", name: "은하수책방" };
export const OPERATOR_NAME = "CoV 운영자(시연)";

/** 새 계약을 만들 때 고를 수 있는 상대 */
export const CLIENT_CHOICES: Party[] = [ME_CLIENT, OTHER_CLIENT];

export const ROLE_PERSONA: Record<Role, { title: string; name: string; hint: string }> = {
  worker: { title: "작업자", name: ME_WORKER.name, hint: "믹싱·디자인 외주를 받는 쪽" },
  client: { title: "의뢰인", name: ME_CLIENT.name, hint: "작업을 맡기고 대금을 내는 쪽" },
  operator: { title: "운영자(CEO)", name: OPERATOR_NAME, hint: "입금 확인·지급·분쟁을 수기로 처리" },
};

export function actorFor(role: Role): Actor {
  return { role, name: ROLE_PERSONA[role].name };
}

/** 운영자 확인 계좌. 가짜 값이며 실제 계좌가 아니다. */
export const OPERATOR_ACCOUNT = {
  bank: "시연은행",
  number: "000-000-000000",
  holder: "CoV 운영자",
};

/** 입금자명 규칙: 의뢰인 이름 + 거래번호 끝 4자리 */
export function depositorNameRule(clientName: string, dealId: string): string {
  const short = clientName.replace(/^밴드\s*/, "").replace(/\s/g, "").slice(0, 6);
  return `${short}${dealId.slice(-4).toUpperCase()}`;
}
