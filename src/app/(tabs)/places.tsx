// "장소" 화면: 헬스장/독서실 등록·삭제
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, colors, Sub, styles, Title } from '../../components/ui';
import { handleRegionEvent, requestLocationPermissions, syncGeofences } from '../../lib/geofence';
import { getPlaces, savePlaces } from '../../lib/storage';
import { KIND_EMOJI, KIND_LABEL, KINDS, type Kind, type Place } from '../../lib/types';
import { useRefreshOnChange } from '../../lib/useRefreshOnChange';
import { uuid } from '../../lib/utils';

const RADII = [100, 150, 300];

export default function PlacesScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [kind, setKind] = useState<Kind>('workout');
  const [radius, setRadius] = useState(150);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getPlaces().then(setPlaces);
  }, []);
  useRefreshOnChange(load);

  async function addPlace() {
    if (!name.trim()) return Alert.alert('이름을 입력해 주세요', '예: 동네 헬스장');
    setSaving(true);
    try {
      const perm = await requestLocationPermissions();
      if (perm === 'denied') return Alert.alert('위치 권한이 필요해요');

      let coords: { latitude: number; longitude: number };
      if (address.trim()) {
        // 주소 → 좌표 변환
        const found = await Location.geocodeAsync(address.trim());
        if (found.length === 0) return Alert.alert('주소를 찾을 수 없어요');
        coords = found[0];
      } else {
        // 지금 있는 위치로 등록
        const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = here.coords;
      }

      const next: Place[] = [
        ...places,
        { id: uuid(), name: name.trim(), kind, radius, latitude: coords.latitude, longitude: coords.longitude },
      ];
      await savePlaces(next);
      setPlaces(next);
      setName('');
      setAddress('');

      const res = await syncGeofences();
      Alert.alert('등록 완료', res.ok ? '이제 이 장소에 도착하면 알려드릴게요.' : res.reason);
    } catch (e) {
      Alert.alert('오류', String(e));
    } finally {
      setSaving(false);
    }
  }

  function removePlace(p: Place) {
    Alert.alert('삭제할까요?', p.name, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const next = places.filter((x) => x.id !== p.id);
          await savePlaces(next);
          setPlaces(next);
          await syncGeofences();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Title>새 장소 등록</Title>
        <TextInput
          style={styles.input}
          placeholder="이름 (예: 동네 헬스장)"
          placeholderTextColor={colors.sub}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="주소 (비워두면 현재 위치)"
          placeholderTextColor={colors.sub}
          value={address}
          onChangeText={setAddress}
        />
        <Sub>종류</Sub>
        <View style={styles.row}>
          {KINDS.map((k) => (
            <Chip key={k} label={`${KIND_EMOJI[k]} ${KIND_LABEL[k]}`} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
        <Sub>감지 반경</Sub>
        <View style={styles.row}>
          {RADII.map((r) => (
            <Chip key={r} label={`${r}m`} selected={radius === r} onPress={() => setRadius(r)} />
          ))}
        </View>
        <Button title={address.trim() ? '주소로 등록' : '현재 위치로 등록'} onPress={addPlace} loading={saving} />
      </Card>

      <Title>내 장소 ({places.length})</Title>
      {places.length === 0 && <Sub>등록된 장소가 없어요.</Sub>}
      {places.map((p) => (
        <Card key={p.id}>
          <Text style={styles.text}>
            {KIND_EMOJI[p.kind]} {p.name}
          </Text>
          <Sub>
            반경 {p.radius}m · {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
          </Sub>
          <View style={styles.row}>
            {/* 개발 중에만 보이는 테스트 버튼: 실제로 이동하지 않아도 도착/이탈을 흉내냄 */}
            {__DEV__ && (
              <>
                <Button title="🧪 도착" variant="secondary" style={{ flex: 1 }} onPress={() => handleRegionEvent('enter', p.id, { ignoreCooldown: true })} />
                <Button title="🧪 이탈" variant="secondary" style={{ flex: 1 }} onPress={() => handleRegionEvent('exit', p.id)} />
              </>
            )}
            <Button title="삭제" variant="danger" style={{ flex: 1 }} onPress={() => removePlace(p)} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
