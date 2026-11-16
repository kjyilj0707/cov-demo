// 시연판에서 쓰는 데이터 모양. 실제 서비스에서는 DB 표(cov-data 담당)가 기준이 된다.

export type Role = "worker" | "client" | "operator";
export type ActorRole = Role | "system";

export const ROLE_LABEL: Record<ActorRole, string> = {
  worker: "작업자",
  client: "의뢰인",
  operator: "운영자",
  system: "시스템",
};

export const WORK_TYPES = [
  "믹싱·마스터링",
  "세션·녹음",
  "작·편곡",
  "앨범 아트워크",
  "포스터·디자인",
  "사진",
  "영상",
  "기타",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const FILE_FORMATS = [
  "WAV",
  "MP3",
  "스템(트랙별 WAV)",
  "프로젝트 파일",
  "PNG",
  "JPG",
  "PDF",
  "PSD·AI 원본",
  "MP4",
] as const;

/** 대금 경로. operator = 운영자 수령(기본), direct = 의뢰인→작업자 직접 송금 */
export type PaymentRoute = "operator" | "direct";

export const PAYMENT_ROUTE_LABEL: Record<PaymentRoute, string> = {
  operator: "운영자 수령",
  direct: "직접 송금",
};

export interface Terms {
  title: string;
  workType: WorkType;
  /** 원 단위 정수 */
  amount: number;
  /** YYYY-MM-DD */
  deadline: string;
  revisionLimit: number;
  fileFormats: string[];
  scope: string;
  paymentRoute: PaymentRoute;
}

export interface Party {
  id: string;
  name: string;
}

export interface Actor {
  role: ActorRole;
  name: string;
}

export type DealStatus =
  | "proposed"
  | "awaiting_deposit"
  | "deposit_reported"
  | "in_progress"
  | "in_review"
  | "awaiting_payout"
  | "settled"
  | "disputed"
  | "cancelled";

export interface HistoryEntry {
  at: string; // ISO
  action: string;
  from: DealStatus | null;
  to: DealStatus;
  actor: Actor;
  /** 왜: 사용자가 적은 사유나 시스템 설명 */
  reason?: string;
}

export interface Agreement {
  snapshot: Terms;
  hash: string;
  agreedAt: string;
  agreedBy: Actor;
}

export interface Delivery {
  round: number; // 0 = 첫 납품, 1 = 수정 1회차 반영본 ...
  fileNames: string[];
  note?: string;
  submittedAt: string;
}

export interface Review {
  round: number;
  decision: "approved" | "revision_requested" | "auto_approved";
  note?: string;
  at: string;
}

export interface DepositRecord {
  reportedAt?: string;
  reportedDepositorName?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  depositorName?: string;
  amount?: number;
}

export interface PayoutRecord {
  paidAt: string;
  paidBy: string;
}

export interface Deal {
  id: string;
  createdAt: string;
  terms: Terms;
  worker: Party;
  client: Party;
  proposedBy: "worker" | "client";
  status: DealStatus;
  /** 분쟁 직전 상태. 분쟁 해소 시 돌아갈 곳 */
  statusBeforeDispute?: DealStatus;
  agreement?: Agreement;
  revisionsUsed: number;
  reviewDeadline?: string;
  deliveries: Delivery[];
  reviews: Review[];
  deposit?: DepositRecord;
  payout?: PayoutRecord;
  history: HistoryEntry[];
}
