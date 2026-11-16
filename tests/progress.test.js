import { describe, expect, it } from 'vitest';
import { progressByMember } from '../src/progress';
import { dDay } from '../src/dates';

const members = [
  { uid: 'a', name: '태성', role: 'owner' },
  { uid: 'b', name: '지훈', role: 'writer' },
  { uid: 'c', name: '도윤', role: 'reader' },
];
const items = [
  { name: '텐트', assigneeUid: 'b', done: true },
  { name: '타프', assigneeUid: 'b', done: false },
  { name: '버너', assigneeUid: 'a', done: true },
  { name: '랜턴', assigneeUid: null, done: false },
];

describe('사람별 준비 현황', () => {
  it('사람별로 세고 남은 사람이 앞에 온다', () => {
    const { people, unassigned } = progressByMember(items, members);
    expect(people.map((p) => [p.name, p.done, p.total])).toEqual([['지훈', 1, 2], ['태성', 1, 1]]);
    expect(people[0].left).toEqual(['타프']);
    expect(unassigned).toMatchObject({ total: 1, left: ['랜턴'] });
  });
  it('읽기 멤버는 담당이 없으면 빠진다', () => {
    const { people } = progressByMember([], members);
    expect(people.map((p) => p.name)).not.toContain('도윤');
  });
});

describe('D-day', () => {
  it('출발 전, 당일, 진행 중, 종료', () => {
    expect(dDay('2026-11-28', 1, '2026-11-16')).toBe('D-12');
    expect(dDay('2026-11-28', 1, '2026-11-28')).toBe('D-DAY');
    expect(dDay('2026-11-28', 1, '2026-11-29')).toBe('진행 중');
    expect(dDay('2026-11-28', 1, '2026-11-30')).toBe('종료');
    expect(dDay('', 1, '2026-11-16')).toBe('');
  });
});
