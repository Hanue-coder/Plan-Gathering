import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth';
import { useGroup } from '../useGroup';
import { ROLE_LABEL, addItem, deleteItem, leaveGroup, updateItem } from '../api';

export default function GroupTable() {
  const { gid } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { group, members, items, error, role } = useGroup(gid, user.uid);
  const [msg, setMsg] = useState('');

  const save = (itemId, patch) => updateItem(gid, itemId, patch).catch((e) => setMsg(`저장하지 못했어요. ${e.message}`));

  if (error) return <><TopBar title="모임" back="/" /><div className="screen"><p className="error">{error}</p></div></>;
  if (group === undefined || !role) return <><TopBar title="모임" back="/" /><div className="screen"><p className="muted">불러오는 중…</p></div></>;
  if (group === null) return <><TopBar title="모임" back="/" /><div className="screen"><p className="error">모임이 삭제됐거나 없어요.</p></div></>;

  const isOwner = role === 'owner';
  const nameOf = (uid) => members.find((m) => m.uid === uid)?.name || '미정';
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const assignable = members.filter((m) => m.role !== 'reader');

  async function leave() {
    try { await leaveGroup(gid, user.uid); nav('/', { replace: true }); }
    catch (e) { setMsg(`나가지 못했어요. ${e.message}`); }
  }

  return (
    <>
      <TopBar title={group.name} back="/" />
      <div className="screen">
        <div className="summary">
          <span><b>{done}</b> / {items.length} 준비 완료</span>
          <span className="meter" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
          <span className={`role ${role === 'reader' ? 'reader' : ''}`}>{ROLE_LABEL[role]}</span>
          {isOwner && <Link className="link" to={`/g/${gid}/members`}>멤버 관리</Link>}
        </div>
        <p className="muted">
          {isOwner && '모임장은 모든 칸을 고치고 항목을 추가·삭제할 수 있어요. 담당자는 쓰기 멤버 중에서 고를 수 있어요.'}
          {role === 'writer' && '노란 줄이 내 담당이에요. 내 줄의 수량, 준비 완료, 메모만 고칠 수 있어요.'}
          {role === 'reader' && '읽기 멤버는 표를 보기만 할 수 있어요. 담당을 맡으려면 모임장에게 쓰기 권한을 요청하세요.'}
        </p>

        <div className="tablebox">
          <table>
            <thead>
              <tr><th>품목</th><th>담당자</th><th>수량</th><th>준비 완료</th><th>메모</th>{isOwner && <th><span className="sr">삭제</span></th>}</tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={isOwner ? 6 : 5} className="muted">
                  {isOwner ? '아직 준비물이 없어요. 아래 버튼으로 추가해 주세요.' : '아직 준비물이 없어요.'}
                </td></tr>
              )}
              {items.map((it) => {
                const mine = it.assigneeUid === user.uid;
                const canEdit = isOwner || (role === 'writer' && mine);
                return (
                  <tr key={it.id} className={mine ? 'mine' : ''}>
                    <td>{isOwner
                      ? <TextCell id={`n-${it.id}`} label="품목" value={it.name} max={80} onSave={(v) => v.trim() && save(it.id, { name: v.trim() })} />
                      : it.name}</td>
                    <td>{isOwner
                      ? (
                        <select id={`a-${it.id}`} aria-label={`${it.name} 담당자`} value={it.assigneeUid || ''}
                          onChange={(e) => save(it.id, { assigneeUid: e.target.value || null })}>
                          <option value="">미정</option>
                          {assignable.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                          {it.assigneeUid && !assignable.some((m) => m.uid === it.assigneeUid) && (
                            <option value={it.assigneeUid}>{nameOf(it.assigneeUid)} (권한 없음)</option>
                          )}
                        </select>
                      )
                      : nameOf(it.assigneeUid)}</td>
                    <td className="num">{canEdit
                      ? <NumCell id={`q-${it.id}`} label={`${it.name} 수량`} value={it.qty} onSave={(v) => save(it.id, { qty: v })} />
                      : it.qty}</td>
                    <td>
                      {canEdit && (
                        <input type="checkbox" id={`d-${it.id}`} checked={!!it.done} aria-label={`${it.name} 준비 완료`}
                          onChange={(e) => save(it.id, { done: e.target.checked })} />
                      )}{' '}
                      <span className={it.done ? 'done' : 'todo'}>{it.done ? '완료' : '준비 중'}</span>
                    </td>
                    <td>{canEdit
                      ? <TextCell id={`m-${it.id}`} label={`${it.name} 메모`} value={it.memo} max={200} onSave={(v) => save(it.id, { memo: v })} />
                      : <span className="muted">{it.memo}</span>}</td>
                    {isOwner && (
                      <td><button type="button" className="link" onClick={() => deleteItem(gid, it.id).catch((e) => setMsg(e.message))}>삭제</button></td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isOwner && (
          <button type="button" className="btn ghost"
            onClick={() => addItem(gid, (items.at(-1)?.order ?? 0) + 1).catch((e) => setMsg(e.message))}>
            + 준비물 추가
          </button>
        )}
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
