import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth';
import { ROLE_LABEL, watchMyGroups } from '../api';

export default function GroupList() {
  const { user } = useAuth();
  const [groups, setGroups] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => watchMyGroups(user.uid, setGroups, (e) => setErr(e.message)), [user.uid]);

  return (
    <>
      <TopBar title="내 모임" />
      <div className="screen">
        {err && <p className="error" role="alert">모임 목록을 불러오지 못했어요. {err}</p>}
        {groups === null && !err && <p className="muted">불러오는 중…</p>}
        {groups && groups.length === 0 && (
          <p className="note">아직 속한 모임이 없어요. 새 모임을 만들거나, 모임장에게 받은 초대 링크를 열어 주세요.</p>
        )}
        <div className="list">
          {groups && groups.map((g) => (
            <Link key={g.id} className="group" to={`/g/${g.id}`}>
              <span>
                <b>{g.name}</b><br />
                <span className="muted">{[g.date, g.place].filter(Boolean).join(' · ') || '날짜 미정'}</span>
              </span>
              <span className={`role ${g.role === 'reader' ? 'reader' : ''}`}>{ROLE_LABEL[g.role]}</span>
            </Link>
          ))}
        </div>
        <Link className="btn ghost" to="/new">+ 새 모임 만들기</Link>
      </div>
    </>
  );
}
