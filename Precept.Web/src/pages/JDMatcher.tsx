import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import { getSkillIcon } from '../lib/utils';
import { AnimatedSection } from '../components/animation/AnimatedSection';

interface MatchResults {
  id: string;
  companyName: string;
  roleTitle: string;
  extractedKeyWords: string[];
  missingKeyWords: string[];
  yourMatchScore: number | null;
  url: string;
}

export default function JDMatcher() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [results, setResults] = useState<MatchResults | null>(null);
  const toast = useToast();
  
  // Input fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  
  // Manual keyword entry (until server-side AI extraction is shipped)
  const [manualKeywords, setManualKeywords] = useState('');
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResults(null);
    
    let extracted: string[] = [];

    try {
      // Fallback: Just use manual keywords until the backend AI is implemented
      extracted = manualKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const res = await api.post<MatchResults>('/api/jobdescription', {
        companyName: company,
        roleTitle: role,
        description: jdText,
        extractedKeyWords: extracted,
        url: url,
        location: 'Remote',
        isRemote: true,
        source: 'JD Matcher UI'
      });

      setResults(res);
    } catch (err) {
      console.error('Extraction/Match sequence failed:', err);
      toast.error((err as Error).message || 'Analysis failed. Please check your API key or network connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToApplications = async () => {
    if (!results) return;
    setIsAdding(true);
    try {
      const today = new Date().toISOString();
      const fuDate = new Date();
      fuDate.setDate(fuDate.getDate() + 7);
      
      await api.post('/api/application', {
        companyName: results.companyName,
        roleTitle: results.roleTitle,
        location: 'Remote',
        status: 'Applied',
        dateApplied: today,
        dateLastContact: today,
        followUpDate: fuDate.toISOString(),
        resumeVersion: 'v1',
        notes: `Linked to Job Description. Match score: ${results.yourMatchScore}%.`,
        isRemote: true,
        source: 'JD Matcher UI',
        jobDescriptionId: results.id
      });
      toast.success(`Application pipeline created for ${results.companyName}!`, 'Pipeline Added');
    } catch (err) {
      console.error('Failed to create application from JD:', err);
      toast.error((err as Error).message || 'Failed to add to applications pipeline.');
    } finally {
      setIsAdding(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-accent-teal';
    if (score >= 50) return 'text-amber-400';
    return 'text-[#f87171]';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 80) {
      return (
        <p className="text-sm text-text-secondary">
          Strong core match. Perfect technical fit. <span className="text-accent-teal font-mono font-medium">Recommended: Apply.</span>
        </p>
      );
    }
    if (score >= 50) {
      return (
        <p className="text-sm text-text-secondary">
          Moderate compatibility. Missing components are learnable. <span className="text-accent-teal font-mono font-medium">Recommended: Apply.</span>
        </p>
      );
    }
    return (
      <p className="text-sm text-text-secondary">
        Low compatibility. Significant skill gaps detected. <span className="text-[#f87171] font-mono font-medium">Recommended: Review.</span>
      </p>
    );
  };

  return (
    <div className="p-8 pt-6 max-w-[1400px] mx-auto space-y-6">

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 opacity-0 animate-fade-in-up">
        <div>
          <h1 className="text-[28px] font-medium text-white flex items-center tracking-tight">
            JD <span className="font-bold ml-2 hover:text-accent-teal transition-colors duration-300 cursor-default">Matcher</span>
            <span className="mx-3 text-text-secondary/30 text-3xl font-light">|</span>
            <span className="text-text-secondary font-normal text-lg">Analysis Engine</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1 max-w-[672px]">
            Paste a job description to instantly align your skills, identify gaps, and generate optimized resume bullets tailored to the specific role.
          </p>
        </div>
      </div>

      {/* 2-Column Bento Layout */}
      <AnimatedSection animation="staggerFadeUp" stagger={0.1} childSelector="> div" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-accent-teal/20 via-accent-teal to-accent-teal/20"></div>

            <h3 className="text-lg font-semibold text-white flex items-center gap-2.5">
              <i className="fa-solid fa-file-lines text-accent-teal text-sm"></i>
              Analyze Job Description
            </h3>
            
            {/* Metadata Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Company Name</label>
                <input 
                  type="text" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Stripe, Google..."
                  className="input-base w-full text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Role Title</label>
                <input 
                  type="text" 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Frontend Engineer..."
                  className="input-base w-full text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Job URL (Optional)</label>
              <div className="relative">
                <i className="fa-solid fa-link absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs"></i>
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input-base w-full text-sm pl-9!"
                  placeholder="https://careers.company.com/jobs/..."
                />
              </div>
            </div>
            
            {/* JD Textarea */}
            <div className="space-y-1.5 min-h-[300px] flex flex-col">
              <div className="flex justify-between items-end">
                <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Paste JD Text</label>
                <span className="font-mono text-[10px] text-text-secondary/60">~{jdText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <textarea 
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="input-base w-full text-sm flex-1 resize-none min-h-[260px]" 
                placeholder="Paste the full job description here..."
              />
            </div>

            {/* Manual Keyword Override (Temporary) */}
            <div className="flex flex-col gap-2 p-4 bg-dashboard-bg/50 border border-panel-border/30 rounded-xl">
              <label className="text-xs font-mono text-text-secondary flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-400 text-[10px]"></i>
                Manual keywords fallback (until server-side AI is shipped)
              </label>
              <input 
                type="text" 
                value={manualKeywords}
                onChange={(e) => setManualKeywords(e.target.value)}
                className="input-base w-full text-sm font-mono"
                placeholder="e.g. React, TypeScript, REST APIs, CI/CD..."
              />
            </div>
            
            {/* Action */}
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jdText.trim()}
              className="w-full inline-flex items-center justify-center px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-[1.02] transition-all duration-300 cursor-pointer gap-2 disabled:opacity-50 disabled:scale-100"
            >
              <i className="fa-solid fa-bolt"></i>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Description'}
            </button>
          </div>
        </div>
        
        {/* Right Column: Analysis Output (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {isAnalyzing && (
            <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 rounded-full border-4 border-accent-teal/10 border-t-accent-teal animate-spin mb-4" />
              <p className="font-mono text-xs uppercase tracking-wider text-accent-teal animate-pulse">Running Match Vectors...</p>
            </div>
          )}

          {!results && !isAnalyzing && (
            <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
              <i className="fa-solid fa-percentage text-4xl text-accent-teal/30"></i>
              <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">Awaiting Analysis Parameters</p>
              <p className="text-sm max-w-[320px] leading-normal text-text-secondary">
                Configure keywords, paste a JD, and execute analysis to generate compatibility metrics.
              </p>
            </div>
          )}

          {results && !isAnalyzing && (
            <>
              {/* Match Score Card */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-white/15 transition-all duration-300">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-teal/5 rounded-full blur-3xl group-hover:bg-accent-teal/10 transition-colors"></div>
                <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider self-start mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-accent-teal text-[10px]"></i> Match Analysis
                </h4>
                
                <div className="relative w-48 h-48 mb-6">
                  <svg className={`circular-chart w-full h-full ${getScoreColor(results.yourMatchScore || 0)}`} viewBox="0 0 36 36">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                    <path 
                      className="circle stroke-current" 
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      strokeDasharray={`${results.yourMatchScore || 0}, 100`}
                    ></path>
                    <text className="percentage" x="18" y="20.35">{results.yourMatchScore || 0}%</text>
                  </svg>
                </div>
                
                <div className="text-center bg-dashboard-bg/50 p-4 rounded-xl border border-panel-border/30 w-full">
                  {getScoreDescription(results.yourMatchScore || 0)}
                </div>
              </div>
              
              {/* Keyword Extraction Card */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6 flex-1">
                <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-tags text-accent-teal text-[10px]"></i> Keyword Match
                  </span>
                  <i className="fa-solid fa-sliders text-accent-teal text-xs"></i>
                </h4>
                
                {/* Matched */}
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-xs text-text-secondary border-b border-panel-border/20 pb-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check text-accent-teal text-[10px]"></i>
                    Matched Skills ({results.extractedKeyWords.length - results.missingKeyWords.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {results.extractedKeyWords
                      .filter(kw => !results.missingKeyWords.some(m => m.toLowerCase() === kw.toLowerCase()))
                      .map(kw => {
                        const iconData = getSkillIcon(kw);
                        return (
                          <span key={kw} className="px-2.5 py-1 flex items-center gap-1.5 bg-accent-teal/10 text-accent-teal border border-accent-teal/20 rounded-full font-mono text-[10px]">
                            <i className={`${iconData.icon} opacity-80`} style={{ color: iconData.color }}></i>
                            {kw.toUpperCase()}
                          </span>
                        );
                      })}
                    {results.extractedKeyWords.length === results.missingKeyWords.length && (
                      <span className="text-xs font-mono text-text-secondary italic">No matched capabilities.</span>
                    )}
                  </div>
                </div>
                
                {/* Missing */}
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-xs text-text-secondary border-b border-panel-border/20 pb-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-xmark text-[#f87171] text-[10px]"></i>
                    Missing / Gap ({results.missingKeyWords.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {results.missingKeyWords.map(kw => {
                      const iconData = getSkillIcon(kw);
                      return (
                        <span key={kw} className="px-2.5 py-1 flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-mono text-[10px]">
                          <i className={`${iconData.icon} opacity-80`} style={{ color: iconData.color }}></i>
                          {kw.toUpperCase()}
                        </span>
                      );
                    })}
                    {results.missingKeyWords.length === 0 && (
                      <span className="text-xs font-mono text-accent-teal italic">No skill gaps! Perfect match.</span>
                    )}
                  </div>
                </div>
                
                {/* Action Secondary */}
                <button 
                  onClick={handleAddToApplications}
                  disabled={isAdding}
                  className="mt-auto w-full border border-panel-border/30 text-text-secondary hover:border-accent-teal hover:text-accent-teal font-mono text-xs uppercase tracking-wider py-2.5 px-4 min-h-[44px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer bg-transparent hover:shadow-[0_0_10px_rgba(45,212,191,0.1)]"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  {isAdding ? 'Adding...' : 'Add to Applications'}
                </button>
              </div>
            </>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
