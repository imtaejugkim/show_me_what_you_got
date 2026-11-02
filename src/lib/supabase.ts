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

/** 지금 로그인한 사용자 ID (로그인 안 했으면 null). 익명 계정은 로그인으로 치지 않음 */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user || user.is_anonymous) return null;
  return user.id;
}

/** 로그인이 꼭 필요한 작업에서 사용 */
export async function requireUserId(): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error('로그인이 필요해요.');
  return uid;
}
