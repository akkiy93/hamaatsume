import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Gallery from './pages/Gallery';
import NewPost from './pages/NewPost';
import PostDetail from './pages/PostDetail';
import MapView from './pages/MapView';
import Stats from './pages/Stats';

function Nav() {
  const { logout, session } = useAuth();
  const nickname = (session?.user.user_metadata as { nickname?: string } | undefined)?.nickname;
  return (
    <nav className="nav">
      <div className="title">🌊 浜あつめ</div>
      <NavLink to="/" end>
        図鑑
      </NavLink>
      <NavLink to="/map">地図</NavLink>
      <NavLink to="/stats">統計</NavLink>
      <NavLink to="/new">＋投稿</NavLink>
      <span className="muted" style={{ marginLeft: 8 }}>
        {nickname ?? ''}
      </span>
      <button onClick={() => void logout()}>ログアウト</button>
    </nav>
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
      <Route
        path="/"
        element={
          <Protected>
            <Gallery />
          </Protected>
        }
      />
      <Route
        path="/new"
        element={
          <Protected>
            <NewPost />
          </Protected>
        }
      />
      <Route
        path="/post/:id"
        element={
          <Protected>
            <PostDetail />
          </Protected>
        }
      />
      <Route
        path="/map"
        element={
          <Protected>
            <MapView />
          </Protected>
        }
      />
      <Route
        path="/stats"
        element={
          <Protected>
            <Stats />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
