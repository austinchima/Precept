import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BookmarkPlus, Check, Mic, RotateCcw, Sparkles, Square } from 'lucide-react';
import { api } from '../api';
import { BehavioralStory, MockInterviewEvaluation, MockQuestionResponse } from '../types';
import { useToast } from '../components/ui/Toast';
import PageShell from '../components/PageShell';
import { Button, Chip, Field, Input, Panel, Segmented, Select, Skeleton, Textarea } from '../components/ui/kit';
import { BehavioralStoryForm } from '../components/stories/BehavioralStoryForm';
import type { BehavioralStoryTemplate } from '../data/behavioralStoryTemplates';

type PromptMode = 'quick' | 'jd' | 'story';

const MODE_HELP: Record<PromptMode, string> = {
  quick: 'A behavioral or system design question for the role you enter.',
  jd: 'A question aimed at the requirements you paste.',
  story: 'A follow-up question built on one of your STAR stories.',
};

function formatTimer(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export default function MockInterview() {
  const toast = useToast();
  const reduce = useReducedMotion();

  const [promptMode, setPromptMode] = useState<PromptMode>('quick');
  const [roleTitle, setRoleTitle] = useState('Senior Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [userStories, setUserStories] = useState<BehavioralStory[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState('');

  const [questionData, setQuestionData] = useState<MockQuestionResponse | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<MockInterviewEvaluation | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [draftTemplate, setDraftTemplate] = useState<BehavioralStoryTemplate | null>(null);
  const [isSavedToBank, setIsSavedToBank] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    api
      .get<{ items: BehavioralStory[] }>('/api/behavioralstory')
      .then((res) => {
        if (res.items?.length) {
          setUserStories(res.items);
          setSelectedStoryId(res.items[0].id);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript + ' ';
      setTranscript(text.trim());
    };
    recognition.onerror = (err: any) => console.warn('Speech recognition event:', err);
    recognitionRef.current = recognition;
    return () => recognition.abort?.();
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    setRecordingSeconds(0);
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const handleGenerateQuestion = async () => {
    setIsGeneratingQuestion(true);
    setQuestionData(null);
    setEvaluation(null);
    setTranscript('');
    setAudioUrl(null);
    setIsSavedToBank(false);
    try {
      const payload: Record<string, string | undefined> = { roleTitle: roleTitle.trim() || undefined };
      if (promptMode === 'jd' && jobDescription.trim()) payload.jobDescription = jobDescription.trim();
      else if (promptMode === 'story' && selectedStoryId) payload.storyId = selectedStoryId;
      setQuestionData(await api.post<MockQuestionResponse>('/api/mockinterview/generate-question', payload));
    } catch (err: any) {
      console.error('Failed to generate mock question:', err);
      toast.error(err.message || 'Could not get a question. Try again.');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      setTranscript('');
      setAudioUrl(null);
      setEvaluation(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        setAudioUrl(URL.createObjectURL(new Blob(audioChunksRef.current, { type: 'audio/webm' })));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      toast.error('Microphone access was blocked. Allow it in your browser settings, or type your answer.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }
    setIsRecording(false);
  };

  const handleEvaluateAnswer = async () => {
    if (!transcript.trim() || !questionData) {
      toast.warning('Record or type an answer first.');
      return;
    }
    setIsEvaluating(true);
    try {
      setEvaluation(
        await api.post<MockInterviewEvaluation>('/api/mockinterview/evaluate', {
          question: questionData.question,
          category: questionData.category,
          answerTranscript: transcript,
        })
      );
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      toast.error(err.message || 'The answer could not be evaluated.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Save the user's own words as a draft STAR story; they complete the other sections themselves.
  const openSaveDraft = () => {
    if (!questionData) return;
    const title = questionData.question.length > 120 ? `${questionData.question.slice(0, 117)}...` : questionData.question;
    setDraftTemplate({ title, situation: transcript, task: '', action: '', result: '', tags: `${questionData.category}, mock interview` });
  };

  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const enter = reduce ? { opacity: 0 } : { opacity: 0, y: 14 };

  return (
    <PageShell
      dataTestId="mock-interview-page"
      width="narrow"
      title="Mock Interview"
      subtitle="Get a question, answer it out loud, then read feedback on structure and substance. Recordings stay in your browser."
      actions={<Button variant="secondary" to="/story-bank" iconRight={<ArrowRight size={16} />}>STAR Bank</Button>}
    >
      <Panel className="p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-medium text-fg">Choose a question</h2>
            <Segmented
              size="sm"
              ariaLabel="Question source"
              value={promptMode}
              onChange={setPromptMode}
              options={[
                { value: 'quick', label: 'Quick' },
                { value: 'jd', label: 'From a job post' },
                { value: 'story', label: 'From a story' },
              ]}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Role" htmlFor="mi-role">
              <Input id="mi-role" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Senior Frontend Engineer" />
            </Field>
            {promptMode === 'story' && (
              <Field label="Story" htmlFor="mi-story" help={userStories.length ? undefined : 'You have no STAR stories yet, so a general question is used.'}>
                <Select id="mi-story" value={selectedStoryId} onChange={(e) => setSelectedStoryId(e.target.value)} disabled={!userStories.length}>
                  {userStories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </Select>
              </Field>
            )}
          </div>
          {promptMode === 'jd' && (
            <Field label="Requirements" htmlFor="mi-jd" help="Paste the responsibilities or stack section of the posting.">
              <Textarea id="mi-jd" rows={4} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            </Field>
          )}
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-fg-3">{MODE_HELP[promptMode]}</p>
            <Button variant="primary" icon={<Sparkles size={16} />} loading={isGeneratingQuestion} disabled={isRecording} onClick={handleGenerateQuestion}>
              {questionData ? 'New question' : 'Get a question'}
            </Button>
          </div>
        </div>
      </Panel>

      {isGeneratingQuestion && <Skeleton className="h-48" />}

      <AnimatePresence>
        {questionData && (
          <motion.section key={questionData.question} initial={enter} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <Panel className="p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{questionData.category}</Chip>
                {questionData.focusArea && <Chip>{questionData.focusArea}</Chip>}
                {questionData.isDemoSample && <Chip tone="warning">Demo sample</Chip>}
              </div>
              <h2 className="mt-4 text-[20px] font-semibold leading-snug tracking-tight text-fg md:text-[23px]">{questionData.question}</h2>
              {questionData.contextTips && <p className="mt-3 text-[13.5px] leading-relaxed text-fg-2">{questionData.contextTips}</p>}

              <div className="mt-6 flex flex-col gap-4 rounded-xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {isRecording ? (
                    <Button variant="danger" icon={<Square size={14} />} onClick={stopRecording}>
                      Stop <span className="num">{formatTimer(recordingSeconds)}</span>
                    </Button>
                  ) : (
                    <Button variant="secondary" icon={<Mic size={16} />} onClick={startRecording}>Record answer</Button>
                  )}
                  {isRecording && (
                    <span className="flex items-center gap-2 text-[13px] text-fg-2" role="status">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:hidden" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
                      </span>
                      Listening
                    </span>
                  )}
                </div>
                {audioUrl && !isRecording && <audio src={audioUrl} controls className="h-9 w-full max-w-xs" aria-label="Your recorded answer" />}
              </div>

              <div className="mt-5">
                <Field label="Your answer" htmlFor="mi-answer" help={<span className="num">{wordCount} words. Edit the transcript before asking for feedback if it misheard you.</span>}>
                  <Textarea id="mi-answer" rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Speak, or type here." />
                </Field>
              </div>

              {transcript && !isRecording && (
                <Button variant="primary" size="lg" className="mt-5 w-full" loading={isEvaluating} onClick={handleEvaluateAnswer}>
                  {questionData.isDemoSample ? 'Show sample feedback' : 'Get feedback'}
                </Button>
              )}
            </Panel>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {evaluation && (
          <motion.section key="evaluation" initial={enter} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} aria-live="polite">
            <Panel>
              <div className="flex items-start justify-between gap-4 border-b border-line p-5 md:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold tracking-tight text-fg">{evaluation.isDemoSample ? 'Sample feedback' : 'Feedback'}</h2>
                    {evaluation.isHeuristic && (
                      <Chip tone="warning" data-testid="mock-heuristic-label">Offline heuristic, not an AI evaluation</Chip>
                    )}
                  </div>
                  {evaluation.deliveryFeedback && <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-fg-2">{evaluation.deliveryFeedback}</p>}
                </div>
                {!evaluation.isDemoSample && (
                  <div className="shrink-0 text-right">
                    <p className="num text-[34px] font-semibold leading-none tracking-tight text-fg">{evaluation.score}</p>
                    <p className="mt-1 text-[12px] text-fg-3">{evaluation.isHeuristic ? 'heuristic, out of 100' : 'out of 100'}</p>
                  </div>
                )}
              </div>

              <dl className="grid gap-px bg-line sm:grid-cols-2">
                {(['situation', 'task', 'action', 'result'] as const).map((k) => (
                  <div key={k} className="bg-surface-1 p-5">
                    <dt className="text-[12.5px] font-medium capitalize text-fg">{k}</dt>
                    <dd className="mt-1.5 text-[13.5px] leading-relaxed text-fg-2">{evaluation.starBreakdown?.[k] || 'No comment.'}</dd>
                  </div>
                ))}
              </dl>

              <div className="grid gap-6 border-t border-line p-5 md:grid-cols-2 md:p-6">
                <div>
                  <h3 className="text-[13px] font-medium text-fg">What worked</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {evaluation.strengths?.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-fg-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-accent-text" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[13px] font-medium text-fg">What to improve</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {evaluation.areasForImprovement?.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-fg-2">
                        <ArrowRight size={15} className="mt-0.5 shrink-0 text-fg-3" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {evaluation.modelAnswer && (
                <div className="border-t border-line p-5 md:p-6">
                  <h3 className="text-[13px] font-medium text-fg">Example answer</h3>
                  <p className="mt-1 text-[12.5px] text-fg-3">Written by the AI. Check every detail and number against your own work before using it.</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-fg-2">{evaluation.modelAnswer}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-line p-5 sm:flex-row sm:justify-between md:px-6">
                <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={handleGenerateQuestion}>Another question</Button>
                <Button
                  variant={isSavedToBank ? 'secondary' : 'primary'}
                  icon={isSavedToBank ? <Check size={16} /> : <BookmarkPlus size={16} />}
                  disabled={isSavedToBank}
                  onClick={openSaveDraft}
                >
                  {isSavedToBank ? 'Saved to STAR Bank' : 'Save my answer as a story'}
                </Button>
              </div>
            </Panel>
          </motion.section>
        )}
      </AnimatePresence>

      <BehavioralStoryForm
        open={!!draftTemplate}
        template={draftTemplate}
        onCancel={() => setDraftTemplate(null)}
        onSuccess={() => {
          setDraftTemplate(null);
          setIsSavedToBank(true);
          toast.success('Saved to your STAR Bank.');
        }}
      />
    </PageShell>
  );
}
