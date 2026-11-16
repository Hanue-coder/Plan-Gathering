// Firestore 보안 규칙 테스트: npm run test:rules (Firestore 에뮬레이터가 필요)
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, collectionGroup, getCountFromServer, deleteDoc, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';

let env;
const GID = 'camp';
const future = () => Timestamp.fromMillis(Date.now() + 86400000);
const past = () => Timestamp.fromMillis(Date.now() - 86400000);
const item = (over = {}) => ({ name: '텐트', assigneeUid: 'writer', qty: 1, done: false, memo: '', order: 1, ...over });
const db = (uid) => env.authenticatedContext(uid).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-plan-gathering',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'groups', GID), { name: '캠핑', date: '', place: '', ownerUid: 'owner', columns: [] });
    for (const [uid, role] of [['owner', 'owner'], ['writer', 'writer'], ['writer2', 'writer'], ['reader', 'reader']]) {
      await setDoc(doc(f, 'groups', GID, 'members', uid), { uid, role, name: uid });
    }
    await setDoc(doc(f, 'groups', GID, 'items', 'tent'), item());
    await setDoc(doc(f, 'groups', GID, 'items', 'lamp'), item({ name: '랜턴', assigneeUid: null }));
    await setDoc(doc(f, 'groups', GID, 'items', 'bag'), { name: '침낭', kind: 'personal', checks: { owner: true }, order: 9 });
    await setDoc(doc(f, 'invites', 'GOODCODE'), { groupId: GID, createdBy: 'owner', expiresAt: future() });
    await setDoc(doc(f, 'invites', 'OLDCODE'), { groupId: GID, createdBy: 'owner', expiresAt: past() });
  });
});

describe('모임 만들기', () => {
  it('모임과 모임장 문서를 함께 만들 수 있다', async () => {
    const f = db('alice');
    const b = writeBatch(f);
    b.set(doc(f, 'groups', 'new'), { name: '등산', date: '', place: '', ownerUid: 'alice', columns: [] });
    b.set(doc(f, 'groups', 'new', 'members', 'alice'), { uid: 'alice', role: 'owner', name: 'Alice' });
    await assertSucceeds(b.commit());
  });
  it('출발일과 몇박몇일을 함께 저장할 수 있고, 잘못된 값은 거부된다', async () => {
    const f = db('alice');
    const make = (id, extra) => {
      const b = writeBatch(f);
      b.set(doc(f, 'groups', id), { name: '캠핑', date: '', place: '', ownerUid: 'alice', columns: [], ...extra });
      b.set(doc(f, 'groups', id, 'members', 'alice'), { uid: 'alice', role: 'owner', name: 'Alice' });
      return b.commit();
    };
    await assertSucceeds(make('g1', { startDate: '2026-11-28', nights: 1 }));
    await assertFails(make('g2', { startDate: '11월 28일', nights: 1 }));
    await assertFails(make('g3', { startDate: '2026-11-28', nights: -1 }));
  });
  it('모임장 문서 없이 모임만 만들 수는 없다', async () => {
    await assertFails(setDoc(doc(db('alice'), 'groups', 'new'), { name: '등산', date: '', place: '', ownerUid: 'alice', columns: [] }));
  });
  it('남의 기존 모임에 스스로 모임장으로 들어갈 수 없다', async () => {
    await assertFails(setDoc(doc(db('mallory'), 'groups', GID, 'members', 'mallory'), { uid: 'mallory', role: 'owner', name: 'M' }));
  });
});

describe('읽기', () => {
  it('멤버는 모임, 멤버, 항목을 읽을 수 있다', async () => {
    const f = db('reader');
    await assertSucceeds(getDoc(doc(f, 'groups', GID)));
    await assertSucceeds(getDocs(collection(f, 'groups', GID, 'members')));
    await assertSucceeds(getDocs(collection(f, 'groups', GID, 'items')));
  });
  it('멤버는 준비물 개수를 셀 수 있고, 멤버가 아니면 못 센다', async () => {
    await assertSucceeds(getCountFromServer(collection(db('reader'), 'groups', GID, 'items')));
    await assertFails(getCountFromServer(collection(db('stranger'), 'groups', GID, 'items')));
  });
  it('멤버가 아니면 아무것도 읽을 수 없다', async () => {
    const f = db('stranger');
    await assertFails(getDoc(doc(f, 'groups', GID)));
    await assertFails(getDocs(collection(f, 'groups', GID, 'items')));
  });
  it('로그인하지 않으면 읽을 수 없다', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'groups', GID)));
  });
  it('내 모임 목록 조회는 내 멤버 문서만 가능하다', async () => {
    const f = db('writer');
    await assertSucceeds(getDocs(query(collectionGroup(f, 'members'), where('uid', '==', 'writer'))));
    await assertFails(getDocs(query(collectionGroup(f, 'members'), where('uid', '==', 'owner'))));
  });
});

describe('준비물 항목', () => {
  it('모임장은 항목을 추가, 수정, 삭제할 수 있다', async () => {
    const f = db('owner');
    await assertSucceeds(setDoc(doc(f, 'groups', GID, 'items', 'lamp'), item({ name: '랜턴' })));
    await assertSucceeds(updateDoc(doc(f, 'groups', GID, 'items', 'tent'), { name: '타프', assigneeUid: 'writer2' }));
    await assertSucceeds(deleteDoc(doc(f, 'groups', GID, 'items', 'tent')));
  });
  it('쓰기 멤버는 자기 항목의 수량, 완료, 메모를 바꿀 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(db('writer'), 'groups', GID, 'items', 'tent'), { qty: 2, done: true, memo: '챙김' }));
  });
  it('쓰기 멤버는 자기 항목이라도 품목명이나 담당자는 못 바꾼다', async () => {
    const f = db('writer');
    await assertFails(updateDoc(doc(f, 'groups', GID, 'items', 'tent'), { name: '바꿈' }));
    await assertFails(updateDoc(doc(f, 'groups', GID, 'items', 'tent'), { assigneeUid: 'writer2' }));
  });
  it('쓰기 멤버는 남의 항목을 못 바꾼다', async () => {
    await assertFails(updateDoc(doc(db('writer2'), 'groups', GID, 'items', 'tent'), { done: true }));
  });
  it('쓰기 멤버는 항목을 추가하거나 지울 수 없다', async () => {
    const f = db('writer');
    await assertFails(setDoc(doc(f, 'groups', GID, 'items', 'x'), item({ assigneeUid: 'writer' })));
    await assertFails(deleteDoc(doc(f, 'groups', GID, 'items', 'tent')));
  });
  it('읽기 멤버는 담당 항목이라도 쓸 수 없다', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'groups', GID, 'items', 'tent'), { assigneeUid: 'reader' }));
    await assertFails(updateDoc(doc(db('reader'), 'groups', GID, 'items', 'tent'), { done: true }));
  });
  it('잘못된 값은 거부된다', async () => {
    await assertFails(updateDoc(doc(db('writer'), 'groups', GID, 'items', 'tent'), { qty: -1 }));
    await assertFails(updateDoc(doc(db('writer'), 'groups', GID, 'items', 'tent'), { done: 'yes' }));
  });
});

describe('내가 가져갈게 (공용 항목)', () => {
  const lamp = (uid) => doc(db(uid), 'groups', GID, 'items', 'lamp');
  it('쓰기 멤버는 담당 미정 항목을 가져갈 수 있다', async () => {
    await assertSucceeds(updateDoc(lamp('writer'), { assigneeUid: 'writer' }));
  });
  it('모임장도 가져갈 수 있다', async () => {
    await assertSucceeds(updateDoc(lamp('owner'), { assigneeUid: 'owner' }));
  });
  it('읽기 멤버는 가져갈 수 없다', async () => {
    await assertFails(updateDoc(lamp('reader'), { assigneeUid: 'reader' }));
  });
  it('남의 이름으로 가져가기는 안 된다', async () => {
    await assertFails(updateDoc(lamp('writer'), { assigneeUid: 'writer2' }));
  });
  it('이미 담당이 있는 항목은 가져갈 수 없다', async () => {
    await assertFails(updateDoc(doc(db('writer2'), 'groups', GID, 'items', 'tent'), { assigneeUid: 'writer2' }));
  });
  it('가져가면서 다른 칸을 같이 바꿀 수 없다', async () => {
    await assertFails(updateDoc(lamp('writer'), { assigneeUid: 'writer', qty: 99 }));
  });
  it('내가 맡은 항목은 놓을 수 있고, 남의 항목은 못 놓는다', async () => {
    await assertSucceeds(updateDoc(doc(db('writer'), 'groups', GID, 'items', 'tent'), { assigneeUid: null }));
    await assertFails(updateDoc(doc(db('writer2'), 'groups', GID, 'items', 'bag'), { assigneeUid: null }));
  });
});

describe('개인 준비물', () => {
  const bag = (uid) => doc(db(uid), 'groups', GID, 'items', 'bag');
  it('쓰기 멤버와 읽기 멤버 모두 자기 칸을 체크할 수 있다', async () => {
    await assertSucceeds(updateDoc(bag('writer'), { 'checks.writer': true }));
    await assertSucceeds(updateDoc(bag('reader'), { 'checks.reader': true }));
  });
  it('모임장도 자기 칸만 체크할 수 있다', async () => {
    await assertSucceeds(updateDoc(bag('owner'), { 'checks.owner': false }));
    await assertFails(updateDoc(bag('owner'), { 'checks.writer': true }));
  });
  it('다른 사람 칸은 아무도 바꿀 수 없다', async () => {
    await assertFails(updateDoc(bag('writer'), { 'checks.reader': true }));
    await assertFails(updateDoc(bag('reader'), { 'checks.owner': false }));
  });
  it('여러 칸을 한꺼번에 바꾸거나 값이 true/false가 아니면 거부된다', async () => {
    await assertFails(updateDoc(bag('writer'), { 'checks.writer': true, 'checks.reader': true }));
    await assertFails(updateDoc(bag('writer'), { 'checks.writer': 'yes' }));
  });
  it('멤버가 아니면 체크할 수 없다', async () => {
    await assertFails(updateDoc(bag('stranger'), { 'checks.stranger': true }));
  });
  it('이름과 순서는 모임장만 바꿀 수 있다 (체크는 그대로)', async () => {
    await assertSucceeds(updateDoc(bag('owner'), { name: '침낭(겨울용)' }));
    await assertFails(updateDoc(bag('writer'), { name: '바꿈' }));
  });
  it('모임장은 개인 항목을 추가, 삭제할 수 있고 새 항목의 체크는 비어 있어야 한다', async () => {
    const f = db('owner');
    await assertSucceeds(setDoc(doc(f, 'groups', GID, 'items', 'new1'), { name: '우비', kind: 'personal', checks: {}, order: 10 }));
    await assertFails(setDoc(doc(f, 'groups', GID, 'items', 'new2'), { name: '우비', kind: 'personal', checks: { writer: true }, order: 11 }));
    await assertSucceeds(deleteDoc(doc(f, 'groups', GID, 'items', 'bag')));
  });
  it('쓰기 멤버는 개인 항목을 추가, 삭제할 수 없다', async () => {
    const f = db('writer');
    await assertFails(setDoc(doc(f, 'groups', GID, 'items', 'new3'), { name: '우비', kind: 'personal', checks: {}, order: 10 }));
    await assertFails(deleteDoc(doc(f, 'groups', GID, 'items', 'bag')));
  });
});

describe('템플릿으로 모임 만들기', () => {
  it('모임 생성과 같은 배치에서 템플릿 항목을 함께 만들 수 있다', async () => {
    const f = db('alice');
    const b = writeBatch(f);
    b.set(doc(f, 'groups', 'tpl'), { name: '캠핑', date: '', place: '', ownerUid: 'alice', columns: [] });
    b.set(doc(f, 'groups', 'tpl', 'members', 'alice'), { uid: 'alice', role: 'owner', name: 'Alice' });
    for (let i = 0; i < 15; i++) {
      b.set(doc(f, 'groups', 'tpl', 'items', 's' + i), { name: '공용' + i, kind: 'shared', assigneeUid: null, qty: 1, done: false, memo: '', order: i });
    }
    for (let i = 0; i < 6; i++) {
      b.set(doc(f, 'groups', 'tpl', 'items', 'p' + i), { name: '개인' + i, kind: 'personal', checks: {}, order: 20 + i });
    }
    await assertSucceeds(b.commit());
  });
  it('이미 있는 남의 모임에는 템플릿 항목을 넣을 수 없다', async () => {
    await assertFails(setDoc(doc(db('mallory'), 'groups', GID, 'items', 'x'),
      { name: '침입', kind: 'shared', assigneeUid: null, qty: 1, done: false, memo: '', order: 1 }));
  });
});

describe('멤버와 권한', () => {
  it('모임장은 멤버를 쓰기/읽기로 바꿀 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(db('owner'), 'groups', GID, 'members', 'reader'), { role: 'writer' }));
  });
  it('멤버를 모임장으로 올릴 수는 없다', async () => {
    await assertFails(updateDoc(doc(db('owner'), 'groups', GID, 'members', 'reader'), { role: 'owner' }));
  });
  it('스스로 권한을 올릴 수 없다', async () => {
    await assertFails(updateDoc(doc(db('reader'), 'groups', GID, 'members', 'reader'), { role: 'writer' }));
    await assertFails(updateDoc(doc(db('writer'), 'groups', GID, 'members', 'reader'), { role: 'writer' }));
  });
  it('모임장은 멤버를 내보낼 수 있고, 멤버는 스스로 나갈 수 있다', async () => {
    await assertSucceeds(deleteDoc(doc(db('owner'), 'groups', GID, 'members', 'writer2')));
    await assertSucceeds(deleteDoc(doc(db('reader'), 'groups', GID, 'members', 'reader')));
  });
  it('모임장은 모임을 삭제하지 않고 혼자 나갈 수 없다', async () => {
    await assertFails(deleteDoc(doc(db('owner'), 'groups', GID, 'members', 'owner')));
  });
  it('쓰기 멤버는 다른 멤버를 내보낼 수 없다', async () => {
    await assertFails(deleteDoc(doc(db('writer'), 'groups', GID, 'members', 'reader')));
  });
});

describe('초대 링크', () => {
  const join = (uid, code, role = 'reader') =>
    setDoc(doc(db(uid), 'groups', GID, 'members', uid), { uid, role, name: uid, inviteCode: code });

  it('유효한 초대 코드로 읽기 멤버로 합류한다', async () => {
    await assertSucceeds(join('bob', 'GOODCODE'));
  });
  it('초대 코드로 쓰기 멤버나 모임장으로 합류할 수 없다', async () => {
    await assertFails(join('bob', 'GOODCODE', 'writer'));
    await assertFails(join('bob', 'GOODCODE', 'owner'));
  });
  it('만료되거나 없는 코드로는 합류할 수 없다', async () => {
    await assertFails(join('bob', 'OLDCODE'));
    await assertFails(join('bob', 'NOPE'));
  });
  it('초대 코드는 하나씩만 조회되고 목록은 볼 수 없다', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'invites', 'GOODCODE')));
    await assertFails(getDocs(collection(db('bob'), 'invites')));
  });
  it('모임장만 초대 코드를 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(db('owner'), 'invites', 'NEW1'), { groupId: GID, createdBy: 'owner', expiresAt: future() }));
    await assertFails(setDoc(doc(db('writer'), 'invites', 'NEW2'), { groupId: GID, createdBy: 'writer', expiresAt: future() }));
  });
});

describe('모임 삭제', () => {
  it('모임장은 항목, 멤버, 모임을 한 번에 지울 수 있다', async () => {
    const f = db('owner');
    const b = writeBatch(f);
    b.delete(doc(f, 'groups', GID, 'items', 'tent'));
    for (const uid of ['writer', 'writer2', 'reader']) b.delete(doc(f, 'groups', GID, 'members', uid));
    b.delete(doc(f, 'groups', GID));
    b.delete(doc(f, 'groups', GID, 'members', 'owner'));
    await assertSucceeds(b.commit());
  });
  it('모임장이 아니면 모임을 지울 수 없다', async () => {
    await assertFails(deleteDoc(doc(db('writer'), 'groups', GID)));
  });
});
