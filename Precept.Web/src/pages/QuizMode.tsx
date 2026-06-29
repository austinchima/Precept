import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Story, ConfidenceLevel } from '../types';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { Mic, MicOff, ArrowRight, Eye, X, CheckCircle2, Minus, AlertTriangle, Brain, Loader2, Terminal } from 'lucide-react';

const C = {
  bg0: '#02050A', bg1: '#06090F', bg2: '#0B0F17', bg3: '#11161F',
  ink: '#E6EBF2', inkDim: '#9CA8B8', inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)', hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', emerald: '#10b981',
} as const;

const cardStyle = (): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
  border: `1px solid ${C.hair2}`,
  borderRadius: 22,
  boxShadow: `0 60px 120px -40px rgba(45,212,191,0.18), inset 0 1px 0 rgba(255,255,255,0.05)`,
});

const Eyebrow = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

const getIncrementedConfidence = (current: ConfidenceLevel): ConfidenceLevel => {
  switch (current) {
    case 'Panic': return 'Shaky';
    case 'Shaky': return 'Okay';
    case 'Okay': return 'Solid';
    case 'Solid': return 'CanTeach';
    case 'CanTeach': return 'CanTeach';
  }
};
const getDecrementedConfidence = (current: ConfidenceLevel): ConfidenceLevel => {
  switch (current) {
    case 'CanTeach': return 'Solid';
    case 'Solid': return 'Okay';
    case 'Okay': return 'Shaky';
    case 'Shaky': return 'Panic';
    case 'Panic': return 'Panic';
  }
};

export default function QuizMode() {
  const [phase, setPhase] = useState<'prompt' | 'reveal'>('prompt');
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const toast = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();

  const loadNextStory = async () => {
    setIsLoading(true);
    setPhase('prompt');
    setUserAnswer('');
    try {
      const data = await api.get<Story>('/api/story/quiz');
      if (data && data.id) setStory(data);
      else setStory(null);
    } catch (err) {
      console.error('Quiz story fetch failed:', err);
      setStory(null);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { loadNextStory(); }, []);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        const resultText = event.results[event.results.length - 1][0].transcript;
        setUserAnswer((prev) => prev + (prev ? ' ' : '') + resultText);
      };
      rec.onend = () => setIsRecording(false);
      rec.onerror = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.warning('Voice transcription is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isRecording) recognitionRef.current.stop();
    else { setIsRecording(true); recognitionRef.current.start(); }
  };

  const handleAssessment = async (result: 'Nailed it' | 'Partial' | 'Blank panic') => {
    if (!story) return;
    let target: ConfidenceLevel = story.confidenceLevel;
    if (result === 'Nailed it') target = getIncrementedConfidence(story.confidenceLevel);
    else if (result === 'Partial') target = getDecrementedConfidence(story.confidenceLevel);
    else if (result === 'Blank panic') target = 'Panic';
    setIsLoading(true);
    try {
      await api.patch(`/api/story/${story.id}/confidence`, { confidenceLevel: target });
      await loadNextStory();
    } catch (err) {
      console.error('Failed to submit confidence:', err);
      toast.error((err as Error).message || 'Failed to save assessment.');
      setIsLoading(false);
    }
  };

  if (isLoading && !story) {
    return (
      <div className="font-body min-h-screen flex items-center justify-center" style={{ background: C.bg0, color: C.ink }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.teal }} />
          <span className="font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: C.inkDim }}>Loading next drill…</span>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="font-body min-h-screen flex flex-col items-center justify-center px-6 isolate relative overflow-hidden" style={{ background: C.bg0, color: C.ink }}>
        <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50 z-0" />
        <div className="relative z-10 max-w-[480px] w-full p-10 text-center opacity-0 animate-fade-in-up" style={cardStyle()}>
          <div className="mx-auto w-14 h-14 rounded-xl grid place-items-center mb-5" style={{ background: `${C.teal}14`, border: `1px solid ${C.teal}33` }}>
            <Brain size={24} style={{ color: C.teal }} />
          </div>
          <Eyebrow color={C.teal}>Quiz mode</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold leading-[1.05]" style={{ color: C.ink }}>
            Story bank is <span className="font-editorial" style={{ color: C.amber, fontWeight: 400 }}>empty.</span>
          </h2>
          <p className="mt-4 font-body text-[14.5px] leading-relaxed" style={{ color: C.inkDim }}>
            Bank some technical narratives first — Precept will drill them with spaced repetition once they exist.
          </p>
          <button onClick={() => navigate('/story-bank')} data-testid="quiz-go-storybank"
            className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
            style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}>
            Go to story bank <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-body min-h-screen flex flex-col relative isolate overflow-hidden" style={{ background: C.bg0, color: C.ink }} data-testid="quiz-page">
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-40 z-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-[50%] z-0"
        style={{ background: `radial-gradient(closest-side, rgba(45,212,191,0.10), rgba(139,92,246,0.06) 45%, transparent 75%)`, filter: 'blur(4px)' }} />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 h-20 backdrop-blur-md sticky top-0" style={{ background: 'rgba(2,5,10,0.7)', borderBottom: `1px solid ${C.hair}` }}>
        <div className="flex items-center gap-3">
          <Eyebrow color={C.teal}>Drill · {story.category === 'SystemDesign' ? 'System Design' : story.category}</Eyebrow>
        </div>
        <button onClick={() => { if (isRecording && recognitionRef.current) recognitionRef.current.stop(); navigate('/story-bank'); }}
          data-testid="quiz-exit"
          className="group inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer transition-colors"
          style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.ink; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.inkDim; }}
        >
          Exit drill <X size={12} />
        </button>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center py-10 px-6 md:px-12 w-full">
        <div className="w-full max-w-[860px] flex flex-col gap-6">

          <AnimatedSection animation="fadeUp" className="p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden" >
            <div style={cardStyle()} className="absolute inset-0 -z-10" />

            {/* IDE-style snippet card */}
            <div className="overflow-hidden" style={{ background: C.bg0, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${C.hair}` }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: '#ff5f57' }} />
                  <span className="h-2 w-2 rounded-full" style={{ background: '#febc2e' }} />
                  <span className="h-2 w-2 rounded-full" style={{ background: '#28c840' }} />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: C.inkMute }}>
                  <Terminal size={10} /> {story.title}
                </div>
                <div className="font-mono text-[10px]" style={{ color: C.inkMute }}>quiz mode</div>
              </div>
              <pre className="p-5 font-mono text-[12.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap custom-scrollbar" style={{ color: C.teal }}>
                <code>{story.codeSnippet}</code>
              </pre>
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold mb-1" style={{ color: C.ink }}>
                Explain what this code does — out <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>loud.</span>
              </h2>
              <p className="font-body text-[13.5px]" style={{ color: C.inkDim }}>
                Type or speak. Your answer never leaves the page.
              </p>
              <div className="relative mt-3">
                <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={phase === 'reveal'}
                  rows={5} data-testid="quiz-answer-input"
                  className="w-full p-4 pr-16 disabled:opacity-80 font-body text-[14px] focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair}`, color: C.ink, borderRadius: 14, resize: 'vertical', minHeight: 140 }}
                  placeholder="A debouncer is used to..."
                />
                <button onClick={toggleRecording} disabled={phase === 'reveal'} data-testid="quiz-mic-btn"
                  className="absolute bottom-3 right-3 min-w-[44px] min-h-[44px] rounded-full grid place-items-center cursor-pointer transition-all"
                  style={{
                    background: isRecording ? `${C.rose}22` : 'rgba(255,255,255,0.025)',
                    color: isRecording ? C.rose : C.inkDim,
                    border: `1px solid ${isRecording ? `${C.rose}55` : C.hair2}`,
                    boxShadow: isRecording ? `0 0 14px ${C.rose}55` : 'none',
                  }}>
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
            </div>

            {phase === 'prompt' ? (
              <button onClick={() => { if (isRecording && recognitionRef.current) recognitionRef.current.stop(); setPhase('reveal'); }}
                data-testid="quiz-reveal-btn"
                className="group w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-all"
                style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)` }}>
                <Eye size={13} /> Reveal explanation
              </button>
            ) : (
              <>
                <div className="opacity-0 animate-fade-in-up">
                  <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] mb-2" style={{ color: C.teal }}>
                    <CheckCircle2 size={12} /> Correct explanation
                  </div>
                  <div className="p-4 font-body text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ background: C.bg2, borderLeft: `2px solid ${C.teal}`, color: C.inkDim, borderRadius: 12 }}>
                    {story.explanation}
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-3" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 16 }}>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-center" style={{ color: C.inkMute }}>How did you do?</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Nailed it', icon: <CheckCircle2 size={14} />, color: C.emerald, action: 'Nailed it' as const, testid: 'quiz-nailed' },
                      { label: 'Partial', icon: <Minus size={14} />, color: C.amber, action: 'Partial' as const, testid: 'quiz-partial' },
                      { label: 'Blank panic', icon: <AlertTriangle size={14} />, color: C.rose, action: 'Blank panic' as const, testid: 'quiz-panic' },
                    ].map((opt) => (
                      <button key={opt.label} onClick={() => handleAssessment(opt.action)} data-testid={opt.testid}
                        className="rounded-full py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-all cursor-pointer"
                        style={{ background: `${opt.color}1c`, color: opt.color, border: `1px solid ${opt.color}55`, boxShadow: `0 0 12px ${opt.color}22` }}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </AnimatedSection>

          {phase === 'reveal' && (
            <AnimatedSection animation="fadeUp" delay={0.2} className="flex justify-end">
              <button onClick={loadNextStory} data-testid="quiz-next-btn"
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
                style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)` }}>
                Next drill <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </AnimatedSection>
          )}
        </div>
      </main>
    </div>
  );
}
