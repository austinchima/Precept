import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Story, BehavioralStory, ConfidenceLevel, StoryCategory } from '../types';
import { formatCategoryName } from '../lib/skills';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { C, cardStyle, Eyebrow } from '../components/stories/storyTheme';
import { Mic, MicOff, ArrowRight, Eye, X, CheckCircle2, Minus, AlertTriangle, Brain, Loader2 } from 'lucide-react';

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

const VALID_CATEGORIES: StoryCategory[] = ['Auth', 'Database', 'Ai', 'ML', 'DevOps', 'Frontend', 'Backend', 'SystemDesign', 'Security', 'Testing', 'Cloud', 'Architecture'];
type QuizSource = 'technical' | 'behavioral';

function isBehavioralStory(story: Story | BehavioralStory): story is BehavioralStory {
  return 'situation' in story;
}

export default function QuizMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const sourceParam = searchParams.get('source');
  const category: StoryCategory | undefined = categoryParam && VALID_CATEGORIES.includes(categoryParam as StoryCategory)
    ? (categoryParam as StoryCategory)
    : undefined;
  const source: QuizSource = sourceParam === 'behavioral' ? 'behavioral' : 'technical';

  const [phase, setPhase] = useState<'prompt' | 'reveal'>('prompt');
  const [story, setStory] = useState<Story | BehavioralStory | null>(null);
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
      let data: Story | BehavioralStory | null = null;
      if (source === 'behavioral') {
        data = await api.get<BehavioralStory>('/api/behavioralstory/quiz');
      } else {
        const url = category ? `/api/story/quiz?category=${encodeURIComponent(category)}` : '/api/story/quiz';
        data = await api.get<Story>(url);
      }
      if (data && data.id) setStory(data);
      else setStory(null);
    } catch (err) {
      console.error('Quiz story fetch failed:', err);
      setStory(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadNextStory(); }, [category, source]);

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
    setIsLoading(true);
    try {
      if (!isBehavioralStory(story)) {
        let target: ConfidenceLevel = story.confidenceLevel;
        if (result === 'Nailed it') target = getIncrementedConfidence(story.confidenceLevel);
        else if (result === 'Partial') target = getDecrementedConfidence(story.confidenceLevel);
        else if (result === 'Blank panic') target = 'Panic';
        await api.patch(`/api/story/${story.id}/confidence`, { confidenceLevel: target });
      }
      await loadNextStory();
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      toast.error((err as Error).message || 'Failed to save assessment.');
      setIsLoading(false);
    }
  };

  const setSource = (next: QuizSource) => {
    const params: Record<string, string> = {};
    if (next === 'behavioral') {
      params.source = 'behavioral';
    } else if (category) {
      params.category = category;
    }
    setSearchParams(params);
  };

  if (isLoading && !story) {
    return (
      <div className="font-body h-full flex items-center justify-center" style={{ background: C.bg0, color: C.ink }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.teal }} />
          <span className="font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: C.inkDim }}>Loading next drill…</span>
        </div>
      </div>
    );
  }

  if (!story) {
    const isBehavioral = source === 'behavioral';
    return (
      <div className="font-body h-full flex flex-col items-center justify-center px-6 isolate relative overflow-hidden" style={{ background: C.bg0, color: C.ink }}>
        <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50 z-0" />
        <div className="relative z-10 max-w-[480px] w-full p-10 text-center opacity-0 animate-fade-in-up" style={cardStyle()}>
          <div className="mx-auto w-14 h-14 rounded-xl grid place-items-center mb-5" style={{ background: `${C.teal}14`, border: `1px solid ${C.teal}33` }}>
            <Brain size={24} style={{ color: C.teal }} />
          </div>
          <Eyebrow color={C.teal}>Quiz mode{category && !isBehavioral ? ` · ${formatCategoryName(category)}` : ''}</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold leading-[1.05]" style={{ color: C.ink }}>
            {isBehavioral ? (
              <>No behavioral <span className="font-editorial" style={{ color: C.amber, fontWeight: 400 }}>STAR stories</span> yet.</>
            ) : category ? (
              <>No <span className="font-editorial" style={{ color: C.amber, fontWeight: 400 }}>{formatCategoryName(category)}</span> stories yet.</>
            ) : (
              <>Story bank is <span className="font-editorial" style={{ color: C.amber, fontWeight: 400 }}>empty.</span></>
            )}
          </h2>
          <p className="mt-4 font-body text-[14.5px] leading-relaxed" style={{ color: C.inkDim }}>
            {isBehavioral
              ? 'Bank some STAR narratives first — Precept will drill them once they exist.'
              : category
                ? `Bank some ${formatCategoryName(category)} narratives first, or clear the filter to drill all categories.`
                : 'Bank some technical narratives first — Precept will drill them with spaced repetition once they exist.'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/story-bank')} data-testid="quiz-go-storybank"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
              style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}>
              Go to story bank <ArrowRight size={12} />
            </button>
            <button onClick={() => navigate('/story-bank')}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
              style={{ background: `${C.teal}14`, color: C.teal, border: `1px solid ${C.teal}33` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${C.teal}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${C.teal}14`; }}>
              Start from a template <ArrowRight size={12} />
            </button>
            {!isBehavioral && category && (
              <button onClick={() => setSearchParams({})}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
                style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.ink; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.inkDim; }}>
                Clear filter <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const behavioral = isBehavioralStory(story);
  const tags = behavioral && story.tags
    ? story.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="font-body h-full flex flex-col relative isolate overflow-hidden" style={{ background: C.bg0, color: C.ink }} data-testid="quiz-page">
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-40 z-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-[50%] z-0"
        style={{ background: `radial-gradient(closest-side, rgba(45,212,191,0.10), rgba(139,92,246,0.06) 45%, transparent 75%)`, filter: 'blur(4px)' }} />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 h-20 backdrop-blur-md sticky top-0" style={{ background: 'rgba(2,5,10,0.7)', borderBottom: `1px solid ${C.hair}` }}>
        <div className="flex items-center gap-3">
          <Eyebrow color={C.teal}>Drill · {behavioral ? 'Behavioral' : formatCategoryName(story.category)}</Eyebrow>
          {source === 'technical' && category && (
            <button
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] cursor-pointer transition-colors"
              style={{ background: `${C.teal}14`, color: C.teal, border: `1px solid ${C.teal}33` }}
              title="Clear category filter">
              {formatCategoryName(category)} <X size={10} />
            </button>
          )}
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

          {/* Source toggle */}
          <div className="flex items-center justify-center gap-1 p-1 rounded-full self-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.hair}` }}>
            <button onClick={() => setSource('technical')}
              className="rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] cursor-pointer transition-all"
              style={source === 'technical'
                ? { background: C.ink, color: C.bg0 }
                : { background: 'transparent', color: C.inkDim }}>
              Technical
            </button>
            <button onClick={() => setSource('behavioral')}
              className="rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] cursor-pointer transition-all"
              style={source === 'behavioral'
                ? { background: C.violet, color: C.ink }
                : { background: 'transparent', color: C.inkDim }}>
              Behavioral
            </button>
          </div>

          <AnimatedSection animation="fadeUp" className="p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden" >
            <div style={cardStyle()} className="absolute inset-0 -z-10" />

            {/* Prompt card */}
            <div className="overflow-hidden" style={{ background: C.bg0, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
              <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest" style={{ borderBottom: `1px solid ${C.hair}`, color: C.inkMute }}>
                <span>{behavioral ? 'STAR prompt' : formatCategoryName((story as Story).category)}</span>
                <span>quiz mode</span>
              </div>
              {behavioral ? (
                <div className="p-6 md:p-8 flex flex-col gap-4 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full grid place-items-center" style={{ background: `${C.violet}14`, border: `1px solid ${C.violet}33` }}>
                    <span className="font-mono text-[18px] font-bold" style={{ color: C.violet }}>?</span>
                  </div>
                  <h3 className="font-display text-[22px] md:text-[26px] font-semibold leading-tight" style={{ color: C.ink }}>
                    Tell me about a time when…
                  </h3>
                  <p className="font-body text-[15px] leading-relaxed" style={{ color: C.inkDim }}>
                    {story.title}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                      {tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-full font-mono text-[9.5px] uppercase tracking-wider" style={{ background: `${C.violet}10`, border: `1px solid ${C.violet}33`, color: C.inkDim }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <pre className="p-5 font-mono text-[12.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap custom-scrollbar" style={{ color: C.teal }}>
                  <code>{(story as Story).codeSnippet}</code>
                </pre>
              )}
            </div>

            <div>
              <h2 className="font-display text-[20px] font-semibold mb-1" style={{ color: C.ink }}>
                {behavioral ? (
                  <>Respond with the full <span className="font-editorial" style={{ color: C.violet, fontWeight: 400 }}>STAR</span> structure.</>
                ) : (
                  <>Explain what this code does — out <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>loud.</span></>
                )}
              </h2>
              <p className="font-body text-[13.5px]" style={{ color: C.inkDim }}>
                {behavioral
                  ? 'Cover Situation, Task, Action, and Result. Type or speak — your answer never leaves the page.'
                  : 'Type or speak. Your answer never leaves the page.'}
              </p>
              <div className="relative mt-3">
                <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={phase === 'reveal'}
                  rows={5} data-testid="quiz-answer-input"
                  className="w-full p-4 pr-16 disabled:opacity-80 font-body text-[14px] focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair}`, color: C.ink, borderRadius: 14, resize: 'vertical', minHeight: 140 }}
                  placeholder={behavioral ? "Situation: ...\nTask: ...\nAction: ...\nResult: ..." : "A debouncer is used to..."}
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
                style={{ background: behavioral ? C.violet : C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${behavioral ? C.violet : C.ink}, 0 18px 60px -20px ${behavioral ? 'rgba(139,92,246,0.5)' : 'rgba(45,212,191,0.5)'}` }}>
                <Eye size={13} /> Reveal {behavioral ? 'STAR breakdown' : 'explanation'}
              </button>
            ) : (
              <>
                <div className="opacity-0 animate-fade-in-up">
                  <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] mb-2" style={{ color: behavioral ? C.violet : C.teal }}>
                    <CheckCircle2 size={12} /> {behavioral ? 'STAR breakdown' : 'Correct explanation'}
                  </div>
                  {behavioral ? (
                    <div className="flex flex-col gap-3">
                      {[
                        { label: 'Situation', value: (story as BehavioralStory).situation },
                        { label: 'Task', value: (story as BehavioralStory).task },
                        { label: 'Action', value: (story as BehavioralStory).action },
                        { label: 'Result', value: (story as BehavioralStory).result },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-4 font-body text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ background: C.bg2, borderLeft: `2px solid ${C.violet}`, color: C.inkDim, borderRadius: 12 }}>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] block mb-1" style={{ color: C.violet }}>{label}</span>
                          {value}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 font-body text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ background: C.bg2, borderLeft: `2px solid ${C.teal}`, color: C.inkDim, borderRadius: 12 }}>
                      {(story as Story).explanation}
                    </div>
                  )}
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
        </div>
      </main>
    </div>
  );
}
