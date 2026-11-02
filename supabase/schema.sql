-- Show Me What You Got - Supabase 스키마 (새 프로젝트에 처음 적용할 때 사용)
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.
-- 적용 후: Authentication > Sign In / Providers > Allow anonymous sign-ins 켜기

-- ======================================================================
-- 테이블
-- ======================================================================

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
  verified boolean not null default false, -- 서버 트리거가 계산 (앱이 보낸 값은 무시)
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_started_idx on public.sessions (user_id, started_at desc);
create index if not exists group_members_user_id_idx on public.group_members (user_id);
create index if not exists groups_owner_id_idx on public.groups (owner_id);

-- ======================================================================
-- 내부 함수 (private 스키마: API 로 호출할 수 없고, 권한 정책 안에서만 사용)
-- ======================================================================
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- 내가 이 그룹의 멤버인가?
create or replace function private.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

-- 나와 이 사람이 같은 그룹에 있는가?
create or replace function private.shares_group_with(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user_id
  );
$$;

revoke all on function private.is_group_member(uuid) from public, anon;
revoke all on function private.shares_group_with(uuid) from public, anon;
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.shares_group_with(uuid) to authenticated;

-- ======================================================================
-- 권한(RLS): "같은 그룹 사람끼리만 서로 볼 수 있다"
-- auth.uid() 는 (select auth.uid()) 로 감싸야 행마다 다시 계산하지 않아 빠릅니다.
-- ======================================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "profiles: read" on public.profiles;
drop policy if exists "profiles: write own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_group_with(id));
create policy "profiles: insert own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: delete own" on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

drop policy if exists "groups: members read" on public.groups;
create policy "groups: members read" on public.groups for select to authenticated
  using (private.is_group_member(id));

drop policy if exists "members: read same group" on public.group_members;
drop policy if exists "members: leave" on public.group_members;
create policy "members: read same group" on public.group_members for select to authenticated
  using (private.is_group_member(group_id));
create policy "members: leave" on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "sessions: read own or group" on public.sessions;
drop policy if exists "sessions: write own" on public.sessions;
drop policy if exists "sessions: update own" on public.sessions;
create policy "sessions: read own or group" on public.sessions for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_group_with(user_id));
create policy "sessions: write own" on public.sessions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "sessions: update own" on public.sessions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ======================================================================
-- "증명 완료" 판정은 서버가 한다
-- 앱(src/lib/types.ts 의 MIN_MINUTES)과 같은 기준을 유지해야 합니다: 운동 30분, 공부 60분
-- ======================================================================
create or replace function private.sessions_validate()
returns trigger language plpgsql set search_path = '' as $$
declare
  need_minutes int := case new.kind when 'workout' then 30 when 'study' then 60 end;
begin
  if new.started_at > now() + interval '10 minutes' then
    raise exception 'started_at is in the future';
  end if;
  if new.ended_at is not null then
    if new.ended_at < new.started_at then
      raise exception 'ended_at is before started_at';
    end if;
    if new.ended_at > now() + interval '10 minutes' then
      raise exception 'ended_at is in the future';
    end if;
  end if;
  -- 이미 끝난 기록의 시작/종료 시각은 나중에 바꿀 수 없음
  if tg_op = 'UPDATE' and old.ended_at is not null
     and (new.started_at is distinct from old.started_at or new.ended_at is distinct from old.ended_at) then
    raise exception 'finished session cannot be changed';
  end if;
  new.verified := new.ended_at is not null
    and new.ended_at - new.started_at >= make_interval(mins => need_minutes);
  return new;
end;
$$;
revoke all on function private.sessions_validate() from public, anon, authenticated;

drop trigger if exists sessions_validate on public.sessions;
create trigger sessions_validate before insert or update on public.sessions
  for each row execute function private.sessions_validate();

-- ======================================================================
-- 앱에서 호출하는 함수 (RPC)
-- ======================================================================

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

-- 그룹원 전체와 오늘 기록 (멤버만 조회 가능)
create or replace function public.group_today(p_group_id uuid, p_since timestamptz)
returns table (
  user_id uuid, nickname text, session_id uuid, kind text, place_name text,
  started_at timestamptz, ended_at timestamptz, verified boolean
) language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.nickname, '익명'), s.id, s.kind, s.place_name, s.started_at, s.ended_at, s.verified
  from public.group_members m
  left join public.profiles p on p.id = m.user_id
  left join public.sessions s on s.user_id = m.user_id and s.started_at >= p_since
  where m.group_id = p_group_id and private.is_group_member(p_group_id)
  order by m.joined_at, s.started_at;
$$;

-- 로그인하지 않은(anon) 호출자는 막고, 로그인 사용자(익명 로그인 포함 = authenticated)만 허용
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.group_today(uuid, timestamptz) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.group_today(uuid, timestamptz) to authenticated;

-- 예전 버전에서 public 에 있던 내부 함수 정리
drop function if exists public.is_group_member(uuid);
drop function if exists public.shares_group_with(uuid);
