// Supabase = 서버(DB + 로그인)를 직접 만들지 않고 쓰는 BaaS. Firebase와 비슷한 역할입니다.
// .env 에 URL/KEY 가 없으면 null 이 되고, 앱은 "혼자 모드"로 동작합니다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isServerEnabled = supabase !== null;

/**
 * 로그인 화면 없이 바로 쓸 수 있도록 "익명 로그인"을 사용합니다.
 * (Supabase 대시보드 > Authentication > Sign In / Providers 에서 Anonymous sign-ins 를 켜야 합니다)
 * 나중에 카카오/애플/구글 로그인으로 계정을 연결(link)할 수 있습니다.
 */
export async function ensureSignedIn(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signIn.user?.id ?? null;
}
