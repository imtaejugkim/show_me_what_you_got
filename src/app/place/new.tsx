// 지도에서 장소 고르기 (네이버 지도)
// 현재 위치를 중심으로 지도를 띄우고 → 사용자가 지도를 탭한 좌표를 장소(지오펜스 중심)로 저장합니다.
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  NaverMapCircleOverlay,
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, IconButton, Input, radius, Segmented, space, tap, type } from '../../components/ui';
import { requestLocationPermissions } from '../../lib/geofence';
import { addPlace } from '../../lib/places';
import { KIND_ICON, KIND_LABEL, KINDS, type Kind } from '../../lib/types';

type Coord = { latitude: number; longitude: number };

const RADII = [100, 150, 300];
const SEOUL_CITY_HALL: Coord = { latitude: 37.5666, longitude: 126.9784 };
const ZOOM = 16;

export default function NewPlaceScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<NaverMapViewRef>(null);

  /** 지도를 처음 띄울 중심 (현재 위치). 위치를 받아오기 전에는 null → 로딩 표시 */
  const [start, setStart] = useState<Coord | null>(null);
  /** 사용자가 탭해서 고른 좌표 → 이게 장소의 GPS 좌표가 됨 */
  const [picked, setPicked] = useState<Coord | null>(null);
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('workout');
  const [radiusM, setRadiusM] = useState(150);
  const [saving, setSaving] = useState(false);

  // 1) 현재 위치를 받아서 지도 중심으로
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) throw new Error('denied');
        const here =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        setStart({ latitude: here.coords.latitude, longitude: here.coords.longitude });
      } catch {
        setStart(SEOUL_CITY_HALL); // 권한 거부/에뮬레이터 등 → 서울시청
      }
    })();
  }, []);

  // 2) 지도 탭 → 그 좌표를 선택
  async function pick(c: Coord) {
    tap();
    setPicked(c);
    setAddress('');
    try {
      const [a] = await Location.reverseGeocodeAsync(c);
      if (a) setAddress([a.region, a.city, a.district, a.street, a.streetNumber].filter(Boolean).join(' '));
    } catch {
      // 주소 변환 실패해도 좌표로 저장 가능
    }
  }

  async function goToMyLocation() {
    try {
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      mapRef.current?.animateCameraTo({ latitude: here.coords.latitude, longitude: here.coords.longitude, zoom: ZOOM });
    } catch {
      Alert.alert('현재 위치를 가져올 수 없어요');
    }
  }

  async function search() {
    if (!query.trim()) return;
    try {
      const found = await Location.geocodeAsync(query.trim());
      if (found.length === 0) return Alert.alert('주소를 찾을 수 없어요', '도로명 주소로 검색해 보세요.');
      const c = { latitude: found[0].latitude, longitude: found[0].longitude };
      mapRef.current?.animateCameraTo({ ...c, zoom: ZOOM });
      await pick(c);
    } catch (e) {
      Alert.alert('검색 실패', String(e));
    }
  }

  async function save() {
    if (!picked) return;
    if (!name.trim()) return Alert.alert('이름을 입력해 주세요', '예: 동네 헬스장');
    setSaving(true);
    try {
      const perm = await requestLocationPermissions();
      if (perm === 'denied') return Alert.alert('위치 권한이 필요해요');
      const res = await addPlace({ name: name.trim(), kind, radius: radiusM, ...picked });
      if (!res.ok) Alert.alert('등록 완료', res.reason);
      router.back();
    } catch (e) {
      Alert.alert('오류', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {start ? (
        <NaverMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialCamera={{ ...start, zoom: ZOOM }}
          isShowLocationButton={false}
          isShowZoomControls={false}
          isShowCompass={false}
          locale="ko"
          mapPadding={{ bottom: picked ? 380 : 160 }}
          onInitialized={() => mapRef.current?.setLocationTrackingMode('NoFollow')}
          onTapMap={({ latitude, longitude }) => pick({ latitude, longitude })}
        >
          {picked && (
            <>
              <NaverMapCircleOverlay
                {...picked}
                radius={radiusM}
                color="rgba(215,255,63,0.18)"
                outlineColor={colors.accent}
                outlineWidth={2}
              />
              <NaverMapMarkerOverlay {...picked} image={{ symbol: 'green' }} width={28} height={40} anchor={{ x: 0.5, y: 1 }} />
            </>
          )}
        </NaverMapView>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={type.caption}>현재 위치를 찾는 중…</Text>
        </View>
      )}

      {/* 상단: 닫기 + 검색 */}
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <IconButton name="close" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Input
            icon="search"
            placeholder="주소 검색"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            style={{ paddingVertical: 11 }}
          />
        </View>
      </View>

      {/* 하단 시트 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={{ alignItems: 'flex-end', paddingHorizontal: space.lg, marginBottom: space.md }}>
          <Pressable onPress={goToMyLocation} style={styles.locate}>
            <Ionicons name="locate" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.handle} />
          {!picked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
              <Ionicons name="finger-print-outline" size={28} color={colors.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.title}>지도를 눌러 위치를 선택하세요</Text>
                <Text style={type.caption}>헬스장·독서실 건물 위를 눌러주세요</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={{ gap: 2 }}>
                <Text style={type.title} numberOfLines={1}>
                  {address || '선택한 위치'}
                </Text>
                <Text style={type.caption}>
                  {picked.latitude.toFixed(6)}, {picked.longitude.toFixed(6)}
                </Text>
              </View>
              <Input icon="pricetag-outline" placeholder="장소 이름 (예: 동네 헬스장)" value={name} onChangeText={setName} />
              <Segmented
                options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k], icon: KIND_ICON[k] }))}
                value={kind}
                onChange={setKind}
              />
              <Segmented options={RADII.map((r) => ({ value: r, label: `반경 ${r}m` }))} value={radiusM} onChange={setRadiusM} />
              <Button title="이 위치로 등록" icon="checkmark" onPress={save} loading={saving} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  locate: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.muted, marginBottom: 4 },
});
