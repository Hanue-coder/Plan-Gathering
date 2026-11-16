import { useEffect, useState } from 'react';
import { watchGroup, watchItems, watchMembers } from './api';

/** 모임, 멤버, 항목을 실시간으로 구독하고 내 역할을 계산 */
export function useGroup(gid, uid, { items: wantItems = true } = {}) {
  const [group, setGroup] = useState(undefined);
  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fail = (e) => setError(e.code === 'permission-denied'
      ? '이 모임을 볼 권한이 없어요. 모임장에게 초대 링크를 받아 주세요.'
      : `불러오지 못했어요. ${e.message}`);
    const subs = [watchGroup(gid, setGroup, fail), watchMembers(gid, setMembers, fail)];
    if (wantItems) subs.push(watchItems(gid, setItems, fail));
    return () => subs.forEach((u) => u());
  }, [gid, wantItems]);

  const me = members.find((m) => m.uid === uid);
  return { group, members, items, error, role: me?.role };
}
