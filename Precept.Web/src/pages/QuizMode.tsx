import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Eye, Mic, MicOff, X } from 'lucide-react';
import { BehavioralStory, QuizStoryResponse, ReviewResult, Story, StoryCategory } from '../types';
import { formatCategoryName } from '../lib/skills';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import { Button, Kbd, Logo, Segmented, Skeleton, Textarea } from '../components/ui/kit';
import { cn } from '../lib/utils';

const VALID_CATEGORIES: StoryCategory[] = ['Auth', 'Database', 'Ai', 'ML', 'DevOps', 'Frontend', 'Backend', 'SystemDesign', 'Security', 'Testing', 'Cloud', 'Architecture'];
type QuizSource = 'technical' | 'behavioral';

function isBehavioralStory(story: Story | BehavioralStory): story is BehavioralStory {
  return 'situation' in story;
}

function formatNextDue(dateStr: string | null | undefined) {
  if (!dateStr) return 'later';
  const diffHrs = (new Date(dateStr).getTime() - Date.now()) / 3_600_000;
  if (diffHrs < 1) return 'in less than an hour';
  if (diffHrs < 24) return `in ${Math.round(diffHrs)} hours`;
  const days = Math.round(diffHrs / 24);
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

const RATINGS: { label: string; hint: string; action: ReviewResult; key: string; testid: string; tone: string }[] = [
  { label: 'Nailed it', hint: 'Told it clearly without notes', action: 'NailedIt', key: '1', testid: 'quiz-nailed', tone: 'hover:border-accent-text' },
  { label: 'Partial', hint: 'Got there with gaps', action: 'Partial', key: '2', testid: 'quiz-partial', tone: 'hover:border-warning' },
  { label: 'Blank', hint: 'Could not recall it', action: 'BlankPanic', key: '3', testid: 'quiz-panic', tone: 'hover:border-danger' },
];

export default function QuizMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const category: StoryCategory | undefined =
    categoryParam && VALID_CATEGORIES.includes(categoryParam as StoryCategory) ? (categoryParam as StoryCategory) : undefined;
  const source: QuizSource = searchParams.get('source') === 'behavioral' ? 'behavioral' : 'technical';

  const [phase, setPhase] = useState<'prompt' | 'reveal'>('prompt');
  const [quizState, setQuizState] = useState<QuizStoryResponse<Story | BehavioralStory> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRating, setIsRating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const loadNextStory = async () => {
    setIsLoading(true);
    setPhase('prompt');
    setUserAnswer('');
    try {
      if (source === 'behavioral') {
        setQuizState(await api.get<QuizStoryResponse<BehavioralStory>>('/api/behavioralstory/quiz'));
      } else {
        const url = category ? `/api/story/quiz?category=${encodeURIComponent(category)}` : '/api/story/quiz';
        setQuizState(await api.get<QuizStoryResponse<Story>>(url));
      }
    } catch (err) {
      console.error('Quiz story fetch failed:', err);
      setQuizState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRandomStory = async () => {
    setIsLoading(true);
    setPhase('prompt');
    setUserAnswer('');
    try {
      const story =
        source === 'behavioral'
          ? await api.get<BehavioralStory>('/api/behavioralstory/random')
          : await api.get<Story>(category ? `/api/story/random?category=${encodeURIComponent(category)}` : '/api/story/random');
      setQuizState({ story, dueCount: 0, nextDueAt: null, totalStories: quizState?.totalStories || 1 });
    } catch (err) {
      console.error('Random story fetch failed:', err);
      toast.error('Could not load a story to practise.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNextStory();
  }, [category, source]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event: any) => {
      const resultText = event.results[event.results.length - 1][0].transcript;
      setUserAnswer((prev) => prev + (prev ? ' ' : '') + resultText);
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    recognitionRef.current = rec;
    return () => rec.abort?.();
  }, []);

  const stopRecording = () => {
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.warning('Voice input is not supported in this browser. Chrome and Edge support it.');
      return;
    }
    if (isRecording) recognitionRef.current.stop();
    else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleAssessment = async (result: ReviewResult) => {
    if (!quizState?.story || isRating) return;
    setIsRating(true);
    try {
      const base = source === 'behavioral' ? '/api/behavioralstory' : '/api/story';
      await api.post(`${base}/${quizState.story.id}/review`, { rating: result });
      await loadNextStory();
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      toast.error((err as Error).message || 'Could not save your rating.');
    } finally {
      setIsRating(false);
    }
  };

  const setSource = (next: QuizSource) => {
    const params: Record<string, string> = {};
    if (next === 'behavioral') params.source = 'behavioral';
    else if (category) params.category = category;
    setSearchParams(params);
  };

  // Keyboard: R reveals, 1-3 rate. Ignored while typing in the answer box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
      if (phase === 'prompt' && e.key.toLowerCase() === 'r' && quizState?.story) {
        stopRecording();
        setPhase('reveal');
      } else if (phase === 'reveal') {
        const rating = RATINGS.find((r) => r.key === e.key);
        if (rating) handleAssessment(rating.action);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const story = quizState?.story;
  const exit = () => {
    stopRecording();
    navigate('/story-bank');
  };

  const header = (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Logo className="hidden sm:inline-flex" />
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="text-[14px] font-medium text-fg">Drill</span>
          {story && <span className="num text-[13px] text-fg-3">{quizState?.dueCount || 0} due</span>}
        </div>
        <Segmented
          size="sm"
          ariaLabel="Story type"
          value={source}
          onChange={setSource}
          options={[
            { value: 'technical', label: 'Technical' },
            { value: 'behavioral', label: 'Behavioral' },
          ]}
        />
        <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={exit} data-testid="quiz-exit">
          <span className="hidden sm:inline">Exit</span>
        </Button>
      </div>
    </header>
  );

  if (isLoading && !story) {
    return (
      <div className="min-h-[100dvh] bg-bg" data-testid="quiz-page">
        {header}
        <div className="mx-auto max-w-2xl px-4 pt-12">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-6 h-48" />
          <Skeleton className="mt-6 h-32" />
        </div>
      </div>
    );
  }

  if (!story) {
    const isBehavioral = source === 'behavioral';
    const total = quizState?.totalStories || 0;
    const caughtUp = total > 0;
    return (
      <div className="min-h-[100dvh] bg-bg" data-testid="quiz-page">
        {header}
        <main className="mx-auto flex max-w-xl flex-col items-start px-6 pt-[14vh]">
          <span className={cn('grid h-10 w-10 place-items-center rounded-lg', caughtUp ? 'bg-accent text-accent-ink' : 'border border-line bg-surface-2 text-fg-2')}>
            <Check size={18} />
          </span>
          <h1 className="display-md mt-6 text-fg">
            {caughtUp ? 'You are caught up.' : isBehavioral ? 'No STAR stories yet.' : category ? `No ${formatCategoryName(category)} stories yet.` : 'Your story bank is empty.'}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-2">
            {caughtUp
              ? `All ${total} ${isBehavioral ? 'STAR ' : ''}stories are reviewed. The next one is due ${formatNextDue(quizState?.nextDueAt)}.`
              : 'Add a story first. Precept schedules it for review once it exists.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {caughtUp ? (
              <Button variant="primary" onClick={loadRandomStory} iconRight={<ArrowRight size={16} />}>Practise one anyway</Button>
            ) : (
              <Button variant="primary" to="/story-bank" data-testid="quiz-go-storybank">Go to STAR Bank</Button>
            )}
            {caughtUp && <Button variant="secondary" to="/story-bank" data-testid="quiz-go-storybank">STAR Bank</Button>}
            {!isBehavioral && category && <Button variant="ghost" onClick={() => setSearchParams({})}>Clear filter</Button>}
          </div>
        </main>
      </div>
    );
  }

  const behavioral = isBehavioralStory(story);
  const tags = behavioral && story.tags ? story.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-[100dvh] bg-bg pb-24" data-testid="quiz-page">
      {header}
      <main className="mx-auto max-w-2xl px-4 pt-10 md:pt-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={story.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-fg-3">
                <span>{behavioral ? 'Behavioral' : formatCategoryName((story as Story).category)}</span>
                {category && !behavioral && (
                  <button type="button" onClick={() => setSearchParams({})} className="chip hover:text-fg" title="Clear category filter">
                    {formatCategoryName(category)} <X size={12} />
                  </button>
                )}
              </div>
              <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-fg md:text-[28px]">
                {behavioral ? `Tell me about a time: ${story.title.charAt(0).toLowerCase()}${story.title.slice(1)}` : story.title}
              </h1>
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
                </div>
              )}
            </div>

            {!behavioral && (story as Story).codeSnippet && (
              <pre className="max-h-[42vh] overflow-auto rounded-xl border border-line bg-surface-1 p-5 font-mono text-[12.5px] leading-relaxed text-fg">
                <code>{(story as Story).codeSnippet}</code>
              </pre>
            )}

            <div>
              <label htmlFor="quiz-answer" className="field-label">
                {behavioral ? 'Answer it with situation, task, action and result' : 'Explain what this does and why, as you would out loud'}
              </label>
              <div className="relative">
                <Textarea
                  id="quiz-answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={phase === 'reveal'}
                  rows={5}
                  data-testid="quiz-answer-input"
                  className="pr-14"
                  placeholder="Type or use the microphone."
                />
                <Button
                  variant={isRecording ? 'danger' : 'ghost'}
                  size="sm"
                  className="absolute bottom-2 right-2"
                  icon={isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  onClick={toggleRecording}
                  disabled={phase === 'reveal'}
                  aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
                  aria-pressed={isRecording}
                  data-testid="quiz-mic-btn"
                />
              </div>
              <p className="field-help">Your answer stays in this browser. Recordings are not sent to Precept. Voice input uses your browser’s speech recognition.</p>
            </div>

            {phase === 'prompt' ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={<Eye size={16} />}
                onClick={() => {
                  stopRecording();
                  setPhase('reveal');
                }}
                data-testid="quiz-reveal-btn"
              >
                Reveal your notes <Kbd>R</Kbd>
              </Button>
            ) : (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                <section className="panel p-5">
                  <h2 className="text-[13px] font-medium text-fg-3">{behavioral ? 'Your STAR notes' : 'Your explanation'}</h2>
                  {behavioral ? (
                    <dl className="mt-3 grid gap-4">
                      {(['situation', 'task', 'action', 'result'] as const).map((k) => (
                        <div key={k}>
                          <dt className="text-[12.5px] font-medium capitalize text-fg">{k}</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-fg-2">{(story as BehavioralStory)[k]}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-fg-2">{(story as Story).explanation}</p>
                  )}
                </section>

                <section aria-labelledby="rate-heading">
                  <h2 id="rate-heading" className="field-label">How did it go?</h2>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {RATINGS.map((r) => (
                      <button
                        key={r.action}
                        type="button"
                        onClick={() => handleAssessment(r.action)}
                        disabled={isRating}
                        data-testid={r.testid}
                        className={cn(
                          'flex flex-col items-start gap-1 rounded-xl border border-line bg-surface-1 p-4 text-left transition-colors active:translate-y-px disabled:opacity-50',
                          r.tone
                        )}
                      >
                        <span className="flex w-full items-center justify-between">
                          <span className="text-[14px] font-medium text-fg">{r.label}</span>
                          <Kbd>{r.key}</Kbd>
                        </span>
                        <span className="text-[12.5px] text-fg-3">{r.hint}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
