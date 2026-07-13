export type Meeting = {
  id: string;
  title: string;
  created_by: string | null;
  invite_code: string;
  created_at: string;
};

export type Member = {
  id: string;
  meeting_id: string;
  nickname: string;
  user_id: string | null;
  created_at: string;
};

export type Origin = {
  id: string;
  meeting_id: string;
  member_id: string;
  address: string;
  lat: number;
  lng: number;
};

export type Expense = {
  id: string;
  meeting_id: string;
  member_id: string; // 결제자
  title: string;
  amount: number; // 원 단위 정수
  created_at: string;
};

export type ExpenseShare = {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount: number;
};

export type PlanCandidate = {
  id: string;
  meeting_id: string;
  member_id: string;
  title: string;
  memo: string | null;
  place_lat: number | null;
  place_lng: number | null;
  created_at: string;
};

export type Vote = {
  id: string;
  candidate_id: string;
  member_id: string;
  created_at: string;
};

export type Photo = {
  id: string;
  meeting_id: string;
  member_id: string;
  storage_path: string;
  created_at: string;
};
