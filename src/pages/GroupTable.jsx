import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth';
import { useGroup } from '../useGroup';
import MemberProgress from '../components/MemberProgress';
import { dDay } from '../dates';
import { percent } from '../progress';
import {
  ROLE_LABEL, addItem, claimItem, deleteItem, leaveGroup, releaseItem, setMyCheck, updateItem,
} from '../api';

export default function GroupTable() {
  const { gid } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { group, members, items: allItems, error, role } = useGroup(gid, user.uid);
  const [msg, setMsg] = useState('');

  const fail = (what) => (e) => setMsg(`${what} ${e.message}`);
  const save = (itemId, patch) => updateItem(gid, itemId, patch).catch(fail('저장하지 못했어요.'));

  if (error) return <><TopBar title="모임" back="/" /><div className="screen"><p className="error">{error}</p></div></>;
  if (group === undefined || !role) return <><TopBar title="모임" back="/" /><div className="screen"><p className="muted">불러오는 중…</p></div></>;
  if (group === null) return <><TopBar title="모임" back="/" /><div className="screen"><p className="error">모임이 삭제됐거나 없어요.</p></div></>;

  const isOwner = role === 'owner';
  const isWriter = role === 'writer';
  const shared = allItems.filter((i) => i.kind !== 'personal');
  const personal = allItems.filter((i) => i.kind === 'personal');
  const nextOrder = (allItems.at(-1)?.order ?? 0) + 1;
  const nameOf = (uid) => members.find((m) => m.uid === uid)?.name || '미정';
  const assignable = members.filter((m) => m.role !== 'reader');

  // 개인 준비물 표의 열: 나를 맨 앞에, 그다음 모임장, 나머지는 이름순
  const columns = [...members].sort((a, b) =>
    (b.uid === user.uid) - (a.uid === user.uid)
    || (b.role === 'owner') - (a.role === 'owner')
    || a.name.localeCompare(b.name, 'ko'));

  const sharedDone = shared.filter((i) => i.done).length;
  const open = shared.filter((i) => !i.assigneeUid).length;
  const checkedBy = (uid) => personal.filter((i) => i.checks?.[uid]).length;
  const personalChecks = members.reduce((n, m) => n + checkedBy(m.uid), 0);
  const personalTotal = personal.length * members.length;
  const myChecks = checkedBy(user.uid);

  async function leave() {
    try { await leaveGroup(gid, user.uid); nav('/', { replace: true }); }
    catch (e) { setMsg(`나가지 못했어요. ${e.message}`); }
  }

  const roleNote = isOwner
    ? '모임장은 공용 준비물의 모든 칸을 고치고 항목을 추가·삭제할 수 있어요.'
    : isWriter
      ? '노란 줄이 내 담당이에요. 담당이 없는 항목은 "내가 가져갈게"로 가져갈 수 있어요.'
      : '읽기 멤버는 공용 준비물을 보기만 할 수 있어요. 개인 준비물은 내 칸을 체크할 수 있어요.';

  return (
    <>
      <TopBar title={group.name} back="/" />
      <div className="screen">
        <div className="summary">
          <span className={`role ${role === 'reader' ? 'reader' : ''}`}>{ROLE_LABEL[role]}</span>
          {group.date && <span className="muted">{group.date}{group.startDate && <span className="dday">{dDay(group.startDate, group.nights)}</span>}</span>}
          {isOwner && <Link className="link push" to={`/g/${gid}/members`}>멤버 관리</Link>}
        </div>

        <div className="cards">
          <div className="card"><span className="muted">공용 준비물</span><span className="big">{sharedDone} / {shared.length}</span>
            <span className="meter" aria-hidden="true"><i style={{ width: `${percent(sharedDone, shared.length)}%` }} /></span></div>
          <div className="card"><span className="muted">개인 준비물 (전체 체크)</span><span className="big">{personalChecks} / {personalTotal}</span>
            <span className="meter" aria-hidden="true"><i style={{ width: `${percent(personalChecks, personalTotal)}%` }} /></span></div>
          <div className="card"><span className="muted">내 개인 준비물</span><span className="big">{myChecks} / {personal.length}</span>
            <span className="meter" aria-hidden="true"><i style={{ width: `${percent(myChecks, personal.length)}%` }} /></span></div>
          <div className={`card ${open ? 'warn' : ''}`}><span className="muted">담당 미정</span><span className="big">{open}개</span>
            <span className="muted">{open ? '가져갈 사람을 기다려요' : '모두 담당이 정해졌어요'}</span></div>
        </div>

        {open > 0 && role !== 'reader' && (
          <div className="banner">
            <span><b>아직 가져갈 사람이 없는 공용 준비물이 {open}개</b> 있어요.{' '}
              {isWriter ? '아래에서 "내가 가져갈게"를 눌러 주세요.' : '멤버가 직접 가져가거나, 담당자 칸에서 지정할 수 있어요.'}</span>
          </div>
        )}

        <MemberProgress items={shared} members={members} myUid={user.uid} />

        <section className="sect">
          <h2>공용 준비물 <span className="muted">한 명이 챙기면 모두가 써요</span></h2>
          <p className="muted">{roleNote} 왼쪽 주황 선은 아직 가져갈 사람이 없는 항목이에요.</p>
          <div className="tablebox">
            <table className="shared">
              <thead>
                <tr><th className="c-name">품목</th><th className="c-who">담당자</th><th className="c-qty">수량</th><th className="c-done">준비 완료</th><th className="c-memo">메모</th>{isOwner && <th className="c-del"><span className="sr">삭제</span></th>}</tr>
              </thead>
              <tbody>
                {shared.length === 0 && (
                  <tr><td colSpan={isOwner ? 6 : 5} className="muted">
                    {isOwner ? '아직 공용 준비물이 없어요. 아래 버튼으로 추가해 주세요.' : '아직 공용 준비물이 없어요.'}
                  </td></tr>
                )}
                {shared.map((it) => {
                  const mine = it.assigneeUid === user.uid;
                  const canEdit = isOwner || (isWriter && mine);
                  return (
                    <tr key={it.id} className={`${mine ? 'mine' : ''} ${it.assigneeUid ? '' : 'open'}`}>
                      <td>{isOwner
                        ? <TextCell id={`n-${it.id}`} label="품목" value={it.name} max={80} onSave={(v) => v.trim() && save(it.id, { name: v.trim() })} />
                        : it.name}</td>
                      <td>
                        {isOwner ? (
                          <select id={`a-${it.id}`} aria-label={`${it.name} 담당자`} value={it.assigneeUid || ''}
                            onChange={(e) => save(it.id, { assigneeUid: e.target.value || null })}>
                            <option value="">미정</option>
                            {assignable.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                            {it.assigneeUid && !assignable.some((m) => m.uid === it.assigneeUid) && (
                              <option value={it.assigneeUid}>{nameOf(it.assigneeUid)} (권한 없음)</option>
                            )}
                          </select>
                        ) : !it.assigneeUid ? (
                          isWriter
                            ? <button type="button" className="btn small"
                                onClick={() => claimItem(gid, it.id, user.uid).then(() => setMsg(`"${it.name}"을(를) 내가 가져가기로 했어요`)).catch(fail('가져가지 못했어요.'))}>내가 가져갈게</button>
                            : <span className="open-tag">담당 미정</span>
                        ) : (
                          <span className="who">{nameOf(it.assigneeUid)}
                            {mine && isWriter && (
                              <button type="button" className="link quiet"
                                onClick={() => releaseItem(gid, it.id).then(() => setMsg(`"${it.name}"을(를) 놓았어요. 다른 멤버가 가져갈 수 있어요`)).catch(fail('놓지 못했어요.'))}>놓기</button>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="num">{canEdit
                        ? <NumCell id={`q-${it.id}`} label={`${it.name} 수량`} value={it.qty} onSave={(v) => save(it.id, { qty: v })} />
                        : it.qty}</td>
                      <td className="c-done">
                        <label className={`status ${it.done ? 'done' : 'todo'}`} htmlFor={canEdit ? `d-${it.id}` : undefined}>
                          {canEdit && (
                            <input type="checkbox" id={`d-${it.id}`} checked={!!it.done}
                              onChange={(e) => save(it.id, { done: e.target.checked })} />
                          )}
                          {it.done ? '완료' : '준비 중'}
                        </label>
                      </td>
                      <td>{canEdit
                        ? <TextCell id={`m-${it.id}`} label={`${it.name} 메모`} value={it.memo} max={200} onSave={(v) => save(it.id, { memo: v })} />
                        : <span className="muted">{it.memo}</span>}</td>
                      {isOwner && (
                        <td className="c-del"><button type="button" className="link" onClick={() => deleteItem(gid, it.id).catch(fail('삭제하지 못했어요.'))}>삭제</button></td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isOwner && (
            <button type="button" className="btn ghost add" onClick={() => addItem(gid, nextOrder, 'shared').catch(fail('추가하지 못했어요.'))}>
              + 공용 준비물 추가
            </button>
          )}
        </section>

        <section className="sect">
          <h2>개인 준비물 <span className="muted">모두가 각자 챙겨요</span></h2>
          <p className="muted">내 칸(노란 열)만 체크할 수 있어요. 다른 사람 칸은 보기만 해요.</p>
          <div className="tablebox">
            <table className="matrix">
              <thead>
                <tr>
                  <th className="c-pname">준비물</th>
                  {columns.map((m) => (
                    <th key={m.uid} className={m.uid === user.uid ? 'me' : ''}>{m.name}{m.uid === user.uid && ' (나)'}</th>
                  ))}
                  {isOwner && <th className="c-del"><span className="sr">삭제</span></th>}
                </tr>
              </thead>
              <tbody>
                {personal.length === 0 && (
                  <tr><td colSpan={columns.length + (isOwner ? 2 : 1)} className="muted">
                    {isOwner ? '아직 개인 준비물이 없어요. 아래 버튼으로 추가해 주세요.' : '아직 개인 준비물이 없어요.'}
                  </td></tr>
                )}
                {personal.map((it) => (
                  <tr key={it.id}>
                    <td>{isOwner
                      ? <TextCell id={`pn-${it.id}`} label="개인 준비물 이름" value={it.name} max={80} onSave={(v) => v.trim() && save(it.id, { name: v.trim() })} />
                      : it.name}</td>
                    {columns.map((m) => {
                      const on = !!it.checks?.[m.uid];
                      const isMe = m.uid === user.uid;
                      return (
                        <td key={m.uid} className={isMe ? 'me' : ''}>
                          {isMe
                            ? <input type="checkbox" checked={on} aria-label={`${it.name} 챙김`}
                                onChange={(e) => setMyCheck(gid, it.id, user.uid, e.target.checked).catch(fail('저장하지 못했어요.'))} />
                            : on ? <span className="done" aria-label="챙김">✓</span> : <span className="muted" aria-label="아직">·</span>}
                        </td>
                      );
                    })}
                    {isOwner && (
                      <td className="c-del"><button type="button" className="link" onClick={() => deleteItem(gid, it.id).catch(fail('삭제하지 못했어요.'))}>삭제</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
              {personal.length > 0 && (
                <tfoot>
                  <tr>
                    <td>챙긴 개수</td>
                    {columns.map((m) => <td key={m.uid} className={m.uid === user.uid ? 'me' : ''}>{checkedBy(m.uid)} / {personal.length}</td>)}
                    {isOwner && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {isOwner && (
            <button type="button" className="btn ghost add" onClick={() => addItem(gid, nextOrder, 'personal').catch(fail('추가하지 못했어요.'))}>
              + 개인 준비물 추가
            </button>
          )}
        </section>

        {!isOwner && <button type="button" className="link quiet" onClick={leave}>이 모임 나가기</button>}
        <p className="toast" role="status">{msg}</p>
      </div>
    </>
  );
}

/** 입력이 끝나면(포커스가 빠지거나 Enter) 저장하는 글자 칸 */
function TextCell({ id, label, value, max, onSave }) {
  const [v, setV] = useState(value ?? '');
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setV(value ?? ''); }
  return (
    <input type="text" id={id} aria-label={label} maxLength={max} value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== (value ?? '')) onSave(v); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
  );
}

function NumCell({ id, label, value, onSave }) {
  const [v, setV] = useState(String(value ?? 0));
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setV(String(value ?? 0)); }
  const commit = () => {
    const n = Math.min(9999, Math.max(0, parseInt(v, 10) || 0));
    setV(String(n));
    if (n !== value) onSave(n);
  };
  return (
    <input type="number" id={id} aria-label={label} min="0" max="9999" inputMode="numeric" value={v}
      onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
  );
}
