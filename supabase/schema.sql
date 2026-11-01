-- Show Me What You Got - Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.

-- 1) 프로필 (닉네임)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  created_at timestamptz not null default now()
);

-- 2) 그룹
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 3) 그룹 멤버
create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 4) 인증 기록 (운동/공부 세션)
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('workout', 'study')),
  place_name text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_started_idx on public.sessions (user_id, started_at desc);

-- ---------- 권한(RLS): "같은 그룹 사람끼리만 서로 볼 수 있다" ----------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;

-- 정책 안에서 group_members 를 다시 조회하면 무한 재귀가 생겨서 security definer 함수로 분리
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = p_group_id and user_id = auth.uid());
$$;

create or replace function public.shares_group_with(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));
drop policy if exists "profiles: write own" on public.profiles;
create policy "profiles: write own" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "groups: members read" on public.groups;
create policy "groups: members read" on public.groups for select to authenticated
  using (public.is_group_member(id));

drop policy if exists "members: read same group" on public.group_members;
create policy "members: read same group" on public.group_members for select to authenticated
  using (public.is_group_member(group_id));
drop policy if exists "members: leave" on public.group_members;
create policy "members: leave" on public.group_members for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "sessions: read own or group" on public.sessions;
create policy "sessions: read own or group" on public.sessions for select to authenticated
  using (user_id = auth.uid() or public.shares_group_with(user_id));
drop policy if exists "sessions: write own" on public.sessions;
create policy "sessions: write own" on public.sessions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "sessions: update own" on public.sessions;
create policy "sessions: update own" on public.sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- RPC 함수 ----------
-- 그룹 만들기: 6자리 초대코드 생성 + 만든 사람 자동 가입
create or replace function public.create_group(p_name text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare
  g groups;
  code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    -- 헷갈리는 문자(0,O,1,I) 제외
    code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
             from generate_series(1, 6));
    exit when not exists (select 1 from groups where invite_code = code);
  end loop;
  insert into groups (name, invite_code, owner_id) values (p_name, code, auth.uid()) returning * into g;
  insert into group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end;
$$;

-- 초대코드로 가입
create or replace function public.join_group(p_code text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from groups where invite_code = upper(p_code);
  if g.id is null then raise exception 'invalid invite code'; end if;
  insert into group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end;
$$;

-- 그룹원 전체와 오늘 기록
create or replace function public.group_today(p_group_id uuid, p_since timestamptz)
returns table (
  user_id uuid, nickname text, session_id uuid, kind text, place_name text,
  started_at timestamptz, ended_at timestamptz, verified boolean
) language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.nickname, '익명'), s.id, s.kind, s.place_name, s.started_at, s.ended_at, s.verified
  from group_members m
  left join profiles p on p.id = m.user_id
  left join sessions s on s.user_id = m.user_id and s.started_at >= p_since
  where m.group_id = p_group_id and public.is_group_member(p_group_id)
  order by m.joined_at, s.started_at;
$$;

-- ---------- 함수 실행 권한 ----------
-- 로그인하지 않은(anon) 호출자는 막고, 로그인 사용자(익명 로그인 포함 = authenticated)만 허용
revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.shares_group_with(uuid) from public, anon;
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.group_today(uuid, timestamptz) from public, anon;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.group_today(uuid, timestamptz) to authenticated;
