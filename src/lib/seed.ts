import { addDays, createDeal, transition, type Action } from "./deal-machine";
import { hashTerms } from "./hash";
import { ME_CLIENT, ME_WORKER, OPERATOR_NAME, OTHER_CLIENT, depositorNameRule } from "./personas";
import type { Actor, Deal, Party, Terms } from "./types";

const op: Actor = { role: "operator", name: OPERATOR_NAME };

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 시연용 예시 거래를 상태 기계로 실제 진행시켜 만든다(데이터가 규칙과 어긋나지 않게). */
export async function buildSeed(now: Date): Promise<Deal[]> {
  const day = (n: number) => addDays(now, n);

  async function run(
    id: string,
    terms: Terms,
    worker: Party,
    client: Party,
    proposer: "worker" | "client",
    startDaysAgo: number,
    steps: [Action | "agree", "worker" | "client" | "operator"][],
  ): Promise<Deal> {
    const actors: Record<string, Actor> = {
      worker: { role: "worker", name: worker.name },
      client: { role: "client", name: client.name },
      operator: op,
    };
    let t = addDays(now, -startDaysAgo);
    const created = createDeal({ id, terms, worker, client, proposer: actors[proposer] }, t);
    if (!created.ok) throw new Error(created.message);
    let deal = created.deal;
    // 단계 사이 간격을 시작일부터 오늘 사이에 고르게 나눈다.
    const gap = (startDaysAgo * 0.9) / Math.max(1, steps.length);
    for (const [a, who] of steps) {
      t = new Date(t.getTime() + gap * 86400_000);
      const action: Action = a === "agree" ? { type: "agree", hash: await hashTerms(deal.terms) } : a;
      const r = transition(deal, action, actors[who], t);
      if (!r.ok) throw new Error(`${id}: ${r.message}`);
      deal = r.deal;
    }
    return deal;
  }

  const dep = (client: Party, id: string) => depositorNameRule(client.name, id);

  const mixing = await run(
    "demo-mix-7a31",
    {
      title: "소다빛 정규 1집 타이틀곡 믹싱",
      workType: "믹싱·마스터링",
      amount: 450000,
      deadline: ymd(day(12)),
      revisionLimit: 3,
      fileFormats: ["WAV", "MP3"],
      scope: "타이틀곡 1곡 믹싱과 마스터링. 보컬 1트랙, 악기 24트랙 이내. 레퍼런스 곡 2곡 기준.",
      paymentRoute: "operator",
    },
    ME_WORKER,
    ME_CLIENT,
    "worker",
    14,
    [
      ["agree", "client"],
      [{ type: "report_deposit", depositorName: dep(ME_CLIENT, "demo-mix-7a31") }, "client"],
      [{ type: "confirm_deposit", depositorName: dep(ME_CLIENT, "demo-mix-7a31"), amount: 450000 }, "operator"],
      [{ type: "submit_delivery", fileNames: ["sodabit_title_mix_v1.wav"], note: "1차 믹스입니다." }, "worker"],
      [{ type: "request_revision", note: "후렴 보컬을 조금 더 앞으로, 킥 저음 정리 부탁드려요." }, "client"],
      [{ type: "submit_delivery", fileNames: ["sodabit_title_mix_v2.wav", "sodabit_title_mix_v2.mp3"], note: "요청하신 두 가지 반영했습니다." }, "worker"],
    ],
  );

  const artwork = await run(
    "demo-art-2c58",
    {
      title: "소다빛 싱글 앨범 아트워크",
      workType: "앨범 아트워크",
      amount: 350000,
      deadline: ymd(day(25)),
      revisionLimit: 2,
      fileFormats: ["PNG", "JPG", "PSD·AI 원본"],
      scope: "디지털 싱글 커버 1종(3000×3000px)과 SNS용 정사각·세로 변형 2종.",
      paymentRoute: "operator",
    },
    ME_WORKER,
    ME_CLIENT,
    "client",
    1,
    [],
  );

  const session = await run(
    "demo-ses-9e04",
    {
      title: "소다빛 EP 드럼 세션 녹음",
      workType: "세션·녹음",
      amount: 250000,
      deadline: ymd(day(9)),
      revisionLimit: 1,
      fileFormats: ["스템(트랙별 WAV)"],
      scope: "EP 수록곡 3곡 드럼 세션 녹음. 스튜디오 대여비는 의뢰인 부담.",
      paymentRoute: "operator",
    },
    ME_WORKER,
    ME_CLIENT,
    "worker",
    3,
    [
      ["agree", "client"],
      [{ type: "report_deposit", depositorName: dep(ME_CLIENT, "demo-ses-9e04") }, "client"],
    ],
  );

  const poster = await run(
    "demo-pst-41bd",
    {
      title: "은하수책방 낭독회 포스터",
      workType: "포스터·디자인",
      amount: 180000,
      deadline: ymd(day(-5)),
      revisionLimit: 2,
      fileFormats: ["PDF", "PNG"],
      scope: "A2 인쇄용 포스터 1종과 인스타그램용 이미지 1종.",
      paymentRoute: "direct",
    },
    ME_WORKER,
    OTHER_CLIENT,
    "client",
    30,
    [
      ["agree", "worker"],
      [{ type: "report_deposit", depositorName: "은하수책방" }, "client"],
      [{ type: "confirm_received" }, "worker"],
      [{ type: "submit_delivery", fileNames: ["eunha_poster_A2.pdf", "eunha_insta.png"] }, "worker"],
      [{ type: "approve", note: "좋아요!" }, "client"],
      [{ type: "confirm_settlement" }, "worker"],
    ],
  );

  const video = await run(
    "demo-vid-d317",
    {
      title: "은하수책방 북토크 홍보 영상 편집",
      workType: "영상",
      amount: 300000,
      deadline: ymd(day(2)),
      revisionLimit: 2,
      fileFormats: ["MP4"],
      scope: "북토크 촬영본으로 60초 세로 홍보 영상 1편. 자막 포함.",
      paymentRoute: "operator",
    },
    ME_WORKER,
    OTHER_CLIENT,
    "worker",
    10,
    [
      ["agree", "client"],
      [{ type: "report_deposit", depositorName: dep(OTHER_CLIENT, "demo-vid-d317") }, "client"],
      [{ type: "confirm_deposit", depositorName: dep(OTHER_CLIENT, "demo-vid-d317"), amount: 300000 }, "operator"],
      [{ type: "submit_delivery", fileNames: ["booktalk_teaser_60s.mp4"] }, "worker"],
      [{ type: "approve" }, "client"],
    ],
  );

  return [mixing, artwork, session, video, poster];
}
