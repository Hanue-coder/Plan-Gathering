import {
  collection, collectionGroup, doc, getDoc, getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp, writeBatch, updateDoc, setDoc, deleteDoc, addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { formatTrip } from './dates';

export const DEFAULT_COLUMNS = [
  { key: 'name', label: '품목' },
  { key: 'assignee', label: '담당자' },
  { key: 'qty', label: '수량' },
  { key: 'done', label: '준비 완료' },
  { key: 'memo', label: '메모' },
];

export const ROLE_LABEL = { owner: '모임장', writer: '쓰기 멤버', reader: '읽기 멤버' };

const displayName = (user) => (user.displayName || user.email || '이름 없음').slice(0, 60);

/** 모임을 만들고, 만든 사람을 모임장으로 등록 */
export async function createGroup(user, { name, startDate, nights, place }) {
  const groupRef = doc(collection(db, 'groups'));
  const batch = writeBatch(db);
  batch.set(groupRef, {
    name: name.trim(),
    date: formatTrip(startDate, nights),
    startDate: startDate || '',
    nights: startDate ? nights : 0,
    place: place.trim(),
    ownerUid: user.uid,
    columns: DEFAULT_COLUMNS,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(groupRef, 'members', user.uid), {
    uid: user.uid,
    role: 'owner',
    name: displayName(user),
    photoURL: user.photoURL || null,
    joinedAt: serverTimestamp(),
  });
  await batch.commit();
  return groupRef.id;
}

/** 내가 속한 모임 목록 (실시간) */
export function watchMyGroups(uid, cb, onError) {
  const q = query(collectionGroup(db, 'members'), where('uid', '==', uid));
  return onSnapshot(q, async (snap) => {
    const rows = await Promise.all(snap.docs.map(async (m) => {
      const gid = m.ref.parent.parent.id;
      const g = await getDoc(doc(db, 'groups', gid)).catch(() => null);
      if (!g || !g.exists()) return null;
      return { id: gid, role: m.data().role, ...g.data() };
    }));
    cb(rows.filter(Boolean).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  }, onError);
}

export function watchGroup(gid, cb, onError) {
  return onSnapshot(doc(db, 'groups', gid), (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null), onError);
}

export function watchMembers(gid, cb, onError) {
  return onSnapshot(collection(db, 'groups', gid, 'members'),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

export function watchItems(gid, cb, onError) {
  return onSnapshot(query(collection(db, 'groups', gid, 'items'), orderBy('order')),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

export function addItem(gid, order) {
  return addDoc(collection(db, 'groups', gid, 'items'), {
    name: '새 준비물', assigneeUid: null, qty: 1, done: false, memo: '', order, updatedAt: serverTimestamp(),
  });
}

/** 항목 수정. 쓰기 멤버는 qty/done/memo만 보낼 수 있음 (규칙에서 검사) */
export function updateItem(gid, itemId, patch) {
  return updateDoc(doc(db, 'groups', gid, 'items', itemId), { ...patch, updatedAt: serverTimestamp() });
}

export function deleteItem(gid, itemId) {
  return deleteDoc(doc(db, 'groups', gid, 'items', itemId));
}

export function setMemberRole(gid, uid, role) {
  return updateDoc(doc(db, 'groups', gid, 'members', uid), { role });
}

export function removeMember(gid, uid) {
  return deleteDoc(doc(db, 'groups', gid, 'members', uid));
}

function randomCode(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/** 7일 동안 쓸 수 있는 초대 코드 만들기 */
export async function createInvite(user, gid) {
  const code = randomCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await setDoc(doc(db, 'invites', code), { groupId: gid, createdBy: user.uid, expiresAt });
  return { code, expiresAt };
}

export async function getInvite(code) {
  const s = await getDoc(doc(db, 'invites', code));
  return s.exists() ? s.data() : null;
}

/** 초대 코드로 읽기 멤버로 합류 */
export async function joinWithInvite(user, code) {
  const inv = await getInvite(code);
  if (!inv) throw new Error('초대 링크를 찾을 수 없어요. 모임장에게 새 링크를 받아 주세요.');
  if (inv.expiresAt.toMillis() < Date.now()) throw new Error('초대 링크가 만료됐어요. 모임장에게 새 링크를 받아 주세요.');
  const ref = doc(db, 'groups', inv.groupId, 'members', user.uid);
  const already = await getDoc(ref).catch(() => null);
  if (already && already.exists()) return inv.groupId;
  await setDoc(ref, {
    uid: user.uid, role: 'reader', name: displayName(user), photoURL: user.photoURL || null,
    joinedAt: serverTimestamp(), inviteCode: code,
  });
  return inv.groupId;
}

/** 모임 삭제: 항목, 멤버, 모임 문서를 한 번에 지움 */
export async function deleteGroup(gid, ownerUid) {
  const [items, members] = await Promise.all([
    getDocs(collection(db, 'groups', gid, 'items')),
    getDocs(collection(db, 'groups', gid, 'members')),
  ]);
  const batch = writeBatch(db);
  items.forEach((d) => batch.delete(d.ref));
  members.forEach((d) => { if (d.id !== ownerUid) batch.delete(d.ref); });
  batch.delete(doc(db, 'groups', gid));
  batch.delete(doc(db, 'groups', gid, 'members', ownerUid));
  await batch.commit();
}

export function leaveGroup(gid, uid) {
  return deleteDoc(doc(db, 'groups', gid, 'members', uid));
}
