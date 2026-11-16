import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function TopBar({ title, back }) {
  const { user, signOut } = useAuth();
  return (
    <div className="bar">
      {back && <Link className="link" to={back}>← 뒤로</Link>}
      <h1>{title}</h1>
      {user && (
        <button type="button" className="link quiet" onClick={signOut} title={user.email || ''}>
          로그아웃
        </button>
      )}
    </div>
  );
}
