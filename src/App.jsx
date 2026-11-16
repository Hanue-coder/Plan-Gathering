import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import GroupList from './pages/GroupList';
import NewGroup from './pages/NewGroup';
import GroupTable from './pages/GroupTable';
import Members from './pages/Members';
import Join from './pages/Join';

function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <p className="center muted">불러오는 중…</p>;
  if (!user) return <Login next={loc.pathname} />;
  return children;
}

export default function App() {
  return (
    <div className="wrap">
      <div className="app">
        <Routes>
          <Route path="/" element={<RequireAuth><GroupList /></RequireAuth>} />
          <Route path="/new" element={<RequireAuth><NewGroup /></RequireAuth>} />
          <Route path="/g/:gid" element={<RequireAuth><GroupTable /></RequireAuth>} />
          <Route path="/g/:gid/members" element={<RequireAuth><Members /></RequireAuth>} />
          <Route path="/join/:code" element={<RequireAuth><Join /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
