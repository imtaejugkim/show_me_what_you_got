// 사진 EXIF 에서 촬영 위치·시각 꺼내기.
// iOS 와 안드로이드가 EXIF 를 다른 모양으로 주기 때문에 둘 다 처리한다.
//  - iOS:     { "{GPS}": { Latitude: 37.5, LatitudeRef: "N", ... }, "{Exif}": { DateTimeOriginal: "2026:11:03 14:22:01" } }
//  - Android: { GPSLatitude: 37.5 또는 "37/1,33/1,4512/100", GPSLatitudeRef: "N", DateTimeOriginal: "..." }

type Exif = Record<string, unknown>;

export type ExifInfo = {
  /** 위치가 없거나 (0,0) 처럼 지워진 값이면 null */
  coords: { latitude: number; longitude: number } | null;
  /** 촬영 시각 (없으면 null) */
  takenAt: Date | null;
};

export function readExif(exif: Exif | null | undefined): ExifInfo {
  if (!exif) return { coords: null, takenAt: null };
  const gps = (exif['{GPS}'] as Exif | undefined) ?? {};
  const exifDict = (exif['{Exif}'] as Exif | undefined) ?? {};

  const lat = toDegrees(gps.Latitude ?? exif.GPSLatitude, gps.LatitudeRef ?? exif.GPSLatitudeRef, 'S');
  const lng = toDegrees(gps.Longitude ?? exif.GPSLongitude, gps.LongitudeRef ?? exif.GPSLongitudeRef, 'W');
  const valid =
    lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

  const rawTime = exifDict.DateTimeOriginal ?? exif.DateTimeOriginal ?? exif.DateTime;
  return {
    coords: valid ? { latitude: lat!, longitude: lng! } : null,
    takenAt: parseExifDate(rawTime),
  };
}

/** 37.5 / "37.5" / "37/1,33/1,4512/100" / [37, 33, 45.12] → 십진수 도. 남위·서경이면 음수 */
function toDegrees(value: unknown, ref: unknown, negativeRef: 'S' | 'W'): number | null {
  let deg: number | null = null;
  if (typeof value === 'number') deg = value;
  else if (Array.isArray(value)) deg = dms(value.map(Number));
  else if (typeof value === 'string') {
    const parts = value.split(',').map((p) => p.trim());
    if (parts.length >= 2) deg = dms(parts.map(rational));
    else deg = rational(parts[0]);
  }
  if (deg === null || !Number.isFinite(deg)) return null;
  const negative = typeof ref === 'string' && ref.trim().toUpperCase().startsWith(negativeRef);
  return negative ? -Math.abs(deg) : deg;
}

function dms([d = 0, m = 0, s = 0]: number[]): number {
  return d + m / 60 + s / 3600;
}

function rational(text: string): number {
  const [n, d] = text.split('/').map(Number);
  return d ? n / d : n;
}

/** "2026:11:03 14:22:01" (기기 현지 시각) → Date */
function parseExifDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(d.getTime()) ? null : d;
}
