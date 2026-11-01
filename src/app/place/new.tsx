// 지도에서 장소 고르기: 지도를 움직여 가운데 핀을 원하는 위치에 맞추고 저장
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, IconButton, Input, radius, Segmented, space, type } from '../../components/ui';
import { requestLocationPermissions } from '../../lib/geofence';
import { addPlace } from '../../lib/places';
import { KIND_ICON, KIND_LABEL, KINDS, type Kind } from '../../lib/types';

const RADII = [100, 150, 300];
const SEOUL: Region = { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.01, longitudeDelta: 0.01 };

export default function NewPlaceScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [center, setCenter] = useState({ latitude: SEOUL.latitude, longitude: SEOUL.longitude });
  const [label, setLabel] = useState<string>('');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('workout');
  const [radiusM, setRadiusM] = useState(150);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // 처음 열면 내 위치로 이동
  useEffect(() => {
    goToMyLocation();
    // 화면을 처음 열 때 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveTo(lat: number, lng: number) {
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 400);
  }

  async function goToMyLocation() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      moveTo(here.coords.latitude, here.coords.longitude);
    } catch {
      // 에뮬레이터 등에서 위치를 못 가져오면 서울 시청에 머무름
    } finally {
      setLocating(false);
    }
  }

  async function search() {
    if (!query.trim()) return;
    try {
      const found = await Location.geocodeAsync(query.trim());
      if (found.length === 0) return Alert.alert('주소를 찾을 수 없어요', '도로명 주소나 건물 이름으로 검색해 보세요.');
      moveTo(found[0].latitude, found[0].longitude);
      if (!name) setName(query.trim());
    } catch (e) {
      Alert.alert('검색 실패', String(e));
    }
  }

  // 지도가 멈추면 가운데 좌표의 주소를 보여줌
  async function onRegionChangeComplete(r: Region) {
    setCenter({ latitude: r.latitude, longitude: r.longitude });
    try {
      const [addr] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
      if (addr) setLabel([addr.city, addr.district, addr.street, addr.streetNumber].filter(Boolean).join(' '));
    } catch {
      setLabel('');
    }
  }

  async function save() {
    if (!name.trim()) return Alert.alert('이름을 입력해 주세요', '예: 동네 헬스장');
    setSaving(true);
    try {
      const perm = await requestLocationPermissions();
      if (perm === 'denied') return Alert.alert('위치 권한이 필요해요');
      const res = await addPlace({ name: name.trim(), kind, radius: radiusM, ...center });
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
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={SEOUL}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle="dark"
        toolbarEnabled={false}
      >
        <Circle center={center} radius={radiusM} strokeColor={colors.accent} strokeWidth={2} fillColor="rgba(215,255,63,0.15)" />
      </MapView>

      {/* 가운데 고정 핀 */}
      <View pointerEvents="none" style={styles.pinWrap}>
        {/* 핀 전체 높이(40+14)만큼 위로 올려서 꼬리 끝이 정확히 지도 가운데에 오게 함 */}
        <View style={{ alignItems: 'center', marginBottom: 54 }}>
          <View style={styles.pin}>
            <Ionicons name={KIND_ICON[kind]} size={18} color={colors.onAccent} />
          </View>
          <View style={styles.pinTail} />
        </View>
      </View>

      {/* 상단: 닫기 + 검색 */}
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <IconButton name="close" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Input
            icon="search"
            placeholder="주소, 건물 이름 검색"
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
            {locating ? <ActivityIndicator color={colors.text} /> : <Ionicons name="locate" size={22} color={colors.text} />}
          </Pressable>
        </View>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.handle} />
          <View style={{ gap: 2 }}>
            <Text style={type.title}>지도를 움직여 위치를 맞춰주세요</Text>
            <Text style={type.caption} numberOfLines={1}>
              {label || `${center.latitude.toFixed(5)}, ${center.longitude.toFixed(5)}`}
            </Text>
          </View>
          <Input icon="pricetag-outline" placeholder="장소 이름 (예: 동네 헬스장)" value={name} onChangeText={setName} />
          <Segmented
            options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k], icon: KIND_ICON[k] }))}
            value={kind}
            onChange={setKind}
          />
          <Segmented options={RADII.map((r) => ({ value: r, label: `${r}m` }))} value={radiusM} onChange={setRadiusM} />
          <Button title="이 위치로 등록" icon="checkmark" onPress={save} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  pinWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  pinTail: { width: 3, height: 14, backgroundColor: colors.accent, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
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
