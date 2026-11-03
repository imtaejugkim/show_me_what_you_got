// 카카오 로그인 / 로그아웃
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { emitDataChanged } from './events';
import { syncGeofences } from './geofence';
import { deleteMyPhotos } from './photoProof';
import { clearUserData } from './storage';
import { supabase } from './supabase';

/** 카카오 로그인이 끝나고 돌아올 앱 주소. Supabase Redirect URLs 에 smwyg://** 가 등록돼 있어야 함 */
const redirectTo = Linking.createURL('auth/callback');

/** 카카오로 로그인. 취소하면 false */
export async function signInWithKakao(): Promise<boolean> {
  const sb = client();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('로그인 주소를 받지 못했어요.');

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return false;

  const params = parseParams(res.url);
  if (params.error) throw new Error(params.error_description ?? params.error);
  if (!params.access_token || !params.refresh_token) throw new Error('로그인 정보를 받지 못했어요.');
  const { error: sessionError } = await sb.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (sessionError) throw sessionError;
  return true;
}

export async function signOut() {
  await client().auth.signOut();
}

/**
 * 회원 탈퇴: 서버의 계정·기록을 지우고, 이 기기의 장소·기록·예약 알림도 지운 뒤 로그아웃.
 * 내가 만든 그룹은 서버에서 다른 멤버에게 넘어간다 (supabase/schema.sql 의 delete_my_account).
 */
export async function deleteAccount() {
  const sb = client();
  const { data: me } = await sb.auth.getUser();
  if (me.user) await deleteMyPhotos(me.user.id).catch(() => {}); // 계정이 지워지기 전에 사진부터 삭제
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw error;
  await clearUserData();
  await syncGeofences().catch(() => {}); // 장소가 없어졌으니 위치 감지 중지
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  emitDataChanged();
  await sb.auth.signOut({ scope: 'local' }); // 서버 계정은 이미 없으니 기기에서만 로그아웃
}

/** 로그인한 계정 정보 (프로필 화면용) */
export async function getAccountInfo(): Promise<{ provider: string | null; providerName: string | null; email: string | null }> {
  const { data } = await client().auth.getUser();
  const user = data.user;
  const meta = user?.user_metadata ?? {};
  return {
    provider: user?.app_metadata?.provider ?? null,
    providerName: meta.name ?? meta.nickname ?? meta.full_name ?? meta.preferred_username ?? null,
    email: user?.email || null,
  };
}

// ---------- 내부 ----------

function client() {
  if (!supabase) throw new Error('서버가 설정되지 않았어요.');
  return supabase;
}

/** smwyg://auth/callback#access_token=...&refresh_token=... (또는 ?error=...) 파싱 */
function parseParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = [url.split('?')[1]?.split('#')[0], url.split('#')[1]];
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      const [k, v = ''] = pair.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
  }
  return out;
}
