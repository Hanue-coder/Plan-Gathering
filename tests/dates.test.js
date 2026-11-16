import { describe, expect, it } from 'vitest';
import { addDays, formatTrip, nightsLabel } from '../src/dates';

describe('날짜 표시', () => {
  it('몇박몇일 이름', () => {
    expect(nightsLabel(0)).toBe('당일치기');
    expect(nightsLabel(2)).toBe('2박 3일');
  });
  it('끝나는 날 계산 (월말, 연말 넘김)', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 2)).toBe('2027-01-02');
  });
  it('표시 글자', () => {
    expect(formatTrip('2026-11-28', 1)).toBe('2026-11-28(토) ~ 11-29(일) · 1박 2일');
    expect(formatTrip('2026-11-28', 0)).toBe('2026-11-28(토) · 당일치기');
    expect(formatTrip('2026-12-31', 1)).toBe('2026-12-31(목) ~ 2027-01-01(금) · 1박 2일');
    expect(formatTrip('', 1)).toBe('');
  });
});
