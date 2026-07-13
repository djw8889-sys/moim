-- 모여봐 초기 스키마 + RLS
-- 원칙: "해당 모임의 멤버만 읽고 쓸 수 있다"

create extension if not exists pgcrypto;

-- ── 테이블 ──────────────────────────────────────────────────────

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_by uuid references auth.users(id) on delete set null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  nickname text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);

create table public.origins (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  unique (member_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  share_amount integer not null check (share_amount >= 0)
);

create table public.plan_candidates (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  memo text,
  place_lat double precision,
  place_lng double precision,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.plan_candidates(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (candidate_id, member_id) -- 후보당 1인 1표
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- 조회용 인덱스
create index members_meeting_idx on public.members (meeting_id);
create index origins_meeting_idx on public.origins (meeting_id);
create index expenses_meeting_idx on public.expenses (meeting_id);
create index expense_shares_expense_idx on public.expense_shares (expense_id);
create index plan_candidates_meeting_idx on public.plan_candidates (meeting_id);
create index votes_candidate_idx on public.votes (candidate_id);
create index photos_meeting_idx on public.photos (meeting_id);

-- ── RLS 헬퍼 함수 ────────────────────────────────────────────────
-- members 테이블의 RLS와 순환 참조를 피하기 위해 security definer 사용

create or replace function public.is_meeting_member(m_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.members
    where meeting_id = m_id and user_id = auth.uid()
  );
$$;

-- ── RLS 정책 ─────────────────────────────────────────────────────

alter table public.meetings enable row level security;
alter table public.members enable row level security;
alter table public.origins enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.plan_candidates enable row level security;
alter table public.votes enable row level security;
alter table public.photos enable row level security;

-- meetings: 로그인 유저는 초대코드로 모임 조회 가능(참여 플로우에 필요),
-- 생성은 본인 명의로만, 수정/삭제는 만든 사람만
create policy "meetings_select" on public.meetings
  for select to authenticated using (true);
create policy "meetings_insert" on public.meetings
  for insert to authenticated with check (created_by = auth.uid());
create policy "meetings_update" on public.meetings
  for update to authenticated using (created_by = auth.uid());
create policy "meetings_delete" on public.meetings
  for delete to authenticated using (created_by = auth.uid());

-- members: 조회는 같은 모임 멤버만, 참여(insert)는 본인 명의로만
create policy "members_select" on public.members
  for select to authenticated using (public.is_meeting_member(meeting_id));
create policy "members_insert" on public.members
  for insert to authenticated with check (user_id = auth.uid());
create policy "members_delete" on public.members
  for delete to authenticated using (user_id = auth.uid());

-- 모임 데이터 공통 정책: 해당 모임 멤버만 읽고 쓰기
create policy "origins_all" on public.origins
  for all to authenticated
  using (public.is_meeting_member(meeting_id))
  with check (public.is_meeting_member(meeting_id));

create policy "expenses_all" on public.expenses
  for all to authenticated
  using (public.is_meeting_member(meeting_id))
  with check (public.is_meeting_member(meeting_id));

create policy "expense_shares_all" on public.expense_shares
  for all to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and public.is_meeting_member(e.meeting_id)
  ))
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_id and public.is_meeting_member(e.meeting_id)
  ));

create policy "plan_candidates_all" on public.plan_candidates
  for all to authenticated
  using (public.is_meeting_member(meeting_id))
  with check (public.is_meeting_member(meeting_id));

create policy "votes_all" on public.votes
  for all to authenticated
  using (exists (
    select 1 from public.plan_candidates c
    where c.id = candidate_id and public.is_meeting_member(c.meeting_id)
  ))
  with check (exists (
    select 1 from public.plan_candidates c
    where c.id = candidate_id and public.is_meeting_member(c.meeting_id)
  ));

create policy "photos_all" on public.photos
  for all to authenticated
  using (public.is_meeting_member(meeting_id))
  with check (public.is_meeting_member(meeting_id));

-- ── 사진 저장용 Storage 버킷 ─────────────────────────────────────
-- 공개 버킷(경로를 아는 사람만 볼 수 있음). 업로드/삭제는 로그인 유저만.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_bucket_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos');

create policy "photos_bucket_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos');
