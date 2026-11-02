// 그룹 기능 (서버 필요). 초대코드로 들어가서 서로의 오늘 인증 현황을 봅니다.
import { requireUserId, supabase } from './supabase';
import type { Kind } from './types';
import { startOfToday } from './utils';

export type Group = { id: string; name: string; invite_code: string };

export type FeedRow = {
  user_id: string;
  nickname: string;
  session_id: string | null;
  kind: Kind | null;
  place_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  verified: boolean | null;
};

function client() {
  if (!supabase) throw new Error('서버가 설정되지 않았어요. README의 Supabase 설정을 확인해 주세요.');
  return supabase;
}

export async function getMyNickname(): Promise<string | null> {
  const sb = client();
  const uid = await requireUserId();
  const { data } = await sb.from('profiles').select('nickname').eq('id', uid).maybeSingle();
  return data?.nickname ?? null;
}

export async function setNickname(nickname: string) {
  const sb = client();
  const uid = await requireUserId();
  const { error } = await sb.from('profiles').upsert({ id: uid, nickname });
  if (error) throw error;
}

export async function listMyGroups(): Promise<Group[]> {
  const sb = client();
  await requireUserId();
  const { data, error } = await sb.from('groups').select('id, name, invite_code').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createGroup(name: string): Promise<Group> {
  const sb = client();
  await requireUserId();
  const { data, error } = await sb.rpc('create_group', { p_name: name }).single<Group>();
  if (error) throw error;
  return data;
}

export async function joinGroup(code: string): Promise<Group> {
  const sb = client();
  await requireUserId();
  const { data, error } = await sb
    .rpc('join_group', { p_code: code.trim().toUpperCase() })
    .single<Group>();
  if (error) throw new Error(error.message.includes('invalid') ? '그런 초대코드 없다.' : error.message);
  return data;
}

export async function leaveGroup(groupId: string) {
  const sb = client();
  const uid = await requireUserId();
  const { error } = await sb.from('group_members').delete().eq('group_id', groupId).eq('user_id', uid);
  if (error) throw error;
}

/** 그룹원 전체 + 오늘 기록 (기록 없는 사람은 session_id = null) */
export async function getGroupToday(groupId: string): Promise<FeedRow[]> {
  const sb = client();
  await requireUserId();
  const { data, error } = await sb.rpc('group_today', {
    p_group_id: groupId,
    p_since: startOfToday().toISOString(),
  });
  if (error) throw error;
  return (data ?? []) as FeedRow[];
}
