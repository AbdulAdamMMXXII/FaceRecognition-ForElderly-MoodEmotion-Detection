import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import React from 'react';
import {
  Home,
  TrendingUp,
  Bell,
  FileText,
  User,
  Heart,
  Camera,
  LogOut,
} from 'lucide-react';

// firebase
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const iconSizeClass = 'w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 lg:w-8 lg:h-8';

  const [windowWidth, setWindowWidth] = React.useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  React.useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/detection', icon: Camera, label: 'Mood Detection' },
    { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('logout failed', e);
    }
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isDesktop = windowWidth >= 768;

  // compute left position for toggle (px) based on sidebar widths
  const leftPx = isDesktop ? (collapsed ? 64 : 256) : mobileOpen ? 288 : 56;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={`bg-background border-r border-border flex flex-col transition-all duration-200 ease-linear ${
          collapsed ? 'w-16' : 'w-64 relative z-50'
        } hidden md:flex`}
      >
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            {collapsed ? (
              <Heart className={`${iconSizeClass} text-blue-600`} />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
            )}
            <div className={`${collapsed ? 'hidden' : 'block'}`}>
              <h1 className="font-semibold text-lg">ElderCare</h1>
              <p className="text-sm text-muted-foreground">Mood Monitor</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 overflow-auto">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-base ${
                      active ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className={`${iconSizeClass}`} />
                    <span className={`${collapsed ? 'hidden' : 'inline'}`}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base text-red-600 hover:text-red-500 hover:bg-accent transition-colors"
          >
            <LogOut className={`${iconSizeClass} text-red-600`} />
            <span className={`${collapsed ? 'hidden' : 'inline'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-3 bg-background border-b border-border md:hidden w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">ElderCare</h1>
            <p className="text-xs text-muted-foreground">Mood Monitor</p>
          </div>
        </Link>
        <div />
      </header>

      {/* Mobile icon rail (left) */}
      <div className="md:hidden">
        <div className="fixed top-16 left-0 z-40 flex w-14 flex-col items-center gap-3 p-3">
          <nav className="mt-2 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={item.label}
                  className={`w-10 h-10 flex items-center justify-center rounded ${
                    active ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className={`${iconSizeClass}`} />
                </Link>
              );
            })}
          </nav>

          {/* rail logout removed - using fixed bottom-left logout on mobile */}
        </div>

        {/* Sliding mobile panel */}
        <div className={`fixed inset-y-0 left-0 z-50 flex pointer-events-none md:pointer-events-auto`}>
          <div
            className={`w-72 bg-background border-r border-border p-4 transform transition-transform duration-300 ease-in-out pointer-events-auto ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-hidden={!mobileOpen}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-lg">ElderCare</h1>
                  <p className="text-sm text-muted-foreground">Mood Monitor</p>
                </div>
              </div>

              <nav className="mb-4 flex-1 overflow-auto">
                <ul className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-base ${
                            active ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          <Icon className={`${iconSizeClass}`} />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="mt-auto">
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base text-red-600 hover:bg-accent transition-colors"
                >
                  <LogOut className={iconSizeClass} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          <div className={`flex-1 ${mobileOpen ? 'block' : 'hidden'}`} onClick={() => setMobileOpen(false)} />
        </div>
        {/* Fixed logout button on mobile (lower-left) */}
        <button
          onClick={() => {
            handleLogout();
            setMobileOpen(false);
          }}
          className="fixed bottom-4 left-4 z-50 md:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-base text-red-600 bg-background border border-border shadow-sm"
        >
          <LogOut className={iconSizeClass} />
          {mobileOpen ? <span>Logout</span> : null}
        </button>
      </div>

      {/* Desktop header bar spanning full width */}
      <header className="hidden md:flex items-center justify-between p-3 z-40 fixed top-0 left-0 right-0 bg-background border-b border-border h-16">
        <div style={{ marginLeft: 16 }} className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div className="ml-2">
              <h1 className="font-semibold text-sm md:text-base">ElderCare</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Mood Monitor</p>
            </div>
          </Link>
        </div>
        <div className="pr-4" />
      </header>

      {/* Hover area + single toggle button (visible on hover) */}
      <div style={{ top: 0, left: leftPx - 28, position: 'fixed', height: '100%', width: 56, zIndex: 60 }} className="pointer-events-none md:pointer-events-auto">
        <div className="relative h-full w-full group pointer-events-auto">
          <button
            aria-label={isDesktop ? (collapsed ? 'Open sidebar' : 'Close sidebar') : mobileOpen ? 'Close menu' : 'Open menu'}
            title={isDesktop ? (collapsed ? 'Open sidebar' : 'Close sidebar') : mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => {
              if (isDesktop) setCollapsed((s) => !s);
              else setMobileOpen((s) => !s);
            }}
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'absolute' }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background text-muted-foreground border border-border rounded-full p-1.5 shadow-sm hover:text-foreground pointer-events-none group-hover:pointer-events-auto"
          >
            <svg
              className={`w-5 h-5 transform transition-transform duration-200 ${isDesktop && collapsed ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-20 pl-14 md:pl-0">
        <Outlet />
      </main>
    </div>
  );
}
