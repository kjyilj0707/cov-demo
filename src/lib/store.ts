"use client";

/**
 * 브라우저 저장소(localStorage) 하나에 시연 상태를 둔다. DB 없음.
 * 거래 변경은 반드시 deal-machine의 transition/createDeal을 거친다.
 */
import { useSyncExternalStore } from "react";
import { createDeal, runAutoApprovals, transition, type Action, type CreateInput } from "./deal-machine";
import { actorFor } from "./personas";
import { buildSeed } from "./seed";
import type { Deal, Role } from "./types";

const KEY = "cov-mvp-demo:v1";

export interface DemoState {
  deals: Deal[];
  role: Role;
  /** 시간 빨리 감기로 더한 밀리초 */
  clockOffsetMs: number;
}

let state: DemoState | null = null;
const listeners = new Set<() => void>();
let loading = false;

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 사생활 보호 창 등에서는 저장이 안 될 수 있다. 화면은 그대로 동작한다.
  }
}

export function demoNow(s: DemoState | null = state): Date {
  return new Date(Date.now() + (s?.clockOffsetMs ?? 0));
}

async function freshState(role: Role = "worker"): Promise<DemoState> {
  return { deals: await buildSeed(new Date()), role, clockOffsetMs: 0 };
}

function load() {
  if (state || loading || typeof window === "undefined") return;
  loading = true;
  let saved: DemoState | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) saved = JSON.parse(raw) as DemoState;
  } catch {
    saved = null;
  }
  if (saved && Array.isArray(saved.deals)) {
    state = saved;
    state = { ...state, deals: runAutoApprovals(state.deals, demoNow(state)) };
    loading = false;
    persist();
    emit();
    return;
  }
  freshState().then((s) => {
    state = s;
    loading = false;
    persist();
    emit();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  load();
  return () => listeners.delete(l);
}

export function useDemo(): DemoState | null {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
}

function set(next: DemoState) {
  state = next;
  persist();
  emit();
}

export function setRole(role: Role) {
  if (state) set({ ...state, role });
}

export type ActResult = { ok: true } | { ok: false; message: string };

export function act(dealId: string, action: Action): ActResult {
  if (!state) return { ok: false, message: "아직 불러오는 중입니다." };
  const deal = state.deals.find((d) => d.id === dealId);
  if (!deal) return { ok: false, message: "거래를 찾을 수 없습니다." };
  // 역할 버튼은 "이 거래의 그 쪽 당사자"를 연기한다. 이력에 남는 이름도 거래 당사자 이름으로 맞춘다.
  // (검색에서 고른 다른 창작자와 만든 거래도 작업자 역할로 이어서 진행할 수 있게)
  const actor =
    state.role === "worker"
      ? { role: "worker" as const, name: deal.worker.name }
      : state.role === "client"
        ? { role: "client" as const, name: deal.client.name }
        : actorFor(state.role);
  const r = transition(deal, action, actor, demoNow());
  if (!r.ok) return { ok: false, message: r.message };
  set({ ...state, deals: state.deals.map((d) => (d.id === dealId ? r.deal : d)) });
  return { ok: true };
}

export function addDeal(input: Omit<CreateInput, "id" | "proposer">): ActResult & { id?: string } {
  if (!state) return { ok: false, message: "아직 불러오는 중입니다." };
  if (state.role === "operator") return { ok: false, message: "운영자는 계약 초안을 만들 수 없습니다." };
  const id = `deal-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const r = createDeal({ ...input, id, proposer: actorFor(state.role) }, demoNow());
  if (!r.ok) return { ok: false, message: r.message };
  set({ ...state, deals: [r.deal, ...state.deals] });
  return { ok: true, id };
}

export function fastForward(days: number) {
  if (!state) return;
  const offset = state.clockOffsetMs + days * 86400_000;
  const next = { ...state, clockOffsetMs: offset };
  set({ ...next, deals: runAutoApprovals(next.deals, demoNow(next)) });
}

export async function resetDemo() {
  const role = state?.role ?? "worker";
  set(await freshState(role));
}
