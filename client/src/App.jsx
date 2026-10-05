import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { LoginPage } from './pages/LoginPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { TicketPage } from './pages/TicketPage';
import { TicketsPage } from './pages/TicketsPage';

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted center">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, isAgent, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">Helpdesk</Link>
        {user && (
          <nav>
            <span className="muted">{user.name} · {isAgent ? 'Agent' : 'Customer'}</span>
            <button className="link" onClick={logout}>Log out</button>
          </nav>
        )}
      </header>
      <main className="container">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={<Protected><TicketsPage /></Protected>} />
          <Route path="/tickets/new" element={<Protected><NewTicketPage /></Protected>} />
          <Route path="/tickets/:id" element={<Protected><TicketPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
