// 디자인 시스템: Claude Design 시안(다크 · 라임 포인트)의 색, 글꼴, 공통 컴포넌트.
// 화면들은 여기 있는 조각만 조합해서 만듭니다.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../lib/haptics';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const colors = {
  bg: '#0B0B0C',
  surface: '#151517',
  surfaceHigh: '#1E1E21',
  track: '#26262A',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.08)',
  text: '#F4F4F5',
  sub: '#9A9AA1',
  chip: '#C9C9CE',
  handle: '#3A3A40',
  accent: '#D7FF3F',
  accentSoft: 'rgba(215,255,63,0.12)',
  accentBorder: 'rgba(215,255,63,0.32)',
  accentFaint: 'rgba(215,255,63,0.35)',
  onAccent: '#0B0B0C',
  danger: '#FF5C5C',
  dangerSoft: 'rgba(255,92,92,0.12)',
  ok: '#4ADE9F',
  okSoft: 'rgba(52,211,153,0.14)',
};

/**
 * 글꼴. 커스텀 폰트는 fontWeight 대신 굵기별 파일(fontFamily)을 지정해야 안드로이드에서도 정확히 나옵니다.
 * src/app/_layout.tsx 의 useFonts 와 이름을 맞춰야 합니다.
 */
export const fonts = {
  regular: 'IBMPlexSansKR_400Regular',
  medium: 'IBMPlexSansKR_500Medium',
  semibold: 'IBMPlexSansKR_600SemiBold',
  bold: 'IBMPlexSansKR_700Bold',
  numMedium: 'SpaceGrotesk_500Medium',
  num: 'SpaceGrotesk_600SemiBold',
  numBold: 'SpaceGrotesk_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 20, xxl: 24, pill: 999 };

export const type = StyleSheet.create({
  /** 큰 숫자 (타이머, 진행률) */
  display: { color: colors.text, fontFamily: fonts.num, fontSize: 64, letterSpacing: -2.5, lineHeight: 68 },
  displaySm: { color: colors.text, fontFamily: fonts.num, fontSize: 56, letterSpacing: -2, lineHeight: 60 },
  largeTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 30, letterSpacing: -0.8, lineHeight: 38 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.3 },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.3 },
  body: { color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  bodyStrong: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  rowTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  caption: { color: colors.sub, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  eyebrow: { color: colors.sub, fontFamily: fonts.medium, fontSize: 13 },
  label: { color: colors.sub, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2 },
  mono: { color: colors.sub, fontFamily: fonts.numMedium, fontSize: 13 },
});

/** 값을 고를 때의 가벼운 진동 (지도에서 위치 선택 등). 규칙은 src/lib/haptics.ts 참고 */
export function tap() {
  haptic.selection();
}

// ---------- 레이아웃 ----------

/** 시안의 화면 틀: 날짜 같은 작은 글씨 + 큰 제목 + 오른쪽 원형 버튼 */
export function Screen({
  eyebrow,
  title,
  right,
  children,
  refreshControl,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  refreshControl?: ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: space.xl, paddingBottom: 40, gap: space.lg }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      <ScreenHeader eyebrow={eyebrow} title={title} right={right} />
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, gap: 4 }}>
        {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
        <Text style={type.largeTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
        <Text style={type.label}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  tone,
  size = 'md',
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'accent' | 'danger';
  /** md: 일반 카드(18), lg: 메인 카드(24) */
  size?: 'md' | 'lg';
}) {
  return (
    <View
      style={[
        s.card,
        size === 'lg' && { borderRadius: radius.xxl, padding: space.xl },
        tone === 'accent' && { borderColor: colors.accentBorder },
        tone === 'danger' && { borderColor: 'rgba(255,92,92,0.35)' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** 목록 카드 (행 사이 구분선 포함) */
export function ListCard({ children }: { children: ReactNode }) {
  return <View style={s.listCard}>{children}</View>;
}

export function Divider({ inset = 52 }: { inset?: number }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: inset }} />;
}

// ---------- 요소 ----------

export function IconBadge({
  name,
  color = colors.text,
  bg = colors.surfaceHigh,
  size = 40,
}: {
  name: IconName;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.325, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

/** 44px 원형 버튼 (프로필, 공유, 추가, 닫기) */
export function IconButton({
  name,
  onPress,
  variant = 'default',
  label,
}: {
  name: IconName;
  onPress: () => void;
  variant?: 'default' | 'accent' | 'dark';
  label: string;
}) {
  const bg = variant === 'accent' ? colors.accent : variant === 'dark' ? colors.bg : colors.surfaceHigh;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        s.iconButton,
        { backgroundColor: bg },
        variant === 'default' && { borderWidth: 1, borderColor: colors.borderStrong },
        pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Ionicons name={name} size={22} color={variant === 'accent' ? colors.onAccent : colors.text} />
    </Pressable>
  );
}

/** 이니셜 아바타 */
export function Avatar({ name, active, size = 40, ring }: { name: string; active?: boolean; size?: number; ring?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: active ? colors.accent : colors.track,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2 : 0,
        borderColor: ring,
      }}
    >
      <Text style={{ color: active ? colors.onAccent : colors.text, fontFamily: fonts.bold, fontSize: size * 0.38 }}>
        {name.slice(0, 1)}
      </Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent },
    secondary: { bg: colors.surfaceHigh, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.sub },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (variant === 'primary') haptic.light();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        variant === 'primary' && { height: 52 },
        { backgroundColor: palette.bg, opacity: disabled ? 0.35 : pressed ? 0.85 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontFamily: fonts.bold, fontSize: variant === 'primary' ? 16 : 15 }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** 아이콘 + 제목 + 설명 + 오른쪽 요소로 된 한 줄 */
export function Row({
  icon,
  leading,
  iconColor = colors.accent,
  iconBg = colors.accentSoft,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: IconName;
  leading?: ReactNode;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={s.row}>
      {leading ?? (icon ? <IconBadge name={icon} color={iconColor} bg={iconBg} /> : null)}
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text style={type.bodyStrong} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, { lineHeight: undefined }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
  );
}

export type PillTone = 'neutral' | 'accent' | 'ok' | 'danger';

export function Pill({ label, tone = 'neutral', dot }: { label: string; tone?: PillTone; dot?: boolean }) {
  const t = {
    neutral: { bg: colors.surfaceHigh, fg: colors.chip },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    ok: { bg: colors.okSoft, fg: colors.ok },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.fg }} /> : null}
      <Text style={{ color: t.fg, fontFamily: fonts.bold, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** 세그먼트 선택 (선택된 칸만 밝게) */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={s.segmented}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              if (!selected) haptic.selection();
              onChange(o.value);
            }}
            style={[s.segment, selected && { backgroundColor: colors.track }]}
          >
            <Text style={{ color: selected ? colors.text : colors.sub, fontFamily: fonts.bold, fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 입력창. label 을 주면 시안처럼 왼쪽에 작은 이름표가 붙습니다 */
export function Input(props: TextInputProps & { icon?: IconName; label?: string; pill?: boolean }) {
  const { icon, label, pill, style, ...rest } = props;
  return (
    <View style={[s.inputWrap, pill && { height: 44, borderRadius: 22, borderWidth: 0 }]}>
      {icon ? <Ionicons name={icon} size={18} color={colors.sub} /> : null}
      {label ? <Text style={[type.caption, { lineHeight: undefined }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.sub}
        selectionColor={colors.accent}
        style={[s.input, label ? { fontFamily: fonts.semibold } : null, style as TextStyle]}
        {...rest}
      />
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  return (
    <View style={{ height: 6, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

/** 정보 안내 카드 (i 아이콘 + 설명) */
export function InfoNote({ children }: { children: string }) {
  return (
    <View style={[s.card, { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14 }]}>
      <Ionicons name="information-circle-outline" size={18} color={colors.sub} style={{ marginTop: 1 }} />
      <Text style={[type.caption, { flex: 1, lineHeight: 20 }]}>{children}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <Card size="lg" style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.md }}>
      <IconBadge name={icon} size={56} color={colors.accent} bg={colors.accentSoft} />
      <Text style={[type.title, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.caption, { textAlign: 'center', lineHeight: 20, maxWidth: 280 }]}>{body}</Text>
      {action}
    </Card>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    height: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  segment: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 48,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
});
