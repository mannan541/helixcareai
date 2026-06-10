import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { unreadCount } from '../api/notifications';
import { ConfirmDialog } from './ui';

type NavItem = { to: string; label: string; icon: string };

function navItemsFor(role: string): NavItem[] {
  const items: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/children', label: 'Children', icon: '🧒' },
  ];
  if (role === 'admin') {
    items.push({ to: '/users', label: 'Users', icon: '👥' });
    items.push({ to: '/admin/appointments', label: 'Appointments', icon: '📅' });
    items.push({ to: '/admin/slots', label: 'Manage Slots', icon: '🕒' });
  } else if (role === 'therapist') {
    items.push({ to: '/schedule', label: 'My Schedule', icon: '📅' });
  } else {
    items.push({ to: '/parent/schedule', label: 'My Schedule', icon: '📅' });
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
    unreadCount().then(setUnread).catch(() => {});
    const t = setInterval(() => unreadCount().then(setUnread).catch(() => {}), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;
  const items = navItemsFor(user.role);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-primary-light text-primary-dark' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <span className="text-2xl">🩺</span>
          <span className="text-lg font-bold text-primary-dark">HelixCareAI</span>
        </div>
        {nav}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
              <span className="text-2xl">🩺</span>
              <span className="text-lg font-bold text-primary-dark">HelixCareAI</span>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
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
            <button
              className="relative rounded-lg p-2 text-lg hover:bg-slate-100"
              onClick={() => navigate('/notifications')}
              title="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            <button
              className="rounded-lg p-2 text-lg hover:bg-slate-100"
              onClick={() => navigate('/profile')}
              title="Profile"
            >
              👤
            </button>
            <button
              className="rounded-lg p-2 text-lg hover:bg-slate-100"
              onClick={() => setConfirmLogout(true)}
              title="Log out"
            >
              🚪
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
