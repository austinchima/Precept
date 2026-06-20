import React, { useState, useEffect } from 'react';
import { X, Plus, Terminal, Loader2, ShieldAlert, User as UserIcon } from 'lucide-react';
import { Skill, SkillProficiency } from '../types';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ui/Toast';

const PROFICIENCY_COLORS: Record<SkillProficiency, string> = {
  Beginner: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Advanced: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Expert: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
};

export default function Settings() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  
  // Form state
  const [profileFirstName, setProfileFirstName] = useState(user?.firstName || '');
  const [profileLastName, setProfileLastName] = useState(user?.lastName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Diagnostic State
  const [isSystemOnline, setIsSystemOnline] = useState<boolean | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Data Export State
  const [isExporting, setIsExporting] = useState(false);

  // Skill Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [proficiency, setProficiency] = useState<SkillProficiency>('Intermediate');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileFirstName(user.firstName);
      setProfileLastName(user.lastName);
    }
  }, [user]);

  useEffect(() => {
    async function checkSystemHealth() {
      setIsCheckingStatus(true);
      try {
        await api.get('/api/system/ping', { skipAuth: true });
        setIsSystemOnline(true);
      } catch (err) {
        setIsSystemOnline(false);
      } finally {
        setIsCheckingStatus(false);
      }
    }
    
    checkSystemHealth();
    // Poll every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadSkills() {
      try {
        const data = await api.get<Skill[]>('/api/skill');
        setSkills(data);
      } catch (err) {
        console.error('Failed to load skills:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSkills();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const added = await api.post<Skill>('/api/skill', {
        name: name.trim(),
        category: category.trim() || undefined,
        proficiencyLevel: proficiency,
        notes: notes.trim() || undefined
      });
      setSkills(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Reset form
      setName('');
      setCategory('');
      setProficiency('Intermediate');
      setNotes('');
    } catch (err) {
      console.error('Failed to add skill:', err);
      toast.error((err as Error).message || 'Failed to add skill to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeSkill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill? This will affect your JD Matcher scores.')) {
      return;
    }

    try {
      await api.delete(`/api/skill/${id}`);
      setSkills(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete skill:', err);
      toast.error((err as Error).message || 'Failed to remove skill.');
    }
  };

  const handlePurge = async () => {
    if (!confirm('CRITICAL ACTION: Are you sure you want to wipe all local storage data? This logs you out.')) {
      return;
    }
    localStorage.clear();
    window.dispatchEvent(new Event('auth-expired'));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFirstName.trim() || !profileLastName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      await updateProfile(profileFirstName, profileLastName);
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.get('/api/dashboard/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `precept-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      toast.error('Export failed. Please check your connection and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fade-in max-w-7xl mx-auto w-full">
      <header className="border-b border-brand-border pb-6 mb-8">
        <h1 className="text-3xl font-heading font-bold text-brand-text tracking-tight">System Configuration</h1>
        <p className="text-brand-text-muted font-mono text-sm mt-1">Manage local state and matching heuristics.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Details Section */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-heading font-semibold text-brand-text mb-1 flex items-center gap-2">
                <UserIcon size={18} className="text-brand-primary" /> Operator Details
              </h2>
              <p className="text-sm text-brand-text-muted">
                Update your personal identification information.
              </p>
            </div>
        <div className="card-container p-6 bg-brand-surface">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-brand-text-muted uppercase">First Name</label>
                <input 
                  type="text" 
                  value={profileFirstName}
                  onChange={(e) => setProfileFirstName(e.target.value)}
                  className="input-base w-full font-mono text-sm" 
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono text-brand-text-muted uppercase">Last Name</label>
                <input 
                  type="text" 
                  value={profileLastName}
                  onChange={(e) => setProfileLastName(e.target.value)}
                  className="input-base w-full font-mono text-sm" 
                  required
                />
              </div>
            </div>
            
            <div className="pt-2 flex items-center gap-4">
              <button 
                type="submit" 
                disabled={isUpdatingProfile}
                className="btn-primary py-2 px-6 flex items-center justify-center gap-2"
              >
                {isUpdatingProfile ? <Loader2 size={16} className="animate-spin" /> : <Terminal size={16} />}
                {isUpdatingProfile ? 'Updating...' : 'Update Details'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-heading font-semibold text-brand-text mb-1 flex items-center gap-2">
            <Terminal size={18} className="text-brand-primary" /> Array of Capabilities (Skills)
          </h2>
          <p className="text-sm text-brand-text-muted">
            These keywords are injected into the JD Matcher algorithm to compute compatibility scores.
          </p>
        </div>

        {/* Add Skill Form */}
        <div className="card-container p-6 bg-brand-surface">
          <h3 className="text-sm font-mono text-brand-primary uppercase tracking-wider mb-4">Inject New Capability</h3>
          <form onSubmit={handleAddSkill} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-brand-text-muted uppercase">Skill Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base w-full font-mono text-sm" 
                  placeholder="e.g. React, Docker, EF Core" 
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono text-brand-text-muted uppercase">Category</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-base w-full font-mono text-sm" 
                  placeholder="e.g. Frontend, DevOps, Backend" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono text-brand-text-muted uppercase">Proficiency</label>
                <select 
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value as SkillProficiency)}
                  className="input-base w-full font-mono text-sm"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-mono text-brand-text-muted uppercase">Notes / Sub-technologies (Optional)</label>
              <input 
                type="text" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-base w-full text-sm" 
                placeholder="e.g. Hooks, Context API, Redux, Next.js" 
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting || !name.trim()} 
                className="btn-primary flex items-center gap-2 px-6 h-10 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                Add Skill
              </button>
            </div>
          </form>
        </div>

        {/* Skills List */}
        <div className="card-container p-6 bg-brand-surface-high/20">
          <h3 className="text-sm font-mono text-brand-text mb-4">Current Skills Inventory</h3>
          
          {isLoading ? (
            <div className="flex items-center gap-2 text-brand-text-muted font-mono text-sm">
              <Loader2 className="animate-spin" size={16} />
              <span>Scanning databases...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map(skill => (
                <div 
                  key={skill.id} 
                  className="flex flex-col p-4 bg-brand-surface border border-brand-border rounded-lg group hover:border-brand-primary/50 transition-colors relative"
                >
                  <button 
                    onClick={() => removeSkill(skill.id)}
                    className="absolute top-3 right-3 text-brand-text-muted hover:text-[#f87171] transition-colors focus:outline-none cursor-pointer"
                  >
                    <X size={16} />
                  </button>

                  <h4 className="font-heading font-semibold text-brand-text text-base pr-6">{skill.name}</h4>
                  
                  <div className="flex gap-2 mt-2 items-center">
                    <span className={`px-2 py-0.5 border rounded text-2xs font-mono font-medium ${PROFICIENCY_COLORS[skill.proficiencyLevel]}`}>
                      {skill.proficiencyLevel}
                    </span>
                    {skill.category && (
                      <span className="px-2 py-0.5 bg-brand-surface-high text-brand-text-muted rounded text-2xs font-mono">
                        {skill.category}
                      </span>
                    )}
                  </div>

                  {skill.notes && (
                    <p className="text-xs text-brand-text-muted mt-3 font-sans line-clamp-2" title={skill.notes}>
                      {skill.notes}
                    </p>
                  )}
                </div>
              ))}

              {skills.length === 0 && (
                <div className="col-span-full py-8 text-center text-brand-text-muted font-mono text-sm italic border border-dashed border-brand-border rounded-lg">
                  Inventory empty. Ingest technical skills above to compute compatibility.
                </div>
              )}
            </div>
          )}
        </div>
          </section>
        </div>

        {/* Right Column (Side Panels) */}
        <div className="space-y-8">
          {/* Diagnostics Panel */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-brand-text mb-4">Diagnostics</h2>
            <div className="card-container p-6 bg-brand-surface font-mono text-sm space-y-4">
              <div className="flex justify-between items-center border-b border-brand-border/50 pb-3 group relative cursor-help">
                <span className="text-brand-text-muted">System Status</span>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3 bg-[#0d141d] border border-brand-border rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  {/* Speech bubble tail */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0d141d] border-b border-r border-brand-border rotate-45 rounded-sm"></div>
                  <p className="relative z-10 text-xs text-brand-text-muted font-sans font-normal leading-relaxed text-center">
                    Continuously pings the backend server to verify API connectivity and system health.
                  </p>
                </div>
                {isCheckingStatus ? (
                  <span className="text-brand-text-muted flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Checking...</span>
                ) : isSystemOnline ? (
                  <span className="text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online</span>
                ) : (
                  <span className="text-[#f87171] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f87171]"></span> Offline</span>
                )}
              </div>
              <div className="flex justify-between items-center group relative cursor-help pt-3">
                <span className="text-brand-text-muted">Database</span>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3 bg-[#0d141d] border border-brand-border rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  {/* Speech bubble tail */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0d141d] border-b border-r border-brand-border rotate-45 rounded-sm"></div>
                  <p className="relative z-10 text-xs text-brand-text-muted font-sans font-normal leading-relaxed text-center">
                    Indicates whether the backend service can successfully communicate with the PostgreSQL database.
                  </p>
                </div>
                <span className={isSystemOnline ? 'text-brand-text' : 'text-[#f87171]'}>{isSystemOnline ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-brand-text mb-4">Data Management</h2>
            <div className="card-container p-6 bg-brand-surface">
              <p className="text-sm text-brand-text-muted mb-4 font-mono leading-relaxed">Export your raw data payload (JSON) for local backup and portability.</p>
              <button 
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full btn-primary py-2 font-mono text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <span className="material-symbols-outlined text-[16px]">download</span>}
                {isExporting ? 'Exporting...' : 'Download Payload'}
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-lg font-heading font-semibold text-[#f87171] mb-4 flex items-center gap-2">
              <ShieldAlert size={18} /> Danger Zone
            </h2>
            <div className="card-container p-6 border border-[#f87171]/20 bg-[#f87171]/5">
              <p className="text-sm text-[#f87171]/80 mb-4 font-mono leading-relaxed">Force revoke all active credential caches from this local browser instance.</p>
              <button 
                onClick={handlePurge}
                className="w-full bg-transparent border border-[#f87171] text-[#f87171] font-mono font-medium rounded-md px-4 py-2 hover:bg-[#f87171]/10 transition-colors cursor-pointer"
              >
                Execute Purge
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
