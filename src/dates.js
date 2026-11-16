const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' 에 days일을 더한 날짜 (시간대 영향 없이 UTC로 계산) */
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dow(iso) {
  return DOW[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

/** 0 → '당일치기', 1 → '1박 2일' */
export function nightsLabel(nights) {
  return nights === 0 ? '당일치기' : `${nights}박 ${nights + 1}일`;
}

/** 목록·표에 보여줄 날짜 글자: '2026-11-28(토) ~ 11-29(일) · 1박 2일' */
export function formatTrip(startDate, nights) {
  if (!startDate) return '';
  const start = `${startDate}(${dow(startDate)})`;
  if (!nights) return `${start} · 당일치기`;
  const end = addDays(startDate, nights);
  const endText = end.slice(0, 4) === startDate.slice(0, 4) ? end.slice(5) : end;
  return `${start} ~ ${endText}(${dow(end)}) · ${nightsLabel(nights)}`;
}

export const NIGHT_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

/** 사용자의 현지 날짜 'YYYY-MM-DD' */
export function todayLocal(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 출발까지 남은 날: 'D-12', 'D-DAY', 진행 중이면 '진행 중', 끝났으면 '종료' */
export function dDay(startDate, nights = 0, today = todayLocal()) {
  if (!startDate) return '';
  const diff = Math.round((Date.parse(`${startDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-DAY';
  if (-diff <= nights) return '진행 중';
  return '종료';
}
