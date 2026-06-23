import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import CommandPalette from './ui/CommandPalette';

export default function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('precept-sidebar-collapsed') === 'true';
  });

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
    { name: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-border-all' },
    { name: 'Applications', path: '/applications', icon: 'fa-regular fa-file-lines' },
    { name: 'STAR Bank', path: '/story-bank', icon: 'fa-regular fa-star' },
    { name: 'JD Matcher', path: '/jd-matcher', icon: 'fa-solid fa-wand-magic-sparkles' },
    { name: 'Quiz Mode', path: '/story-bank/quiz', icon: 'fa-solid fa-brain' },
  ];

  return (
    <>
      <div className="bg-dashboard-bg text-text-primary font-sans h-screen flex overflow-hidden antialiased relative">
      
      {/* Background is now handled by body in index.css, so we can remove the old Background Decorative Elements */}

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* BEGIN: Sidebar */}
      <aside aria-label="Sidebar Navigation" className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} glass-panel flex flex-col h-full md:h-[calc(100vh-2rem)] border-r border-panel-border/50 fixed md:relative z-50 rounded-r-3xl md:my-4 md:ml-4 shadow-2xl opacity-100 transition-all duration-300 ease-in-out shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:animate-fade-in-up`}>
        {/* Brand */}
        <div 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title="Toggle Sidebar"
          className={`h-20 flex items-center mt-2 mx-2 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}`}
        >
          <div className={`w-8 h-8 rounded-lg bg-accent-teal flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.5)] animate-pulse-glow-teal shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}>
            <i className="fa-solid fa-code text-dashboard-bg text-sm"></i>
          </div>
          {!isSidebarCollapsed && <span className="text-xl font-semibold tracking-wide text-white transition-opacity duration-300 whitespace-nowrap">Precept</span>}
        </div>
        

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              title={isSidebarCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center py-2.5 rounded-xl font-medium group transition-all duration-300 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 hover:translate-x-1'} ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/5 shadow-sm'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`
              }
            >
              <i className={`${item.icon} w-5 text-center transition-transform duration-300 group-hover:scale-110 ${isSidebarCollapsed ? '' : 'mr-3'}`}></i>
              {!isSidebarCollapsed && <span className="transition-opacity duration-300 whitespace-nowrap">{item.name}</span>}
              {!isSidebarCollapsed && item.name === 'STAR Bank' && (
                <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent-teal shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse"></span>
              )}
            </NavLink>
          ))}

          <NavLink
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            title={isSidebarCollapsed ? "Profile" : undefined}
            className={({ isActive }) =>
              `flex items-center py-2.5 rounded-xl font-medium group transition-all duration-300 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 hover:translate-x-1'} ${
                isActive
                  ? 'bg-white/10 text-white border border-white/5 shadow-sm'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`
            }
          >
            <i className={`fa-regular fa-user w-5 text-center transition-transform duration-300 group-hover:scale-110 ${isSidebarCollapsed ? '' : 'mr-3'}`}></i>
            {!isSidebarCollapsed && <span className="transition-opacity duration-300 whitespace-nowrap">Profile</span>}
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col">
          {/* User Profile Snippet */}
          <div className={`pt-4 pb-2 ${isSidebarCollapsed ? 'px-2' : 'px-6'}`}>
            <div className={`flex items-center cursor-pointer group hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10 hover:shadow-lg overflow-hidden ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-2 -ml-2'}`}>
              <div className={`w-10 h-10 rounded-full border border-panel-border bg-brand-primary/10 text-brand-primary font-bold text-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}>
                {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 transition-opacity duration-300">
                  <div className="text-sm font-medium text-white flex justify-between items-center whitespace-nowrap">
                    <span className="truncate">{user?.firstName} {user?.lastName?.charAt(0) || ''}.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 pb-6 border-t border-panel-border/50">
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className={`w-full flex items-center py-2.5 rounded-xl font-medium group transition-all duration-300 text-text-secondary hover:text-white hover:bg-white/5 cursor-pointer ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 hover:translate-x-1'}`}
              title={isSidebarCollapsed ? "Logout" : undefined}
            >
              <i className={`fa-solid fa-arrow-right-from-bracket w-5 text-center transition-transform duration-300 group-hover:scale-110 ${isSidebarCollapsed ? '' : 'mr-3'}`}></i>
              {!isSidebarCollapsed && <span className="whitespace-nowrap">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
      {/* END: Sidebar */}

      {/* BEGIN: Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* BEGIN: Topbar */}
        <header aria-label="Top Bar" className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 relative z-20 mt-4 mx-4 glass-panel rounded-2xl opacity-0 animate-fade-in-up delay-100 shrink-0">
          
          <div className="flex items-center gap-4">
            {/* Hamburger for Mobile */}
            <button 
              className="md:hidden text-text-secondary hover:text-white flex items-center justify-center p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <i className="fa-solid fa-bars text-lg"></i>
            </button>

            {/* Search Trigger */}
            <div className="relative w-full max-w-[200px] md:w-96 group hidden sm:block">
              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between pl-4 pr-3 py-2.5 border border-panel-border/50 rounded-xl leading-5 bg-black/20 text-text-secondary hover:text-white hover:bg-black/40 hover:border-accent-teal/50 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-magnifying-glass text-sm"></i>
                  <span className="text-sm">Search...</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono opacity-50">
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded">⌘</kbd>
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded">K</kbd>
                </div>
              </button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="flex items-center space-x-2 md:space-x-4">

              <button className="w-9 h-9 rounded-full bg-black/20 border border-panel-border/50 text-text-secondary hover:text-white hover:bg-white/10 hover:scale-105 hover:border-white/20 transition-all duration-300 flex items-center justify-center relative cursor-pointer">
                <i className="fa-regular fa-bell text-sm"></i>
                <span className="absolute top-2 right-2 block h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-panel-bg animate-pulse"></span>
              </button>
            </div>
            
            <div className="text-right transition-opacity duration-300 hover:opacity-80 hidden md:flex flex-col items-end justify-center min-w-[80px] px-2">
              <div className="text-base text-white font-bold tracking-wide">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              <div className="text-sm text-text-secondary font-medium tracking-wide">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            </div>
            

          </div>
        </header>
        {/* END: Topbar */}

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth custom-scrollbar">
          <Outlet />
        </div>

      </main>
      {/* END: Main Content Area */}
    </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="glass-panel flex flex-col p-6 rounded-2xl w-[90vw] sm:w-[400px] max-w-full shrink-0 border border-panel-border/50 shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-semibold text-white mb-2">Confirm Logout</h3>
            <p className="text-text-secondary mb-6 text-left overflow-wrap-break-word">Are you sure you want to end your session?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
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
