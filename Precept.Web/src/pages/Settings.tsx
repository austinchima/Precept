import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skill, SkillProficiency } from '../types';
import { getSkillIcon } from '../lib/utils';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const PROFICIENCY_COLORS: Record<SkillProficiency, string> = {
  Beginner: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Advanced: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Expert: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
};

const PROFICIENCY_ICONS: Record<SkillProficiency, string> = {
  Beginner: 'fa-solid fa-seedling',
  Intermediate: 'fa-solid fa-code',
  Advanced: 'fa-solid fa-fire',
  Expert: 'fa-solid fa-trophy'
};

export default function Settings() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    danger: false,
    onConfirm: () => {}
  });

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

  // Testimonial Form State
  const [testimonyHandle, setTestimonyHandle] = useState('');
  const [testimonyText, setTestimonyText] = useState('');
  const [isPublicConfirmed, setIsPublicConfirmed] = useState(false);
  const [isSubmittingTestimony, setIsSubmittingTestimony] = useState(false);

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

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonyHandle.trim() || !testimonyText.trim() || !isPublicConfirmed) return;

    setIsSubmittingTestimony(true);
    try {
      await api.post('/api/testimonial', {
        name: `${user?.firstName} ${user?.lastName}`,
        handle: testimonyHandle.trim(),
        text: testimonyText.trim()
      });
      toast.success('Success story published! Thank you for sharing your experience.');
      setTestimonyHandle('');
      setTestimonyText('');
      setIsPublicConfirmed(false);
    } catch (err) {
      console.error('Failed to submit testimonial:', err);
      toast.error('Failed to publish story. Please try again.');
    } finally {
      setIsSubmittingTestimony(false);
    }
  };

  const removeSkill = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Skill',
      message: 'Are you sure you want to delete this skill? This will affect your JD Matcher scores.',
      confirmText: 'Delete Skill',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/skill/${id}`);
          setSkills(prev => prev.filter(s => s.id !== id));
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error('Failed to delete skill:', err);
          toast.error((err as Error).message || 'Failed to remove skill.');
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handlePurge = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Wipe Local Data',
      message: 'CRITICAL ACTION: Are you sure you want to wipe all local storage data? This logs you out.',
      confirmText: 'Wipe Data',
      danger: true,
      onConfirm: () => {
        localStorage.clear();
        window.dispatchEvent(new Event('auth-expired'));
      }
    });
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
    <div className="p-8 pt-6 max-w-[1200px] mx-auto space-y-8">

      {/* Hero Header */}
      <div className="opacity-0 animate-fade-in-up">
        <h1 className="text-[28px] font-medium text-white flex items-center tracking-tight">
          System <span className="font-bold ml-2 hover:text-accent-teal transition-colors duration-300 cursor-default">Configuration</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1">Manage operator profile, capabilities, and system diagnostics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Personal Details Section */}
          <section className="space-y-4 opacity-0 animate-fade-in-up delay-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center">
                <i className="fa-regular fa-user text-accent-teal text-sm"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Operator Details</h2>
                <p className="text-xs text-text-secondary">Update your personal identification information.</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">First Name</label>
                    <input 
                      type="text" 
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      className="input-base w-full text-sm" 
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Last Name</label>
                    <input 
                      type="text" 
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      className="input-base w-full text-sm" 
                      required
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isUpdatingProfile}
                    className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2"
                  >
                    {isUpdatingProfile ? <div className="w-4 h-4 rounded-full border-2 border-dashboard-bg/30 border-t-dashboard-bg animate-spin"></div> : <i className="fa-solid fa-check text-xs"></i>}
                    {isUpdatingProfile ? 'Updating...' : 'Update Details'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Skills Section */}
          <section className="space-y-4 opacity-0 animate-fade-in-up delay-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <i className="fa-solid fa-terminal text-purple-400 text-sm"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Capabilities (Skills)</h2>
                <p className="text-xs text-text-secondary">These keywords are injected into the JD Matcher algorithm to compute compatibility scores.</p>
              </div>
            </div>

            {/* Add Skill Form */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-xs font-mono text-accent-teal uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fa-solid fa-plus text-[10px]"></i> Inject New Capability
              </h3>
              <form onSubmit={handleAddSkill} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Skill Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-base w-full text-sm" 
                      placeholder="e.g. React, Docker, EF Core" 
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Category</label>
                    <input 
                      type="text" 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-base w-full text-sm" 
                      placeholder="e.g. Frontend, DevOps" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Proficiency</label>
                    <select 
                      value={proficiency}
                      onChange={(e) => setProficiency(e.target.value as SkillProficiency)}
                      className="input-base w-full text-sm"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Notes / Sub-technologies (Optional)</label>
                  <input 
                    type="text" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-base w-full text-sm" 
                    placeholder="e.g. Hooks, Context API, Redux, Next.js" 
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !name.trim()} 
                    className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2"
                  >
                    {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-dashboard-bg/30 border-t-dashboard-bg animate-spin"></div> : <i className="fa-solid fa-plus text-xs"></i>}
                    Add Skill
                  </button>
                </div>
              </form>
            </div>

            {/* Skills List */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fa-solid fa-server text-[10px]"></i> Current Skills Inventory
              </h3>
              
              {isLoading ? (
                <div className="flex items-center gap-2 text-text-secondary font-mono text-sm py-6 justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-accent-teal/10 border-t-accent-teal animate-spin"></div>
                  <span>Scanning databases...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {skills.map(skill => (
                    <div 
                      key={skill.id} 
                      className="flex flex-col p-4 bg-dashboard-bg/50 border border-panel-border/30 rounded-xl group hover:border-white/15 hover:-translate-y-0.5 transition-all duration-300 relative"
                    >
                      <button 
                        onClick={() => removeSkill(skill.id)}
                        className="absolute top-3 right-3 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-[#f87171] transition-all cursor-pointer flex items-center justify-center"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                      <h4 className="font-semibold text-white text-sm pr-6 group-hover:text-accent-teal transition-colors duration-300 flex items-center gap-2">
                        <i className={`${getSkillIcon(skill.name).icon} text-sm`} style={{ color: getSkillIcon(skill.name).color }}></i>
                        {skill.name}
                      </h4>
                      <div className="flex gap-2 mt-2 items-center flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-[10px] font-mono font-medium ${PROFICIENCY_COLORS[skill.proficiencyLevel]}`}>
                          <i className={`${PROFICIENCY_ICONS[skill.proficiencyLevel]} text-[8px]`}></i>
                          {skill.proficiencyLevel}
                        </span>
                        {skill.category && (
                          <span className="px-2 py-0.5 bg-white/5 text-text-secondary rounded-full text-[10px] font-mono border border-white/5">
                            {skill.category}
                          </span>
                        )}
                      </div>

                      {skill.notes && (
                        <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed" title={skill.notes}>
                          {skill.notes}
                        </p>
                      )}
                    </div>
                  ))}

                  {skills.length === 0 && (
                    <div className="col-span-full py-10 text-center text-text-secondary font-mono text-sm border border-dashed border-panel-border/30 rounded-xl flex flex-col items-center gap-2">
                      <i className="fa-regular fa-folder-open text-2xl text-text-secondary/30"></i>
                      Inventory empty. Ingest technical skills above to compute compatibility.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Testimonial Submission Section */}
          <section className="space-y-4 opacity-0 animate-fade-in-up delay-250">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <i className="fa-solid fa-bullhorn text-orange-400 text-sm"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Share Your Success Story</h2>
                <p className="text-xs text-text-secondary">Landed a role? Share your experience on our public landing page.</p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <form onSubmit={handleSubmitTestimonial} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Your New Role / Handle</label>
                  <input 
                    type="text" 
                    value={testimonyHandle}
                    onChange={(e) => setTestimonyHandle(e.target.value)}
                    className="input-base w-full text-sm" 
                    placeholder="e.g. Software Engineer @ Google" 
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">The Story</label>
                  <textarea 
                    value={testimonyText}
                    onChange={(e) => setTestimonyText(e.target.value)}
                    className="input-base w-full text-sm min-h-[80px] py-3" 
                    placeholder="e.g. Precept helped me organize my interview prep and I landed my dream role in 3 weeks!" 
                    required
                  />
                </div>

                <div className="flex items-start gap-3 mt-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                  <input
                    type="checkbox"
                    id="confirmPublic"
                    checked={isPublicConfirmed}
                    onChange={(e) => setIsPublicConfirmed(e.target.checked)}
                    className="mt-1 cursor-pointer w-4 h-4 rounded border-panel-border/50 bg-black/50 text-accent-teal focus:ring-accent-teal/30 focus:ring-offset-dashboard-bg"
                  />
                  <label htmlFor="confirmPublic" className="text-xs text-text-secondary cursor-pointer leading-relaxed">
                    <strong className="text-orange-400 font-medium">Public Display Consent:</strong> I confirm that this review is accurate and I grant permission for it to be publicly displayed on the Precept landing page along with my first and last name.
                  </label>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmittingTestimony || !isPublicConfirmed || !testimonyHandle || !testimonyText}
                    className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:scale-105 hover:bg-orange-600 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 cursor-pointer gap-2"
                  >
                    {isSubmittingTestimony ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : <i className="fa-solid fa-paper-plane text-xs"></i>}
                    {isSubmittingTestimony ? 'Publishing...' : 'Publish to Landing Page'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Right Column (Side Panels) */}
        <div className="space-y-8 opacity-0 animate-fade-in-up delay-300">
          {/* Diagnostics Panel */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <i className="fa-solid fa-stethoscope text-cyan-400 text-sm"></i>
              </div>
              <h2 className="text-lg font-semibold text-white">Diagnostics</h2>
            </div>
            
            <div className="glass-panel rounded-2xl p-6 font-mono text-sm space-y-4">
              <div className="flex justify-between items-center border-b border-panel-border/20 pb-3 group relative cursor-help">
                <span className="text-text-secondary flex items-center gap-2">
                  <i className="fa-solid fa-server text-[10px]"></i> System Status
                </span>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3 bg-dashboard-bg border border-panel-border/50 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-dashboard-bg border-b border-r border-panel-border/50 rotate-45 rounded-sm"></div>
                  <p className="relative z-10 text-xs text-text-secondary font-sans font-normal leading-relaxed text-center">
                    Continuously pings the backend server to verify API connectivity and system health.
                  </p>
                </div>
                {isCheckingStatus ? (
                  <span className="text-text-secondary flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-accent-teal/10 border-t-accent-teal animate-spin"></div> Checking...
                  </span>
                ) : isSystemOnline ? (
                  <span className="text-emerald-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Online</span>
                ) : (
                  <span className="text-[#f87171] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f87171]"></span> Offline</span>
                )}
              </div>
              <div className="flex justify-between items-center group relative cursor-help pt-1">
                <span className="text-text-secondary flex items-center gap-2">
                  <i className="fa-solid fa-database text-[10px]"></i> Database
                </span>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3 bg-dashboard-bg border border-panel-border/50 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-dashboard-bg border-b border-r border-panel-border/50 rotate-45 rounded-sm"></div>
                  <p className="relative z-10 text-xs text-text-secondary font-sans font-normal leading-relaxed text-center">
                    Indicates whether the backend service can successfully communicate with the PostgreSQL database.
                  </p>
                </div>
                <span className={isSystemOnline ? 'text-white' : 'text-[#f87171]'}>{isSystemOnline ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <i className="fa-solid fa-download text-blue-400 text-sm"></i>
              </div>
              <h2 className="text-lg font-semibold text-white">Data Management</h2>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-sm text-text-secondary mb-4 leading-relaxed">Export your raw data payload (JSON) for local backup and portability.</p>
              <button 
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full border border-panel-border/30 text-text-secondary hover:border-accent-teal hover:text-accent-teal font-mono text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer bg-transparent hover:shadow-[0_0_10px_rgba(45,212,191,0.1)]"
              >
                {isExporting ? <div className="w-4 h-4 rounded-full border-2 border-accent-teal/30 border-t-accent-teal animate-spin"></div> : <i className="fa-solid fa-download text-xs"></i>}
                {isExporting ? 'Exporting...' : 'Download Payload'}
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <i className="fa-solid fa-radiation text-[#f87171] text-sm"></i>
              </div>
              <h2 className="text-lg font-semibold text-[#f87171]">Danger Zone</h2>
            </div>
            <div className="glass-panel rounded-2xl p-6 border-rose-500/20!">
              <p className="text-sm text-[#f87171]/70 mb-4 leading-relaxed">Force revoke all active credential caches from this local browser instance.</p>
              <button 
                onClick={handlePurge}
                className="w-full bg-transparent border border-rose-400/40 text-rose-400 font-mono text-xs uppercase tracking-wider rounded-xl px-4 py-2.5 hover:bg-rose-500/10 hover:border-rose-400 transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(244,63,94,0.15)]"
              >
                Execute Purge
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Cancel"
        danger={confirmConfig.danger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
