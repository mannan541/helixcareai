import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { unreadCount as getUnreadCount } from '../api/notifications';
import { ConfirmDialog } from './ui';

function buildNav(role: string) {
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/children', label: 'Children', icon: '🧒' },
  ];
  if (role === 'admin') {
    items.push({ to: '/admin/users', label: 'Users', icon: '👥' });
    items.push({ to: '/assessments/admin', label: 'Assessments', icon: '📊' });
    items.push({ to: '/billing/admin', label: 'Billing', icon: '💳' });
    items.push({ to: '/analytics/therapist', label: 'Therapist Analytics', icon: '📈' });
    items.push({ to: '/resources', label: 'Resource Library', icon: '📚' });
    items.push({ to: '/admin/appointments', label: 'Appointments', icon: '📅' });
    items.push({ to: '/admin/slots', label: 'Manage Slots', icon: '🕒' });
  } else if (role === 'therapist') {
    items.push({ to: '/resources', label: 'Resource Library', icon: '📚' });
    items.push({ to: '/schedule/therapist', label: 'My Schedule', icon: '📅' });
  } else {
    items.push({ to: '/schedule/parent', label: 'My Schedule', icon: '📅' });
    items.push({ to: '/billing/parent', label: 'Billing', icon: '💳' });
    items.push({ to: '/appointments/book', label: 'Book Appointment', icon: '➕' });
  }
  items.push({ to: '/chat', label: 'AI Assistant', icon: '💬' });
  return items;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    getUnreadCount()
      .then(setUnread)
      .catch(() => {});
    const id = setInterval(() => getUnreadCount().then(setUnread).catch(() => {}), 60000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {buildNav(user.role).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-primary-light text-primary-dark' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-60 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white md:flex">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-4 text-left hover:bg-slate-50"
          aria-label="Go to dashboard"
        >
          <span className="text-2xl">🩺</span>
          <span className="text-lg font-bold text-primary-dark">HelixCareAI</span>
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col overflow-hidden bg-white shadow-xl">
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/dashboard');
              }}
              className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-4 text-left hover:bg-slate-50"
              aria-label="Go to dashboard"
            >
              <span className="text-2xl">🩺</span>
              <span className="text-lg font-bold text-primary-dark">HelixCareAI</span>
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{nav}</div>
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 text-xl hover:bg-slate-100 md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-xs capitalize text-slate-500">{user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="relative rounded-lg p-2 text-lg hover:bg-slate-100" onClick={() => navigate('/notifications')} title="Notifications">
              🔔
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            <button className="rounded-lg p-2 text-lg hover:bg-slate-100" onClick={() => navigate('/profile')} title="Profile">
              👤
            </button>
            <button className="rounded-lg p-2 text-lg hover:bg-slate-100" onClick={() => setConfirmLogout(true)} title="Log out">
              🚪
            </button>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
          navigate('/login');
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
