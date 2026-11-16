import { useState } from 'react';
import { useAuth } from '../auth';

export default function Login({ next }) {
  const { signIn } = useAuth();
  const [err, setErr] = useState('');
  const joining = next && next.startsWith('/join/');
  return (
    <div className="login">
      <h2>모임 준비물</h2>
      <p className="muted">누가 무엇을 챙기는지 한 표로 봐요.</p>
      {joining && <p className="note">초대 링크로 들어오셨어요. 로그인하면 모임에 합류해요.</p>}
      <button type="button" className="btn" onClick={() => signIn().catch((e) => setErr(loginError(e)))}>
        Google 계정으로 시작하기
      </button>
      <p className="muted">처음이면 자동으로 가입돼요.</p>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}

function loginError(e) {
  if (e.code === 'auth/popup-closed-by-user') return '로그인 창이 닫혔어요. 다시 눌러 주세요.';
  if (e.code === 'auth/popup-blocked') return '브라우저가 팝업을 막았어요. 팝업을 허용한 뒤 다시 눌러 주세요.';
  if (e.code === 'auth/unauthorized-domain') return '이 주소는 아직 로그인이 허용되지 않았어요. Firebase 승인된 도메인에 추가해야 해요.';
  return `로그인하지 못했어요 (${e.code || e.message}).`;
}
