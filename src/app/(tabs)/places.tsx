// "장소" 화면: 등록한 장소를 지도 + 목록으로 보여주고, 지도에서 새 장소 추가
import { router } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, View } from 'react-native';
import {
  NaverMapCircleOverlay,
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { Button, Card, colors, Divider, EmptyState, IconButton, Pill, radius, Row, Screen, Section, space } from '../../components/ui';
import { handleRegionEvent } from '../../lib/geofence';
import { removePlace } from '../../lib/places';
import { getPlaces } from '../../lib/storage';
import { KIND_ICON, KIND_LABEL, type Place } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';

export default function PlacesScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const mapRef = useRef<NaverMapViewRef>(null);

  const load = useCallback(() => {
    getPlaces().then(setPlaces);
  }, []);
  useRefreshOnChange(load);

  // 모든 장소가 보이도록 지도 맞추기
  useEffect(() => {
    if (places.length === 0) return;
    const lats = places.map((p) => p.latitude);
    const lngs = places.map((p) => p.longitude);
    const pad = 0.004; // 약 400m 여유
    const t = setTimeout(() => {
      mapRef.current?.animateRegionTo({
        latitude: Math.min(...lats) - pad,
        longitude: Math.min(...lngs) - pad,
        latitudeDelta: Math.max(...lats) - Math.min(...lats) + pad * 2,
        longitudeDelta: Math.max(...lngs) - Math.min(...lngs) + pad * 2,
        duration: 0,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [places]);

  function openActions(p: Place) {
    const actions: { label: string; run: () => void; destructive?: boolean }[] = [];
    // 개발 빌드에서만: 실제로 이동하지 않아도 도착/이탈을 흉내내는 테스트
    if (__DEV__) {
      actions.push({ label: '🧪 도착 테스트', run: () => handleRegionEvent('enter', p.id, { ignoreCooldown: true }) });
      actions.push({ label: '🧪 이탈 테스트', run: () => handleRegionEvent('exit', p.id) });
    }
    actions.push({
      label: '삭제',
      destructive: true,
      run: () =>
        Alert.alert(`"${p.name}" 삭제`, '이 장소의 자동 감지가 중단돼요.', [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: () => removePlace(p.id) },
        ]),
    });

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: p.name,
          options: [...actions.map((a) => a.label), '취소'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
        },
        (i) => actions[i]?.run(),
      );
    } else {
      Alert.alert(p.name, undefined, [
        ...actions.map((a) => ({ text: a.label, onPress: a.run, style: a.destructive ? ('destructive' as const) : undefined })),
        { text: '취소', style: 'cancel' as const },
      ]);
    }
  }

  return (
    <Screen title="장소" right={<IconButton name="add" accent onPress={() => router.push('/place/new')} />}>
      {places.length === 0 ? (
        <EmptyState
          icon="map-outline"
          title="자주 가는 장소를 등록하세요"
          body="헬스장이나 독서실에 도착하면 자동으로 알려드리고, 떠나면 기록을 마무리해요."
          action={<Button title="지도에서 장소 추가" icon="add" onPress={() => router.push('/place/new')} style={{ alignSelf: 'stretch' }} />}
        />
      ) : (
        <>
          <View style={{ height: 220, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <NaverMapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialCamera={{ latitude: places[0].latitude, longitude: places[0].longitude, zoom: 14 }}
              isShowLocationButton={false}
              isShowZoomControls={false}
              locale="ko"
            >
              {places.map((p) => (
                <Fragment key={p.id}>
                  <NaverMapCircleOverlay
                    latitude={p.latitude}
                    longitude={p.longitude}
                    radius={p.radius}
                    color="rgba(215,255,63,0.18)"
                    outlineColor={colors.accent}
                    outlineWidth={1.5}
                  />
                  <NaverMapMarkerOverlay
                    latitude={p.latitude}
                    longitude={p.longitude}
                    image={{ symbol: 'green' }}
                    width={24}
                    height={34}
                    caption={{ text: p.name }}
                    onTap={() => openActions(p)}
                  />
                </Fragment>
              ))}
            </NaverMapView>
          </View>

          <Section title={`내 장소 ${places.length}`}>
            <Card style={{ paddingVertical: space.xs, gap: 0 }}>
              {places.map((p, i) => (
                <View key={p.id}>
                  {i > 0 && <Divider />}
                  <Row
                    icon={KIND_ICON[p.kind]}
                    iconColor={colors.accent}
                    iconBg={colors.accentSoft}
                    title={p.name}
                    subtitle={`반경 ${p.radius}m`}
                    right={<Pill label={KIND_LABEL[p.kind]} />}
                    onPress={() => openActions(p)}
                  />
                </View>
              ))}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}
