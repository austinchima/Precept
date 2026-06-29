import React, { useState } from 'react';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import { getSkillIcon } from '../lib/utils';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { Zap, FileText, Link2, AlertTriangle, ChartPie, CheckCircle2, XCircle, Plus, Loader2 } from 'lucide-react';

const C = {
  bg0: '#02050A', bg1: '#06090F', bg2: '#0B0F17', bg3: '#11161F',
  ink: '#E6EBF2', inkDim: '#9CA8B8', inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)', hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', emerald: '#10b981',
} as const;

const cardStyle = (): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
  border: `1px solid ${C.hair}`,
  borderRadius: 18,
  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
});

const Eyebrow = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)',
  border: `1px solid ${C.hair}`,
  borderRadius: 10,
  color: C.ink,
  padding: '10px 12px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13,
  width: '100%',
  outline: 'none',
};

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

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [manualKeywords, setManualKeywords] = useState('');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResults(null);
    try {
      const extracted = manualKeywords.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
      const res = await api.post<MatchResults>('/api/jobdescription', {
        companyName: company,
        roleTitle: role,
        description: jdText,
        extractedKeyWords: extracted,
        url,
        location: 'Remote',
        isRemote: true,
        source: 'JD Matcher UI',
      });
      setResults(res);
    } catch (err) {
      console.error('Extraction failed:', err);
      toast.error((err as Error).message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToApplications = async () => {
    if (!results) return;
    setIsAdding(true);
    try {
      const today = new Date().toISOString();
      const fu = new Date();
      fu.setDate(fu.getDate() + 7);
      await api.post('/api/application', {
        companyName: results.companyName,
        roleTitle: results.roleTitle,
        location: 'Remote',
        status: 'Applied',
        dateApplied: today,
        dateLastContact: today,
        followUpDate: fu.toISOString(),
        resumeVersion: 'v1',
        notes: `Linked to JD. Match: ${results.yourMatchScore}%.`,
        isRemote: true,
        source: 'JD Matcher UI',
        jobDescriptionId: results.id,
      });
      toast.success(`Application pipeline created for ${results.companyName}!`, 'Pipeline added');
    } catch (err) {
      console.error('Failed to create app from JD:', err);
      toast.error((err as Error).message || 'Failed to add to pipeline.');
    } finally {
      setIsAdding(false);
    }
  };

  const scoreColor = (score: number) => (score >= 80 ? C.emerald : score >= 50 ? C.amber : C.rose);
  const scoreLabel = (score: number) => {
    if (score >= 80) return { text: 'Strong core match. Perfect technical fit.', verdict: 'Apply.', color: C.emerald };
    if (score >= 50) return { text: 'Moderate compatibility. Gaps are learnable.', verdict: 'Apply.', color: C.amber };
    return { text: 'Low compatibility. Significant gaps detected.', verdict: 'Review.', color: C.rose };
  };

  return (
    <div className="font-body p-4 md:p-8 pt-4 md:pt-6 max-w-[1400px] mx-auto space-y-6" data-testid="jd-matcher-page" style={{ color: C.ink }}>
      <div className="opacity-0 animate-fade-in-up">
        <Eyebrow color={C.sky}>JD analyzer</Eyebrow>
        <h1 className="mt-4 font-display font-bold leading-[1.05]" style={{ color: C.ink, fontSize: 'clamp(28px,4vw,40px)' }}>
          Paste a JD. See your <span className="font-editorial" style={{ color: C.sky, fontWeight: 400 }}>gaps.</span>
        </h1>
        <p className="mt-2 font-body text-[14.5px] max-w-[680px]" style={{ color: C.inkDim }}>
          Precept maps requirements against your inventory, surfaces missing keywords, and computes a real match score.
        </p>
      </div>

      <AnimatedSection animation="staggerFadeUp" stagger={0.1} childSelector="> div" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT — input */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="p-6 flex flex-col gap-5 relative overflow-hidden" style={cardStyle()}>
            <h3 className="font-display text-[17px] font-semibold flex items-center gap-2" style={{ color: C.ink }}>
              <FileText size={16} style={{ color: C.sky }} /> Analyze job description
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company">
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Stripe, Google" style={inputStyle} data-testid="jd-company" />
              </Field>
              <Field label="Role">
                <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Engineer" style={inputStyle} data-testid="jd-role" />
              </Field>
            </div>

            <Field label="Job URL · optional">
              <div className="relative">
                <Link2 size={13} style={{ color: C.inkMute }} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://careers.company.com/jobs/…" style={{ ...inputStyle, paddingLeft: 34 }} data-testid="jd-url" />
              </div>
            </Field>

            <Field label="Paste JD text">
              <div className="flex justify-between items-end mb-1">
                <span />
                <span className="font-mono text-[10px]" style={{ color: C.inkMute }}>~{jdText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={10}
                placeholder="Paste the full JD here…"
                style={{ ...inputStyle, fontFamily: 'Geist, Inter, sans-serif', resize: 'vertical', minHeight: 220 }}
                data-testid="jd-text"
              />
            </Field>

            <div className="p-4 flex flex-col gap-2" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 12 }}>
              <label className="font-mono text-[10.5px] flex items-center gap-2" style={{ color: C.inkDim }}>
                <AlertTriangle size={11} style={{ color: C.amber }} />
                Manual keyword fallback (until AI extraction ships)
              </label>
              <input type="text" value={manualKeywords} onChange={(e) => setManualKeywords(e.target.value)}
                placeholder="e.g. React, TypeScript, REST APIs, CI/CD…"
                style={inputStyle}
                data-testid="jd-manual-keywords"
              />
            </div>

            <button onClick={handleAnalyze} disabled={isAnalyzing || !jdText.trim()} data-testid="jd-analyze-btn"
              className="group w-full inline-flex items-center justify-center gap-2 rounded-full py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] cursor-pointer disabled:opacity-50"
              style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.45)` }}>
              {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {isAnalyzing ? 'Analyzing…' : 'Analyze description'}
            </button>
          </div>
        </div>

        {/* RIGHT — output */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {isAnalyzing && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]" style={cardStyle()}>
              <Loader2 className="w-12 h-12 animate-spin mb-3" style={{ color: C.teal }} />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: C.teal }}>Running match vectors…</p>
            </div>
          )}

          {!results && !isAnalyzing && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center gap-4" style={cardStyle()}>
              <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: `${C.teal}14`, border: `1px solid ${C.teal}33` }}>
                <ChartPie size={20} style={{ color: C.teal }} />
              </div>
              <Eyebrow color={C.inkDim}>Waiting for input</Eyebrow>
              <p className="font-body text-[13.5px] leading-relaxed max-w-[280px]" style={{ color: C.inkDim }}>
                Paste a JD on the left to compute match score and surface keyword gaps.
              </p>
            </div>
          )}

          {results && !isAnalyzing && (
            <>
              {/* Score card */}
              <div className="p-6 flex flex-col items-center relative overflow-hidden" style={cardStyle()}>
                <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full" style={{ background: `radial-gradient(circle, ${C.tealDim}, transparent 70%)`, filter: 'blur(4px)' }} />
                <div className="self-start"><Eyebrow color={C.teal}>Match analysis</Eyebrow></div>

                <div className="relative w-44 h-44 mt-6 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" stroke={C.hair} strokeWidth="8" fill="none" />
                    <circle cx="60" cy="60" r="52" stroke={scoreColor(results.yourMatchScore || 0)} strokeWidth="8" fill="none"
                      strokeDasharray={326.7}
                      strokeDashoffset={326.7 - (326.7 * (results.yourMatchScore || 0)) / 100}
                      strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 8px ${scoreColor(results.yourMatchScore || 0)}88)`, transition: 'stroke-dashoffset 1.5s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="font-display text-[42px] font-bold leading-none" style={{ color: scoreColor(results.yourMatchScore || 0) }}>
                        {results.yourMatchScore || 0}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: C.inkMute }}>percent</div>
                    </div>
                  </div>
                </div>

                <div className="text-center px-4 py-3 mt-2" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 12, width: '100%' }}>
                  <p className="font-body text-[13px] leading-relaxed" style={{ color: C.inkDim }}>
                    {scoreLabel(results.yourMatchScore || 0).text}{' '}
                    <span className="font-mono font-medium" style={{ color: scoreLabel(results.yourMatchScore || 0).color }}>
                      {scoreLabel(results.yourMatchScore || 0).verdict}
                    </span>
                  </p>
                </div>
              </div>

              {/* Keyword card */}
              <div className="p-6 flex flex-col gap-5 flex-1" style={cardStyle()}>
                <div className="flex items-center justify-between">
                  <Eyebrow color={C.violet}>Keyword match</Eyebrow>
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.inkMute }}>
                    {results.extractedKeyWords.length} keywords
                  </span>
                </div>

                {/* Matched */}
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] mb-2" style={{ color: C.teal }}>
                    <CheckCircle2 size={11} /> Matched ({results.extractedKeyWords.length - results.missingKeyWords.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {results.extractedKeyWords
                      .filter((kw) => !results.missingKeyWords.some((m) => m.toLowerCase() === kw.toLowerCase()))
                      .map((kw) => {
                        const ic = getSkillIcon(kw);
                        return (
                          <span key={kw} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest"
                            style={{ background: `${C.teal}14`, color: C.teal, border: `1px solid ${C.teal}33` }}>
                            <i className={ic.icon} style={{ color: ic.color }} />
                            {kw}
                          </span>
                        );
                      })}
                    {results.extractedKeyWords.length === results.missingKeyWords.length && (
                      <span className="font-mono text-[11px] italic" style={{ color: C.inkMute }}>No matched capabilities.</span>
                    )}
                  </div>
                </div>

                {/* Missing */}
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] mb-2" style={{ color: C.rose }}>
                    <XCircle size={11} /> Gap ({results.missingKeyWords.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {results.missingKeyWords.map((kw) => {
                      const ic = getSkillIcon(kw);
                      return (
                        <span key={kw} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest"
                          style={{ background: `${C.rose}14`, color: C.rose, border: `1px solid ${C.rose}33` }}>
                          <i className={ic.icon} style={{ color: ic.color }} />
                          {kw}
                        </span>
                      );
                    })}
                    {results.missingKeyWords.length === 0 && (
                      <span className="font-mono text-[11px] italic" style={{ color: C.teal }}>No skill gaps! Perfect match.</span>
                    )}
                  </div>
                </div>

                <button onClick={handleAddToApplications} disabled={isAdding} data-testid="jd-add-app-btn"
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-full py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.025)', color: C.ink, border: `1px solid ${C.hair2}` }}>
                  {isAdding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  {isAdding ? 'Adding…' : 'Add to applications'}
                </button>
              </div>
            </>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] block" style={{ color: C.inkMute }}>{label}</label>
      {children}
    </div>
  );
}
