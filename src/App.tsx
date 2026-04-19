import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Gallery from './pages/Gallery';
import NewPost from './pages/NewPost';
import EditPost from './pages/EditPost';
import PostDetail from './pages/PostDetail';
import MapView from './pages/MapView';
import Stats from './pages/Stats';

function Nav() {
  const { logout, session } = useAuth();
  const nickname = (session?.user.user_metadata as { nickname?: string } | undefined)?.nickname;
  return (
    <>
      {/* desktop top nav */}
      <nav className="nav">
        <div className="title">🌊 浜あつめ</div>
        <div className="nav-links" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <NavLink to="/" end>図鑑</NavLink>
          <NavLink to="/map">地図</NavLink>
          <NavLink to="/stats">統計</NavLink>
          <NavLink to="/new">＋投稿</NavLink>
        </div>
        <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>{nickname ?? ''}</span>
        <button className="nav-logout" onClick={() => void logout()}>ログアウト</button>
      </nav>

      {/* mobile bottom nav */}
      <nav className="bottom-nav">
        <NavLink to="/" end><span className="icon">🗂️</span>図鑑</NavLink>
        <NavLink to="/map"><span className="icon">🗺️</span>地図</NavLink>
        <NavLink to="/new"><span className="icon">📷</span>投稿</NavLink>
        <NavLink to="/stats"><span className="icon">📊</span>統計</NavLink>
        <button onClick={() => void logout()}><span className="icon">🚪</span>退出</button>
      </nav>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="center">読込中…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <>
      <Nav />
      <div className="container">{children}</div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Gallery /></Protected>} />
      <Route path="/new" element={<Protected><NewPost /></Protected>} />
      <Route path="/post/:id" element={<Protected><PostDetail /></Protected>} />
      <Route path="/post/:id/edit" element={<Protected><EditPost /></Protected>} />
      <Route path="/map" element={<Protected><MapView /></Protected>} />
      <Route path="/stats" element={<Protected><Stats /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
