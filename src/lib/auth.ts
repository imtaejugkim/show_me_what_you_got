// 계정 연결 (카카오 로그인)
// 흐름: 처음엔 익명 계정으로 바로 사용 → 원할 때 카카오를 "연결" (기존 기록·그룹 유지)
// 이미 다른 기기에서 카카오로 연결해 둔 계정이 있으면 → 그 계정으로 로그인
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ensureSignedIn, supabase } from './supabase';

export type Account = {
  anonymous: boolean;
  providers: string[]; // 예: ['kakao']
  displayName: string | null; // 카카오 닉네임 등
};

/** 카카오 로그인이 끝나고 돌아올 앱 주소. Supabase Redirect URLs 에 smwyg://** 가 등록돼 있어야 함 */
const redirectTo = Linking.createURL('auth/callback');

export async function getAccount(): Promise<Account | null> {
  if (!supabase) return null;
  await ensureSignedIn();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    anonymous: user.is_anonymous ?? false,
    providers: (user.identities ?? []).map((i) => i.provider),
    displayName: meta.name ?? meta.nickname ?? meta.full_name ?? meta.preferred_username ?? null,
  };
}

export type KakaoResult =
  | { status: 'linked' } // 지금 익명 계정에 카카오 연결 완료
  | { status: 'signed_in' } // 기존 카카오 계정으로 로그인
  | { status: 'cancelled' }
  | { status: 'already_used' }; // 이 카카오 계정은 다른 계정에 이미 연결돼 있음

/** 익명 계정에 카카오를 연결 */
export async function linkKakao(): Promise<KakaoResult> {
  const sb = client();
  await ensureSignedIn();
  const { data, error } = await sb.auth.linkIdentity({
    provider: 'kakao',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await openAndFinish(data.url);
  if (result === 'cancelled') return { status: 'cancelled' };
  if (result === 'already_used') return { status: 'already_used' };
  return { status: 'linked' };
}

/** 기존 카카오 계정으로 로그인 (현재 익명 계정에서 빠져나감) */
export async function signInWithKakao(): Promise<KakaoResult> {
  const sb = client();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await openAndFinish(data.url);
  if (result === 'cancelled') return { status: 'cancelled' };
  if (result === 'already_used') return { status: 'already_used' };
  return { status: 'signed_in' };
}

/** 로그아웃 → 새 익명 계정으로 다시 시작 */
export async function signOut() {
  const sb = client();
  await sb.auth.signOut();
  await ensureSignedIn();
}

// ---------- 내부 ----------

function client() {
  if (!supabase) throw new Error('서버가 설정되지 않았어요.');
  return supabase;
}

/** 브라우저로 카카오 로그인 → 앱으로 돌아온 주소에서 토큰을 꺼내 세션 저장 */
async function openAndFinish(url: string | null | undefined): Promise<'ok' | 'cancelled' | 'already_used'> {
  if (!url) throw new Error('로그인 주소를 받지 못했어요.');
  const res = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (res.type !== 'success') return 'cancelled';

  const params = parseParams(res.url);
  if (params.error) {
    const desc = params.error_description ?? params.error;
    if (/already/i.test(desc) && /(identity|linked|exists)/i.test(desc)) return 'already_used';
    throw new Error(desc);
  }
  if (!params.access_token || !params.refresh_token) throw new Error('로그인 정보를 받지 못했어요.');
  const { error } = await client().auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (error) throw error;
  return 'ok';
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
