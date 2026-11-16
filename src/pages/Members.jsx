import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth';
import { useGroup } from '../useGroup';
import { createInvite, deleteGroup, removeMember, setMemberRole } from '../api';

export default function Members() {
  const { gid } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { group, members, error, role } = useGroup(gid, user.uid, { items: false });
  const [invite, setInvite] = useState(null);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (error) return <><TopBar title="멤버 관리" back={`/g/${gid}`} /><div className="screen"><p className="error">{error}</p></div></>;
  if (!group || !role) return <><TopBar title="멤버 관리" back={`/g/${gid}`} /><div className="screen"><p className="muted">불러오는 중…</p></div></>;
  if (role !== 'owner') return <><TopBar title="멤버 관리" back={`/g/${gid}`} /><div className="screen"><p className="note">멤버 관리는 모임장만 할 수 있어요.</p></div></>;

  const link = invite ? `${window.location.origin}/join/${invite.code}` : '';
  const sorted = [...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.name.localeCompare(b.name, 'ko')));

  async function makeInvite() {
    try { setInvite(await createInvite(user, gid)); setMsg(''); }
    catch (e) { setMsg(`초대 링크를 만들지 못했어요. ${e.message}`); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setMsg('링크를 복사했어요. 단톡방에 붙여 넣으세요.'); }
    catch { setMsg('자동 복사가 안 돼요. 링크를 길게 눌러 복사해 주세요.'); }
  }
  async function destroy() {
    try { await deleteGroup(gid, user.uid); nav('/', { replace: true }); }
    catch (e) { setMsg(`모임을 삭제하지 못했어요. ${e.message}`); }
  }

  return (
    <>
      <TopBar title="멤버 관리" back={`/g/${gid}`} />
      <div className="screen">
        <div className="field">
          <span className="label">초대 링크</span>
          {invite ? (
            <div className="invite"><code>{link}</code><button type="button" className="btn ghost" onClick={copy}>복사</button></div>
          ) : (
            <button type="button" className="btn ghost" onClick={makeInvite}>초대 링크 만들기</button>
          )}
          <span className="muted">링크로 들어온 사람은 읽기 멤버로 합류해요. 링크는 7일 동안 쓸 수 있어요.</span>
        </div>

        <div>
          {sorted.map((m) => (
            <div className="member" key={m.uid}>
              <span><b>{m.name}</b>{m.uid === user.uid && <span className="muted"> (나)</span>}</span>
              {m.role === 'owner' ? <span className="role">모임장</span> : (
                <span className="row">
                  <select id={`r-${m.uid}`} aria-label={`${m.name} 권한`} value={m.role}
                    onChange={(e) => setMemberRole(gid, m.uid, e.target.value).catch((er) => setMsg(er.message))}>
                    <option value="writer">쓰기</option>
                    <option value="reader">읽기</option>
                  </select>
                  <button type="button" className="link" onClick={() => removeMember(gid, m.uid).catch((er) => setMsg(er.message))}>내보내기</button>
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="danger">
          {!confirmDelete
            ? <button type="button" className="link warn" onClick={() => setConfirmDelete(true)}>모임 삭제</button>
            : (
              <div className="row wrapline">
                <span>준비물과 멤버 정보가 모두 지워지고 되돌릴 수 없어요.</span>
                <button type="button" className="btn warn" onClick={destroy}>삭제하기</button>
                <button type="button" className="link" onClick={() => setConfirmDelete(false)}>취소</button>
              </div>
            )}
        </div>
        <p className="toast" role="status">{msg}</p>
      </div>
    </>
  );
}
