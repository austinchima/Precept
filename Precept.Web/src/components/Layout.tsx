import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { gsap, useGSAP, prefersReducedMotion } from '../lib/animations';
import CommandPalette from './ui/CommandPalette';

/* ─────── DESIGN TOKENS (from Landing.tsx) ─────── */
const C = {
  bg0: '#02050A',
  bg1: '#06090F',
  bg2: '#0B0F17',
  bg3: '#11161F',
  ink: '#E6EBF2',
  inkDim: '#9CA8B8',
  inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)',
  hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf',
  tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  emerald: '#10b981',
} as const;

export default function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('precept-sidebar-collapsed') === 'true';
  });

  useGSAP(() => {
    if (!layoutRef.current || prefersReducedMotion()) return;
    gsap.from(layoutRef.current, {
      opacity: 0,
      duration: 0.55,
      ease: 'power2.out',
    });
  }, { scope: layoutRef });

  useEffect(() => {
    localStorage.setItem('precept-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard',    path: '/dashboard',       icon: 'fa-solid fa-border-all' },
    { name: 'Applications', path: '/applications',    icon: 'fa-regular fa-file-lines' },
    { name: 'STAR Bank',    path: '/story-bank',      icon: 'fa-regular fa-star' },
    { name: 'JD Matcher',   path: '/jd-matcher',      icon: 'fa-solid fa-wand-magic-sparkles' },
    { name: 'Readiness',    path: '/readiness',       icon: 'fa-solid fa-bullseye' },
    { name: 'Quiz Mode',    path: '/story-bank/quiz', icon: 'fa-solid fa-brain' },
  ];

  return (
    <>
      <div
        ref={layoutRef}
        className="font-body h-screen flex overflow-hidden antialiased relative isolate"
        style={{ background: C.bg0, color: C.ink }}
        data-testid="app-layout"
      >
        {/* ambient: dotgrid + radial halo (matches Landing.tsx) */}
        <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-40 z-0" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-[50%] z-0"
          style={{
            background: `radial-gradient(closest-side, rgba(45,212,191,0.10), rgba(139,92,246,0.06) 45%, transparent 75%)`,
            filter: 'blur(4px)',
          }}
        />

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(2,5,10,0.7)', backdropFilter: 'blur(12px)' }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          aria-label="Sidebar Navigation"
          className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col h-full md:h-[calc(100vh-2rem)] fixed md:relative z-50 md:my-4 md:ml-4 shrink-0 transition-all duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
          style={{
            background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
            border: `1px solid ${C.hair}`,
            borderRadius: 24,
            boxShadow: '0 40px 80px -40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          data-testid="sidebar"
        >
          {/* Brand */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Toggle Sidebar"
            data-testid="sidebar-brand-toggle"
            className={`h-20 flex items-center mt-2 mx-2 rounded-2xl cursor-pointer transition-colors ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}`}
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-lg shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}
              style={{
                background: `linear-gradient(135deg, ${C.teal} 0%, ${C.violet} 100%)`,
                boxShadow: `0 0 18px ${C.tealDim}`,
              }}
            >
              <span className="font-display text-[15px] font-bold leading-none" style={{ color: C.bg0 }}>P</span>
            </span>
            {!isSidebarCollapsed && (
              <div className="flex flex-col items-start min-w-0">
                <span className="font-display text-[18px] font-bold tracking-tight whitespace-nowrap" style={{ color: C.ink }}>
                  Precept
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] mt-0.5" style={{ color: C.inkMute }}>
                  Career&nbsp;OS
                </span>
              </div>
            )}
          </button>

          {/* nav */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
            {!isSidebarCollapsed && (
              <div className="px-2 py-2 font-mono text-[9.5px] uppercase tracking-[0.22em]" style={{ color: C.inkMute }}>
                ~/precept
              </div>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isSidebarCollapsed ? item.name : undefined}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `relative flex items-center py-2.5 rounded-xl font-mono text-[12.5px] tracking-[0.04em] group transition-all duration-300 ${
                    isSidebarCollapsed ? 'justify-center px-0' : 'px-3'
                  } ${isActive ? 'precept-nav-active' : 'precept-nav-idle'}`
                }
                style={({ isActive }) => ({
                  background: isActive ? C.tealDim : 'transparent',
                  color: isActive ? C.teal : C.inkDim,
                  border: isActive ? `1px solid ${C.teal}44` : '1px solid transparent',
                }) as React.CSSProperties}
              >
                <i className={`${item.icon} w-5 text-center transition-transform duration-300 group-hover:scale-110 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                {!isSidebarCollapsed && (
                  <span className="truncate whitespace-nowrap">{item.name}</span>
                )}
              </NavLink>
            ))}

            <NavLink
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              title={isSidebarCollapsed ? 'Profile' : undefined}
              data-testid="nav-profile"
              className={({ isActive }) =>
                `relative flex items-center py-2.5 rounded-xl font-mono text-[12.5px] tracking-[0.04em] group transition-all duration-300 ${
                  isSidebarCollapsed ? 'justify-center px-0' : 'px-3'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? C.tealDim : 'transparent',
                color: isActive ? C.teal : C.inkDim,
                border: isActive ? `1px solid ${C.teal}44` : '1px solid transparent',
              }) as React.CSSProperties}
            >
              <i className={`fa-regular fa-user w-5 text-center transition-transform duration-300 group-hover:scale-110 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
              {!isSidebarCollapsed && <span className="whitespace-nowrap">Profile</span>}
            </NavLink>
          </nav>

          {/* footer block */}
          <div className="mt-auto flex flex-col" style={{ borderTop: `1px solid ${C.hair}` }}>
            <div className={`pt-3 pb-2 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
              <div
                className={`flex items-center rounded-xl transition-all duration-300 ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-2'}`}
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.hair}` }}
              >
                <div
                  className={`w-9 h-9 rounded-lg grid place-items-center font-display font-bold text-[13px] shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}
                  style={{ background: `${C.teal}1c`, color: C.teal, border: `1px solid ${C.teal}33` }}
                >
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-[13px] font-semibold truncate" style={{ color: C.ink }}>
                      {user?.firstName} {user?.lastName?.charAt(0) || ''}.
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest truncate" style={{ color: C.inkMute }}>
                      operator
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 pb-5">
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                data-testid="sidebar-logout-btn"
                className={`w-full flex items-center py-2.5 rounded-xl font-mono text-[12px] uppercase tracking-[0.14em] transition-all duration-300 cursor-pointer ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'}`}
                style={{ color: C.inkDim, background: 'transparent', border: `1px solid ${C.hair}` }}
                title={isSidebarCollapsed ? 'Logout' : undefined}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.rose; e.currentTarget.style.borderColor = `${C.rose}55`; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.inkDim; e.currentTarget.style.borderColor = C.hair; }}
              >
                <i className={`fa-solid fa-arrow-right-from-bracket w-5 text-center ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                {!isSidebarCollapsed && <span>Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          {/* TOPBAR */}
          <header
            aria-label="Top Bar"
            data-testid="topbar"
            className="h-16 md:h-20 flex items-center justify-between px-4 md:px-6 mt-4 mx-4 shrink-0"
            style={{
              background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
              border: `1px solid ${C.hair}`,
              borderRadius: 18,
              backdropFilter: 'blur(16px) saturate(140%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
            }}
          >
            <div className="flex items-center gap-3">
              {/* mobile burger */}
              <button
                className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors cursor-pointer"
                style={{ color: C.inkDim, background: C.hair }}
                onClick={() => setIsMobileMenuOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <i className="fa-solid fa-bars text-lg" />
              </button>

              {/* breadcrumb pill */}
              <div
                className="hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em]"
                style={{ background: `${C.teal}10`, border: `1px solid ${C.teal}33`, color: C.teal }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
                live · command center
              </div>

              {/* command search */}
              <div className="relative w-full max-w-[200px] md:w-96 group hidden sm:block">
                <button
                  onClick={() => setIsCommandPaletteOpen(true)}
                  data-testid="topbar-search"
                  className="w-full flex items-center justify-between pl-4 pr-3 py-2 rounded-xl transition-all duration-300 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair}`, color: C.inkDim }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${C.teal}55`; e.currentTarget.style.color = C.ink; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.hair; e.currentTarget.style.color = C.inkDim; }}
                >
                  <div className="flex items-center gap-3 font-mono text-[12px]">
                    <i className="fa-solid fa-magnifying-glass text-[11px]" />
                    <span>Search command palette…</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: C.inkMute }}>
                    <kbd className="px-1.5 py-0.5 rounded" style={{ background: C.hair }}>⌘</kbd>
                    <kbd className="px-1.5 py-0.5 rounded" style={{ background: C.hair }}>K</kbd>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-5">
              <button
                data-testid="topbar-notifications"
                className="w-9 h-9 rounded-full grid place-items-center transition-all duration-300 cursor-pointer relative"
                style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair}`, color: C.inkDim }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.ink; e.currentTarget.style.borderColor = C.hair2; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.inkDim; e.currentTarget.style.borderColor = C.hair; }}
              >
                <i className="fa-regular fa-bell text-sm" />
                <span className="absolute top-1.5 right-1.5 block h-1.5 w-1.5 rounded-full" style={{ background: C.rose, boxShadow: `0 0 6px ${C.rose}` }} />
              </button>

              <div className="text-right hidden md:flex flex-col items-end justify-center min-w-[88px] px-2">
                <div className="font-display text-[15px] font-semibold tracking-tight" style={{ color: C.ink }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-widest" style={{ color: C.inkMute }}>
                  {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div id="main-scroller" className="flex-1 overflow-y-auto relative z-10 scroll-smooth custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>

      {/* LOGOUT MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(2,5,10,0.7)', backdropFilter: 'blur(12px)' }}>
          <div
            className="flex flex-col p-7 w-[90vw] sm:w-[420px] max-w-full opacity-0 animate-fade-in-up"
            style={{
              background: `linear-gradient(180deg, ${C.bg2} 0%, ${C.bg1} 100%)`,
              border: `1px solid ${C.hair2}`,
              borderRadius: 20,
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            data-testid="logout-modal"
          >
            <div
              className="inline-flex self-start items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] mb-4"
              style={{ background: `${C.rose}14`, border: `1px solid ${C.rose}33`, color: C.rose }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.rose, boxShadow: `0 0 8px ${C.rose}` }} />
              end session
            </div>
            <h3 className="font-display text-2xl font-bold mb-2" style={{ color: C.ink }}>
              Sign out of <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>Precept?</span>
            </h3>
            <p className="font-body text-[14px] leading-relaxed mb-7" style={{ color: C.inkDim }}>
              You'll be returned to the landing page. Your data stays put.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                data-testid="logout-cancel"
                className="px-4 py-2.5 rounded-full font-mono text-[11.5px] uppercase tracking-[0.16em] transition-colors cursor-pointer"
                style={{ color: C.inkDim, background: 'transparent', border: `1px solid ${C.hair2}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                data-testid="logout-confirm"
                className="px-5 py-2.5 rounded-full font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] transition-all cursor-pointer"
                style={{
                  background: C.rose,
                  color: C.bg0,
                  boxShadow: `0 0 0 1px ${C.rose}, 0 12px 30px -10px rgba(244,63,94,0.4)`,
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}
