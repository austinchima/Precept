import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LogOut, Menu, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, Sun } from 'lucide-react';
import { useAuth } from '../AuthContext';
import CommandPalette from './ui/CommandPalette';
import { Button, Dialog, Kbd, Logo, LogoMark } from './ui/kit';
import { NAV_ITEMS } from './navigation';
import { useTheme, type ThemePreference } from '../lib/theme';
import { cn } from '../lib/utils';

const GROUPS = ['Overview', 'Prepare', 'Search'] as const;

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-0.5">
          {!collapsed && <p className="px-2.5 pb-1 text-[12px] font-medium text-fg-3">{group}</p>}
          {NAV_ITEMS.filter((n) => n.group === group).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={onNavigate}
              title={collapsed ? item.name : undefined}
              data-testid={item.testId}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-8 items-center gap-2.5 rounded-lg text-[13.5px] transition-colors',
                  collapsed ? 'justify-center px-0' : 'px-2.5',
                  isActive ? 'bg-surface-2 font-medium text-fg' : 'text-fg-2 hover:bg-surface-2/60 hover:text-fg'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" aria-hidden="true" />}
                  <item.icon size={16} className={isActive ? 'text-fg' : 'text-fg-3 group-hover:text-fg-2'} aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

function ThemeSwitch({ compact }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  if (compact) {
    const next = preference === 'dark' ? 'light' : preference === 'light' ? 'system' : 'dark';
    const Current = THEME_OPTIONS.find((o) => o.value === preference)!.icon;
    return (
      <Button variant="ghost" size="sm" icon={<Current size={16} />} onClick={() => setPreference(next)} aria-label={`Theme: ${preference}. Switch to ${next}`} title={`Theme: ${preference}`} />
    );
  }
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          onClick={() => setPreference(value)}
          className={cn(
            'grid h-7 w-8 place-items-center rounded-md transition-colors',
            preference === value ? 'bg-surface-1 text-fg shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-fg-3 hover:text-fg-2'
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('precept-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('precept-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.getElementById('main')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const current = NAV_ITEMS.find((n) => n.path === location.pathname)?.name ?? (location.pathname.startsWith('/settings') ? 'Settings' : '');
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const handleLogout = () => {
    setLogoutOpen(false);
    logout();
    navigate('/');
  };

  const userBlock = (isCollapsed: boolean) => (
    <div className={cn('flex items-center gap-2', isCollapsed ? 'flex-col' : '')}>
      <NavLink
        to="/settings"
        onClick={() => setMobileOpen(false)}
        data-testid="sidebar-user-profile"
        title="Settings"
        className={({ isActive }) =>
          cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-2',
            isActive && 'bg-surface-2',
            isCollapsed && 'flex-none justify-center'
          )
        }
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-3 text-[11.5px] font-semibold text-fg-2">{initials}</span>
        {!isCollapsed && (
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-fg">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="block truncate text-[12px] text-fg-3">{user?.isDemo ? 'Demo account' : user?.email}</span>
          </span>
        )}
      </NavLink>
      <Button variant="ghost" size="sm" icon={<LogOut size={16} />} onClick={() => setLogoutOpen(true)} aria-label="Sign out" title="Sign out" data-testid="sidebar-logout-btn" />
    </div>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg text-fg" data-testid="app-layout">
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        data-testid="sidebar"
        className={cn(
          'hidden shrink-0 flex-col border-r border-line bg-bg transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex',
          collapsed ? 'w-[60px]' : 'w-[232px]'
        )}
      >
        <div className={cn('flex h-14 items-center', collapsed ? 'justify-center' : 'justify-between px-4')}>
          {collapsed ? <LogoMark size={22} /> : <Logo />}
          {!collapsed && (
            <Button variant="ghost" size="sm" icon={<PanelLeftClose size={16} />} onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" data-testid="sidebar-brand-toggle" />
          )}
        </div>
        <div className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className={cn('flex flex-col gap-2 border-t border-line py-3', collapsed ? 'items-center px-2' : 'px-3')}>
          {collapsed && (
            <Button variant="ghost" size="sm" icon={<PanelLeftOpen size={16} />} onClick={() => setCollapsed(false)} aria-label="Expand sidebar" />
          )}
          {userBlock(collapsed)}
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div className="absolute inset-0 bg-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              aria-label="Menu"
              className="absolute inset-y-0 left-0 flex w-[272px] flex-col border-r border-line bg-bg"
              initial={reduce ? { opacity: 0 } : { x: -280 }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <div className="flex h-14 items-center px-4">
                <Logo />
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="flex flex-col gap-3 border-t border-line p-3">
                <ThemeSwitch />
                {userBlock(false)}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header data-testid="topbar" className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="sm" className="md:hidden" icon={<Menu size={18} />} onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="mobile-menu-btn" />
            <span className="truncate text-[14px] font-medium text-fg">{current}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              data-testid="topbar-search"
              className="hidden h-8 w-64 items-center gap-2 rounded-lg border border-line bg-surface-1 px-2.5 text-[13px] text-fg-3 transition-colors hover:border-line-strong hover:text-fg-2 sm:flex"
            >
              <Search size={14} aria-hidden="true" />
              <span className="flex-1 text-left">Search or jump to</span>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </button>
            <Button variant="ghost" size="sm" className="sm:hidden" icon={<Search size={16} />} onClick={() => setPaletteOpen(true)} aria-label="Search" />
            <div className="hidden md:block">
              <ThemeSwitch compact />
            </div>
            <Button variant="ghost" size="sm" icon={<Settings size={16} />} to="/settings" aria-label="Settings" title="Settings" />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="relative flex-1 overflow-y-auto outline-none" data-lenis-prevent>
          {user?.isDemo && (
            <div className="border-b border-line bg-accent-soft px-4 py-2 text-[13px] text-fg-2 md:px-8" data-testid="demo-banner">
              <span className="font-medium text-fg">Demo account.</span> Sample data, deleted
              {user.demoExpiresAt ? ` on ${new Date(user.demoExpiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : ' after 24 hours'}. AI features return fixed samples.
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <Dialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Sign out of Precept?"
        size="sm"
        testId="logout-modal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLogoutOpen(false)} data-testid="logout-cancel">Cancel</Button>
            <Button variant="primary" onClick={handleLogout} data-testid="logout-confirm">Sign out</Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-fg-2">Your stories and applications stay saved.</p>
      </Dialog>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
