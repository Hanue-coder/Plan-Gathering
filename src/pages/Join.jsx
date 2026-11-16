import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth';
import { joinWithInvite } from '../api';

export default function Join() {
  const { code } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    joinWithInvite(user, code)
      .then((gid) => nav(`/g/${gid}`, { replace: true }))
      .catch((e) => setErr(e.message));
  }, [user, code, nav]);

  return (
    <>
      <TopBar title="모임 합류" back="/" />
      <div className="screen">
        {err ? <><p className="error" role="alert">{err}</p><Link className="link" to="/">내 모임으로</Link></> : <p className="muted">모임에 합류하는 중…</p>}
      </div>
    </>
  );
}
