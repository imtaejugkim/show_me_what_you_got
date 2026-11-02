// 로그인 상태를 앱 전체에 알려주는 Provider
// status 에 따라 루트 레이아웃이 보여줄 화면 묶음을 고른다
//   signedOut    → 온보딩 / 로그인
//   needsProfile → 닉네임 정하기
//   ready        → 메인 탭
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { isServerEnabled, supabase } from './supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

type Ctx = {
  status: AuthStatus;
  nickname: string | null;
  onboardingSeen: boolean;
  markOnboardingSeen: () => void;
  /** 닉네임 저장 등 프로필이 바뀐 뒤 다시 확인 */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);
const ONBOARDING_KEY = 'smwyg/onboardingSeen';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [nickname, setNickname] = useState<string | null>(null);
  /** 어떤 사용자에 대해 프로필을 확인했는지 (사용자가 바뀌면 다시 확인) */
  const [checkedFor, setCheckedFor] = useState<string | null | undefined>(undefined);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setOnboardingSeen(v === '1'))
      .catch(() => setOnboardingSeen(false));
  }, []);

  // 로그인/로그아웃 감지
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const loggedIn = !!session && !session.user.is_anonymous;
  const userId = loggedIn ? session!.user.id : null;

  /** 프로필(닉네임) 다시 불러오기 */
  const refresh = useCallback(async () => {
    if (!supabase || !userId) return;
    try {
      const { data } = await supabase.from('profiles').select('nickname').eq('id', userId).maybeSingle();
      setNickname(data?.nickname ?? null);
    } finally {
      setCheckedFor(userId);
    }
  }, [userId]);

  // 로그인한 사용자가 바뀔 때마다 프로필 확인
  useEffect(() => {
    let cancelled = false;
    const sb = supabase;
    if (!sb || !userId) return;
    (async () => {
      try {
        const { data } = await sb.from('profiles').select('nickname').eq('id', userId).maybeSingle();
        if (!cancelled) setNickname(data?.nickname ?? null);
      } finally {
        if (!cancelled) setCheckedFor(userId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markOnboardingSeen = useCallback(() => {
    setOnboardingSeen(true);
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
  }, []);

  let status: AuthStatus;
  if (!isServerEnabled) status = onboardingSeen === null ? 'loading' : 'ready'; // 서버 없이 개발할 때는 바로 사용
  else if (session === undefined || onboardingSeen === null) status = 'loading';
  else if (!loggedIn) status = 'signedOut';
  else if (checkedFor !== userId) status = 'loading';
  else status = nickname ? 'ready' : 'needsProfile';

  return (
    <SessionContext.Provider value={{ status, nickname, onboardingSeen: !!onboardingSeen, markOnboardingSeen, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('SessionProvider 안에서만 사용할 수 있어요.');
  return ctx;
}
