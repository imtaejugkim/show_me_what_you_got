// 디자인 시스템: 색, 글자 크기, 공통 컴포넌트. 화면들은 여기 있는 조각만 조합해서 만듭니다.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
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

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const colors = {
  bg: '#0A0A0B',
  surface: '#141416',
  surfaceHigh: '#1D1D20',
  border: 'rgba(255,255,255,0.07)',
  text: '#F5F5F7',
  sub: '#8E8E93',
  muted: '#55555B',
  accent: '#D7FF3F',
  accentSoft: 'rgba(215,255,63,0.12)',
  onAccent: '#0A0A0B',
  danger: '#FF5C5C',
  dangerSoft: 'rgba(255,92,92,0.12)',
  ok: '#34D399',
  okSoft: 'rgba(52,211,153,0.12)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const type = StyleSheet.create({
  display: { color: colors.text, fontSize: 44, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  largeTitle: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  body: { color: colors.text, fontSize: 16, fontWeight: '500' },
  bodyStrong: { color: colors.text, fontSize: 16, fontWeight: '700' },
  caption: { color: colors.sub, fontSize: 13, fontWeight: '500' },
  label: { color: colors.sub, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
});

export function tap() {
  Haptics.selectionAsync().catch(() => {});
}

// ---------- 레이아웃 ----------

/** 큰 제목이 있는 스크롤 화면 (탭 화면용) */
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
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: 48, gap: space.lg }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.xs }}>
        <View style={{ flex: 1, gap: 2 }}>
          {eyebrow ? <Text style={type.caption}>{eyebrow}</Text> : null}
          <Text style={type.largeTitle}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
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

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: 'accent' | 'danger' }) {
  return (
    <View
      style={[
        s.card,
        tone === 'accent' && { borderColor: 'rgba(215,255,63,0.35)' },
        tone === 'danger' && { borderColor: 'rgba(255,92,92,0.35)' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 56 }} />;
}

// ---------- 요소 ----------

export function IconBadge({ name, color = colors.text, bg = colors.surfaceHigh, size = 40 }: { name: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function IconButton({ name, onPress, accent }: { name: IconName; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [
        s.iconButton,
        accent && { backgroundColor: colors.accent },
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Ionicons name={name} size={22} color={accent ? colors.onAccent : colors.text} />
    </Pressable>
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
  size = 'lg',
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'md' | 'lg';
}) {
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent },
    secondary: { bg: colors.surfaceHigh, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.sub },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[variant];
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        size === 'md' && { paddingVertical: 11, borderRadius: radius.sm },
        { backgroundColor: palette.bg, opacity: disabled ? 0.35 : pressed ? 0.8 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontSize: size === 'md' ? 15 : 16, fontWeight: '700' }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** 아이콘 + 제목 + 설명 + 오른쪽 요소로 된 한 줄 */
export function Row({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={s.row}>
      <IconBadge name={icon} color={iconColor} bg={iconBg} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.bodyStrong} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={type.caption} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'accent' | 'ok' | 'danger'; icon?: IconName }) {
  const t = {
    neutral: { bg: colors.surfaceHigh, fg: colors.sub },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    ok: { bg: colors.okSoft, fg: colors.ok },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

/** iOS 스타일 세그먼트 선택 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[s.segment, selected && { backgroundColor: colors.surfaceHigh }]}
          >
            {o.icon ? <Ionicons name={o.icon} size={15} color={selected ? colors.text : colors.sub} /> : null}
            <Text style={{ color: selected ? colors.text : colors.sub, fontWeight: '700', fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Input(props: TextInputProps & { icon?: IconName }) {
  const { icon, style, ...rest } = props;
  return (
    <View style={s.inputWrap}>
      {icon ? <Ionicons name={icon} size={18} color={colors.sub} /> : null}
      <TextInput placeholderTextColor={colors.muted} selectionColor={colors.accent} style={[s.input, style as TextStyle]} {...rest} />
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  return (
    <View style={{ height: 6, backgroundColor: colors.surfaceHigh, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.md }}>
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
  button: {
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 13 },
});
