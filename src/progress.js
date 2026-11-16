/**
 * 사람별 준비 현황. 담당 항목이 있는 사람 + 쓰기/모임장 멤버를 보여주고,
 * 담당자가 없는 항목은 '미정' 묶음으로 따로 셉니다.
 */
export function progressByMember(items, members) {
  const rows = new Map();
  const add = (key, name, role) => {
    if (!rows.has(key)) rows.set(key, { key, name, role, total: 0, done: 0, left: [] });
    return rows.get(key);
  };
  members.filter((m) => m.role !== 'reader').forEach((m) => add(m.uid, m.name, m.role));
  for (const it of items) {
    const m = it.assigneeUid ? members.find((x) => x.uid === it.assigneeUid) : null;
    const row = m ? add(m.uid, m.name, m.role) : add('', '담당 미정', null);
    row.total += 1;
    if (it.done) row.done += 1;
    else row.left.push(it.name);
  }
  const list = [...rows.values()];
  const unassigned = list.find((r) => r.key === '');
  const people = list.filter((r) => r.key !== '')
    // 덜 끝난 사람이 앞으로: 남은 개수 많은 순, 같으면 이름순
    .sort((a, b) => (b.total - b.done) - (a.total - a.done) || a.name.localeCompare(b.name, 'ko'));
  return { people, unassigned };
}

export const percent = (done, total) => (total ? Math.round((done / total) * 100) : 0);
