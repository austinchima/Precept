import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { MockQuestionResponse, MockInterviewEvaluation, BehavioralStory } from '../types';
import { useToast } from '../components/ui/Toast';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { C, cardStyle, Eyebrow } from '../components/stories/storyTheme';
import {
  Mic,
  MicOff,
  Sparkles,
  Play,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Brain,
  Volume2,
  BookmarkPlus,
  Loader2,
  Check,
  Award,
  ChevronRight,
  Briefcase,
  HelpCircle
} from 'lucide-react';

type PromptMode = 'jd' | 'story' | 'quick';

export default function MockInterview() {
  const navigate = useNavigate();
  const toast = useToast();

  // Mode & Inputs
  const [promptMode, setPromptMode] = useState<PromptMode>('quick');
  const [roleTitle, setRoleTitle] = useState('Senior Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [userStories, setUserStories] = useState<BehavioralStory[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');

  // Interview state
  const [questionData, setQuestionData] = useState<MockQuestionResponse | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<MockInterviewEvaluation | null>(null);

  // Recording & Transcript
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Saved state
  const [isSavedToBank, setIsSavedToBank] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Load user's stories for the "From Story Bank" option
  useEffect(() => {
    async function loadStories() {
      try {
        const res = await api.get<{ items: BehavioralStory[] }>('/api/behavioralstory');
        if (res.items && res.items.length > 0) {
          setUserStories(res.items);
          setSelectedStoryId(res.items[0].id);
        }
      } catch (e) {
        // Non-fatal
      }
    }
    loadStories();
  }, []);

  // Web Speech API for Browser Speech-to-Text
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition event:', err);
      };

      recognition.onend = () => {
        // Handled in stopRecording
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Timer while recording
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Clean up audio blob URL
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Generate question
  const handleGenerateQuestion = async () => {
    setIsGeneratingQuestion(true);
    setQuestionData(null);
    setEvaluation(null);
    setTranscript('');
    setAudioUrl(null);
    setIsSavedToBank(false);

    try {
      const payload: any = {
        roleTitle: roleTitle.trim() || undefined,
      };

      if (promptMode === 'jd' && jobDescription.trim()) {
        payload.jobDescription = jobDescription.trim();
      } else if (promptMode === 'story' && selectedStoryId) {
        payload.storyId = selectedStoryId;
      }

      const res = await api.post<MockQuestionResponse>('/api/mockinterview/generate-question', payload);
      setQuestionData(res);
    } catch (err: any) {
      console.error('Failed to generate mock question:', err);
      toast.error(err.message || 'Failed to generate question. Please try again.');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Start recording
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
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      recognitionRef.current?.start();
      setIsRecording(true);
      toast.info('Recording started. Speak clearly into your microphone.');
    } catch (err) {
      console.error('Microphone access error:', err);
      toast.error('Could not access microphone. Please grant browser permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  // Submit for AI evaluation
  const handleEvaluateAnswer = async () => {
    if (!transcript.trim() || !questionData) {
      toast.warning('Please record or type an answer before evaluating.');
      return;
    }

    setIsEvaluating(true);
    try {
      const res = await api.post<MockInterviewEvaluation>('/api/mockinterview/evaluate', {
        question: questionData.question,
        category: questionData.category,
        answerTranscript: transcript,
      });
      setEvaluation(res);
      toast.success('STAR Evaluation complete!');
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      toast.error(err.message || 'Failed to analyze answer.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Save to user's STAR Bank
  const handleSaveToStarBank = async () => {
    if (!evaluation || !questionData) return;
    setIsSaving(true);
    try {
      await api.post('/api/behavioralstory', {
        title: questionData.question.length > 80 ? `${questionData.question.substring(0, 77)}...` : questionData.question,
        situation: evaluation.starBreakdown.situation || 'Detailed situation from mock interview.',
        task: evaluation.starBreakdown.task || 'Target objective and problem.',
        action: evaluation.starBreakdown.action || 'Key actions taken.',
        result: evaluation.starBreakdown.result || 'Outcome and business metrics.',
        tags: `${questionData.category}, MockInterview`,
      });
      setIsSavedToBank(true);
      toast.success('Saved to your STAR Story Bank!');
    } catch (err: any) {
      console.error('Failed to save to story bank:', err);
      toast.error(err.message || 'Failed to save story.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="font-body min-h-full flex flex-col p-6 md:p-10 max-w-[1080px] mx-auto relative isolate" style={{ color: C.ink }}>
      {/* Background decoration */}
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-30 z-0" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-[50%] z-0"
        style={{
          background: `radial-gradient(closest-side, rgba(139,92,246,0.12), rgba(45,212,191,0.08) 45%, transparent 75%)`,
          filter: 'blur(10px)',
        }}
      />

      <AnimatedSection animation="fadeUp" className="relative z-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Eyebrow color={C.violet}>AI Voice Mock Interview</Eyebrow>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9.5px] uppercase tracking-wider" style={{ background: `${C.teal}18`, color: C.teal, border: `1px solid ${C.teal}33` }}>
                Gemini Flash Powered
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold tracking-tight" style={{ color: C.ink }}>
              Voice Interview <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>Simulator</span>
            </h1>
            <p className="mt-1.5 font-body text-[14.5px]" style={{ color: C.inkDim }}>
              Practice answering tough behavioral and technical questions out loud with instant speech-to-text and STAR feedback.
            </p>
          </div>

          <button
            onClick={() => navigate('/story-bank')}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer self-start md:self-auto transition-colors"
            style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}
          >
            View STAR Bank <ArrowRight size={12} />
          </button>
        </div>

        {/* Step 1: Configuration / Prompt Setup */}
        <div className="p-6 md:p-7 relative overflow-hidden" style={cardStyle()}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.hair }}>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: C.teal }}>
                Step 1 · Choose Interview Scenario
              </span>
              <div className="flex items-center gap-2">
                {(['quick', 'jd', 'story'] as PromptMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPromptMode(mode)}
                    className="px-3 py-1.5 rounded-full font-mono text-[10.5px] uppercase tracking-wider cursor-pointer transition-all"
                    style={
                      promptMode === mode
                        ? { background: C.teal, color: C.bg0, fontWeight: 600 }
                        : { background: 'rgba(255,255,255,0.03)', color: C.inkDim, border: `1px solid ${C.hair}` }
                    }
                  >
                    {mode === 'quick' ? '⚡ Quick Drill' : mode === 'jd' ? '📄 Job Description' : '⭐ Story Bank'}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Role Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10.5px] uppercase tracking-widest mb-1.5" style={{ color: C.inkDim }}>
                  Target Role / Title
                </label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer, Staff Architect..."
                  className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.hair}`, color: C.ink }}
                />
              </div>

              {promptMode === 'story' && (
                <div>
                  <label className="block font-mono text-[10.5px] uppercase tracking-widest mb-1.5" style={{ color: C.inkDim }}>
                    Select STAR Story to Drill
                  </label>
                  {userStories.length > 0 ? (
                    <select
                      value={selectedStoryId}
                      onChange={(e) => setSelectedStoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] focus:outline-none transition-colors"
                      style={{ background: C.bg2, border: `1px solid ${C.hair}`, color: C.ink }}
                    >
                      {userStories.map((s) => (
                        <option key={s.id} value={s.id} style={{ background: C.bg1 }}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs italic py-2" style={{ color: C.inkMute }}>
                      No STAR stories saved yet. Precept will use general leadership prompts.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Job Description Textarea */}
            {promptMode === 'jd' && (
              <div>
                <label className="block font-mono text-[10.5px] uppercase tracking-widest mb-1.5" style={{ color: C.inkDim }}>
                  Job Description / Requirements snippet
                </label>
                <textarea
                  rows={3}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste key responsibilities or tech stack requirements from the job posting..."
                  className="w-full p-3.5 rounded-xl font-body text-[13.5px] focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.hair}`, color: C.ink }}
                />
              </div>
            )}

            {/* Generate Question Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="font-body text-[12.5px]" style={{ color: C.inkDim }}>
                {promptMode === 'jd'
                  ? 'Generates questions targeting specific requirements in the JD.'
                  : promptMode === 'story'
                  ? 'Generates a behavioral follow-up based on your saved STAR story.'
                  : 'Fast random behavioral or system design challenge.'}
              </span>

              <button
                onClick={handleGenerateQuestion}
                disabled={isGeneratingQuestion || isRecording}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-all disabled:opacity-50"
                style={{
                  background: C.violet,
                  color: C.ink,
                  boxShadow: `0 0 20px rgba(139,92,246,0.35)`,
                }}
              >
                {isGeneratingQuestion ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> {questionData ? 'Generate New Question' : 'Start Mock Interview'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Question & Voice Recording */}
        {questionData && (
          <div className="p-6 md:p-8 relative overflow-hidden space-y-6" style={cardStyle()}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: C.violet }}>
                Step 2 · Candidate Answer
              </span>
              <span className="px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider" style={{ background: `${C.violet}14`, color: C.violet, border: `1px solid ${C.violet}33` }}>
                {questionData.category}
              </span>
            </div>

            {/* The Question Banner */}
            <div className="p-6 rounded-2xl" style={{ background: C.bg2, border: `1px solid ${C.hair2}` }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 mt-0.5" style={{ background: `${C.violet}22`, color: C.violet }}>
                  <HelpCircle size={20} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-xl md:text-2xl font-bold leading-snug" style={{ color: C.ink }}>
                    "{questionData.question}"
                  </h3>
                  {questionData.contextTips && (
                    <p className="font-body text-[13px] leading-relaxed flex items-center gap-1.5" style={{ color: C.inkDim }}>
                      <Brain size={14} style={{ color: C.teal }} />
                      <span><strong>Coach Tip:</strong> {questionData.contextTips}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Voice Recording Control Center */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.hair}` }}>
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-all"
                    style={{
                      background: C.rose,
                      color: C.bg0,
                      boxShadow: `0 0 20px rgba(244,63,94,0.4)`,
                    }}
                  >
                    <Mic size={16} /> Record Spoken Answer
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-all animate-pulse"
                    style={{
                      background: '#e11d48',
                      color: '#ffffff',
                      boxShadow: `0 0 25px rgba(225,29,72,0.6)`,
                    }}
                  >
                    <MicOff size={16} /> Stop Recording ({formatTimer(recordingSeconds)})
                  </button>
                )}

                {isRecording && (
                  <div className="flex items-center gap-2 text-rose-400 font-mono text-xs animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Listening & Transcribing...</span>
                  </div>
                )}
              </div>

              {/* Audio playback if recorded */}
              {audioUrl && !isRecording && (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Volume2 size={16} style={{ color: C.teal }} />
                  <audio src={audioUrl} controls className="h-9 max-w-full" />
                </div>
              )}
            </div>

            {/* Live Transcript Box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-[10.5px] uppercase tracking-widest" style={{ color: C.inkDim }}>
                  Spoken Answer Transcript (Editable)
                </label>
                <span className="font-mono text-[10px] text-slate-500">
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                rows={5}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your spoken words will appear here in real-time. You can also type or refine your answer directly before submitting."
                className="w-full p-4 rounded-xl font-body text-[14px] leading-relaxed focus:outline-none transition-colors"
                style={{ background: C.bg0, border: `1px solid ${C.hair}`, color: C.ink }}
              />
            </div>

            {/* Evaluate Button */}
            {transcript && !isRecording && (
              <button
                onClick={handleEvaluateAnswer}
                disabled={isEvaluating}
                className="w-full py-4 rounded-xl font-mono text-[12.5px] font-bold uppercase tracking-[0.16em] cursor-pointer transition-all flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${C.teal} 0%, #0d9488 100%)`,
                  color: C.bg0,
                  boxShadow: `0 0 30px rgba(45,212,191,0.35)`,
                }}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Evaluating STAR Methodology with Gemini...
                  </>
                ) : (
                  <>
                    <Award size={16} /> Evaluate My Answer with AI (STAR Analysis)
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Step 3: AI STAR Feedback & Scoring */}
        {evaluation && (
          <div className="p-6 md:p-8 relative overflow-hidden space-y-6" style={cardStyle()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: C.hair }}>
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: C.emerald }}>
                  Step 3 · AI Evaluation & STAR Breakdown
                </span>
                <h3 className="text-xl font-bold font-display mt-1" style={{ color: C.ink }}>
                  Performance Assessment
                </h3>
              </div>

              {/* Score Badge */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div
                  className="px-4 py-2 rounded-xl flex items-center gap-2 font-mono"
                  style={{
                    background: evaluation.score >= 80 ? `${C.emerald}1c` : `${C.amber}1c`,
                    border: `1px solid ${evaluation.score >= 80 ? C.emerald : C.amber}44`,
                    color: evaluation.score >= 80 ? C.emerald : C.amber,
                  }}
                >
                  <Award size={18} />
                  <span className="text-2xl font-bold">{evaluation.score}</span>
                  <span className="text-xs uppercase text-slate-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* Delivery Feedback */}
            {evaluation.deliveryFeedback && (
              <div className="p-4 rounded-xl" style={{ background: `${C.teal}0e`, border: `1px solid ${C.teal}33` }}>
                <span className="font-mono text-[10px] uppercase tracking-widest block mb-1" style={{ color: C.teal }}>
                  Delivery & Pacing Feedback
                </span>
                <p className="font-body text-[13.5px] leading-relaxed" style={{ color: C.ink }}>
                  {evaluation.deliveryFeedback}
                </p>
              </div>
            )}

            {/* STAR Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Situation', val: evaluation.starBreakdown?.situation, color: C.teal },
                { label: 'Task', val: evaluation.starBreakdown?.task, color: C.violet },
                { label: 'Action', val: evaluation.starBreakdown?.action, color: C.emerald },
                { label: 'Result', val: evaluation.starBreakdown?.result, color: C.rose },
              ].map(({ label, val, color }) => (
                <div key={label} className="p-4 rounded-xl" style={{ background: C.bg2, borderLeft: `3px solid ${color}`, border: `1px solid ${C.hair}` }}>
                  <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider block mb-1.5" style={{ color }}>
                    {label}
                  </span>
                  <p className="font-body text-[13px] leading-relaxed" style={{ color: C.inkDim }}>
                    {val || 'Detail provided in answer.'}
                  </p>
                </div>
              ))}
            </div>

            {/* Strengths & Areas to Improve */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-5 rounded-xl" style={{ background: C.bg2, border: `1px solid ${C.hair}` }}>
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: C.emerald }}>
                  <CheckCircle2 size={14} /> Strengths
                </div>
                <ul className="space-y-2">
                  {evaluation.strengths?.map((str, idx) => (
                    <li key={idx} className="font-body text-[13px] flex items-start gap-2" style={{ color: C.inkDim }}>
                      <span className="text-emerald-400 mt-1">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas for Improvement */}
              <div className="p-5 rounded-xl" style={{ background: C.bg2, border: `1px solid ${C.hair}` }}>
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: C.amber }}>
                  <AlertCircle size={14} /> Key Opportunities to Refine
                </div>
                <ul className="space-y-2">
                  {evaluation.areasForImprovement?.map((imp, idx) => (
                    <li key={idx} className="font-body text-[13px] flex items-start gap-2" style={{ color: C.inkDim }}>
                      <span className="text-amber-400 mt-1">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggested Model Answer */}
            {evaluation.modelAnswer && (
              <div className="p-5 rounded-xl" style={{ background: `${C.violet}10`, border: `1px solid ${C.violet}33` }}>
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest block mb-2" style={{ color: C.violet }}>
                  💡 Suggested Model STAR Answer (90 Seconds)
                </span>
                <p className="font-body text-[13.5px] leading-relaxed italic" style={{ color: C.ink }}>
                  "{evaluation.modelAnswer}"
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: C.hair }}>
              <button
                onClick={handleGenerateQuestion}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.16em] cursor-pointer transition-colors"
                style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}
              >
                <RotateCcw size={13} /> Try Another Question
              </button>

              <button
                onClick={handleSaveToStarBank}
                disabled={isSaving || isSavedToBank}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-all disabled:opacity-75"
                style={{
                  background: isSavedToBank ? `${C.emerald}22` : C.teal,
                  color: isSavedToBank ? C.emerald : C.bg0,
                  border: isSavedToBank ? `1px solid ${C.emerald}55` : 'none',
                }}
              >
                {isSavedToBank ? (
                  <>
                    <Check size={14} /> Saved in STAR Bank
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={14} /> Save to STAR Bank
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
