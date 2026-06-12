import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newTheme = !prev;
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Pipeline', path: '/applications', icon: 'view_kanban' },
    { name: 'JD Matcher', path: '/jd-matcher', icon: 'analytics' },
    { name: 'Story Bank', path: '/story-bank', icon: 'auto_stories' },
    { name: 'Quiz Mode', path: '/story-bank/quiz', icon: 'psychology' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-brand-secondary text-brand-text font-sans selection:bg-brand-primary/30">
      {/* Sidebar Overlay for Mobile */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsCollapsed(true)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`absolute md:relative bg-brand-surface/95 md:bg-brand-surface/40 border-r border-brand-border flex flex-col backdrop-blur-xl md:backdrop-blur-md z-50 transition-all duration-300 ease-in-out h-full ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-[72px]' : 'translate-x-0 w-64'}`}>
        
        <div className={`h-16 flex items-center border-b border-brand-border/50 transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-6'}`}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-8 h-8 rounded bg-brand-surface overflow-hidden flex items-center justify-center border border-brand-border/50 shrink-0 transition-all cursor-pointer hover:border-brand-primary/50 ${isCollapsed ? 'md:mr-0' : 'mr-3'}`}
            title="Toggle Sidebar"
          >
            <img src="/logo.png" alt="Precept Logo" className="w-full h-full object-cover" />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
            <span className="font-heading font-bold text-lg tracking-tight whitespace-nowrap block">Precept</span>
            <span className="block font-mono text-[10px] text-brand-text-muted uppercase tracking-wider whitespace-nowrap">JobHunt OS</span>
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto py-6 space-y-1 transition-all ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 rounded-md font-mono text-sm transition-all overflow-hidden ${
                  isActive
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                    : 'text-brand-text-muted hover:bg-brand-surface hover:text-brand-text border border-transparent'
                } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`
              }
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
              <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className={`p-4 border-t border-brand-border/50 space-y-1 transition-all ${isCollapsed ? 'flex flex-col items-center px-2' : ''}`}>
          <NavLink
            to="/settings"
            title={isCollapsed ? "Configuration" : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2 rounded-md font-mono text-xs transition-all overflow-hidden ${
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'text-brand-text-muted hover:bg-brand-surface hover:text-brand-text'
              } ${isCollapsed ? 'justify-center w-full px-0' : 'px-3'}`
            }
          >
            <span className="material-symbols-outlined text-[16px] shrink-0">settings</span>
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
              Configuration
            </span>
          </NavLink>
          
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Disconnect" : undefined}
            className={`w-full flex items-center gap-3 py-2 rounded-md text-brand-text-muted hover:bg-brand-surface hover:text-brand-text font-mono text-xs transition-all cursor-pointer text-left overflow-hidden ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
          >
            <span className="material-symbols-outlined text-[16px] shrink-0">logout</span>
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
              Disconnect
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 border-b border-brand-border bg-brand-secondary/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-10 w-full">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="md:hidden text-brand-text-muted hover:text-brand-primary transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="relative w-full max-w-xs hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted text-[18px]">search</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query data..." 
                className="w-full bg-brand-surface border border-brand-border rounded-md py-1.5 pl-10 pr-4 text-sm font-mono text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div 
              onClick={() => navigate('/settings')}
              className="h-8 w-8 rounded bg-brand-surface border border-brand-border overflow-hidden ml-2 cursor-pointer hover:border-brand-primary transition-colors"
            >
              <img 
                src="https://i.pravatar.cc/100?img=33" 
                alt="User" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
