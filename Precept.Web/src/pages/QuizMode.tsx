import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Story, ConfidenceLevel } from '../types';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';

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
  
  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const navigate = useNavigate();

  const loadNextStory = async () => {
    setIsLoading(true);
    setPhase('prompt');
    setUserAnswer('');
    try {
      const data = await api.get<Story>('/api/story/quiz');
      if (data && data.id) {
        setStory(data);
      } else {
        setStory(null);
      }
    } catch (err) {
      console.error('Quiz story fetch failed:', err);
      setStory(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNextStory();
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const resultText = event.results[event.results.length - 1][0].transcript;
        setUserAnswer(prev => prev + (prev ? ' ' : '') + resultText);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.warning('Voice transcription is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleAssessment = async (result: 'Nailed it' | 'Partial' | 'Blank panic') => {
    if (!story) return;

    let targetConfidence: ConfidenceLevel = story.confidenceLevel;
    if (result === 'Nailed it') {
      targetConfidence = getIncrementedConfidence(story.confidenceLevel);
    } else if (result === 'Partial') {
      targetConfidence = getDecrementedConfidence(story.confidenceLevel);
    } else if (result === 'Blank panic') {
      targetConfidence = 'Panic';
    }

    setIsLoading(true);
    try {
      await api.patch(`/api/story/${story.id}/confidence`, { confidenceLevel: targetConfidence });
      await loadNextStory();
    } catch (err) {
      console.error('Failed to submit confidence assessment:', err);
      toast.error((err as Error).message || 'Failed to save assessment. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading && !story) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center font-code text-sm text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
          <span>Synchronizing Memory Cells...</span>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container border border-outline-variant text-primary flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[32px]">psychology</span>
        </div>
        <h2 className="text-2xl font-h3 font-bold text-on-surface mb-2">Memory Grid Offline</h2>
        <p className="text-on-surface-variant font-code text-sm max-w-prose mb-8">
          The Story Bank contains no narratives. Please commit technical narratives to memory before initiating retrieval sequences.
        </p>
        <button 
          onClick={() => navigate('/story-bank')}
          className="bg-primary-container text-on-primary-fixed font-code text-code py-sm px-lg rounded hover:bg-primary transition-all flex items-center gap-2 cursor-pointer"
        >
          Go to Story Bank
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container/30">
      {/* Minimal Top Bar (Focus Mode - Suppresses standard nav) */}
      <header className="flex items-center justify-between px-md md:px-margin h-20 border-b border-outline-variant/30 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-sm text-on-surface-variant font-label-caps text-label-caps uppercase tracking-widest">
          <span className="material-symbols-outlined text-[18px]">quiz</span>
          Quiz Mode — Category: {story.category}
        </div>
        <button 
          onClick={() => {
            if (isRecording && recognitionRef.current) {
              recognitionRef.current.stop();
            }
            navigate('/story-bank');
          }}
          className="border border-outline-variant text-on-surface hover:bg-surface-variant px-md py-sm rounded transition-colors font-label-caps text-label-caps flex items-center gap-2 group cursor-pointer"
        >
          Exit Quiz
          <span className="material-symbols-outlined text-[16px] group-hover:text-error transition-colors">close</span>
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col items-center py-xl px-md md:px-margin w-full">
        {/* Constrained Area for Focus */}
        <div className="w-full max-w-[840px] flex flex-col gap-lg">
          {/* Phase 1 & 2 Composite Card */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md md:p-lg flex flex-col gap-lg relative overflow-hidden">
            {/* Subtle Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary-container/20 via-primary-container to-primary-container/20"></div>
            
            {/* Technical Snippet Display */}
            <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/50 relative group">
              <div className="absolute top-sm right-md text-on-surface-variant/50 font-label-caps text-label-caps uppercase select-none">
                {story.title}
              </div>
              <pre className="font-code text-code text-primary-fixed overflow-x-auto scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-transparent pb-xs whitespace-pre-wrap">
                <code>{story.codeSnippet}</code>
              </pre>
            </div>

            {/* Prompt & User Input Area */}
            <div className="flex flex-col gap-md">
              <h2 className="font-h3 text-h3 text-on-surface">Explain what this code does and why it exists. Speak or type your answer.</h2>
              <div className="relative">
                <textarea 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={phase === 'reveal'}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-md font-body-md text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none resize-y min-h-[140px] transition-all placeholder:text-on-surface-variant/50 disabled:opacity-85" 
                  placeholder="A debouncer is used to..."
                />
                {/* Mic Button */}
                <button
                  onClick={toggleRecording}
                  disabled={phase === 'reveal'}
                  className={`absolute bottom-md right-md transition-colors flex items-center justify-center w-8 h-8 rounded-full border-none cursor-pointer ${
                    isRecording 
                      ? 'bg-rose-500/20 text-rose-400 animate-pulse' 
                      : 'bg-surface-variant text-on-surface-variant hover:text-primary-container disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  title={isRecording ? 'Listening (Click to Stop)' : 'Speak Answer'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isRecording ? 'mic_off' : 'mic'}
                  </span>
                </button>
              </div>
            </div>

            {phase === 'prompt' ? (
              <div className="pt-2">
                <button 
                  onClick={() => {
                    if (isRecording && recognitionRef.current) {
                      recognitionRef.current.stop();
                    }
                    setPhase('reveal');
                  }}
                  className="w-full bg-primary-container text-on-primary-container hover:bg-primary-fixed-dim font-code text-code py-sm px-md rounded hover:opacity-95 transition-all flex items-center justify-center gap-sm cursor-pointer"
                >
                  Access Memory Context (Reveal Explanation)
                </button>
              </div>
            ) : (
              <>
                <hr className="border-outline-variant/30 my-sm"/>
                
                {/* Phase 2: Revealed Answer State */}
                <div className="flex flex-col gap-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-sm text-primary-fixed font-label-caps text-label-caps uppercase">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Correct Explanation
                  </div>
                  <div className="text-body-lg text-on-surface-variant font-body-lg p-md bg-surface-container/50 border-l-2 border-primary-container rounded-r-lg whitespace-pre-wrap">
                    {story.explanation}
                  </div>
                </div>

                {/* Self Assessment Actions */}
                <div className="flex flex-col gap-sm bg-surface-container-lowest p-md rounded-lg border border-outline-variant/30 mt-sm">
                  <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest text-center mb-sm">Self Assessment</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    {/* Success Action */}
                    <button 
                      onClick={() => handleAssessment('Nailed it')}
                      className="bg-primary-container/10 border border-primary-container/40 text-primary-container hover:bg-primary-container hover:text-on-primary-container py-sm rounded-lg font-label-caps text-label-caps transition-all flex justify-center items-center gap-2 group cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">check_circle</span>
                      Nailed it
                    </button>
                    {/* Neutral Action */}
                    <button 
                      onClick={() => handleAssessment('Partial')}
                      className="bg-surface-variant border border-outline-variant text-on-surface hover:bg-outline-variant py-sm rounded-lg font-label-caps text-label-caps transition-all flex justify-center items-center gap-2 group cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">horizontal_rule</span>
                      Partial
                    </button>
                    {/* Warning/Error Action */}
                    <button 
                      onClick={() => handleAssessment('Blank panic')}
                      className="bg-error-container/10 border border-error/40 text-error hover:bg-error hover:text-on-error py-sm rounded-lg font-label-caps text-label-caps transition-all flex justify-center items-center gap-2 group cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">warning</span>
                      Blank Panic
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Loop Continuation */}
          {phase === 'reveal' && (
            <div className="flex justify-end pt-md">
              <button 
                onClick={loadNextStory}
                className="bg-primary-container text-on-primary-container px-lg py-md rounded-lg font-label-caps text-label-caps uppercase tracking-widest hover:bg-primary-fixed transition-colors flex items-center gap-sm shadow-[0_0_20px_rgba(50,185,200,0.15)] hover:shadow-[0_0_25px_rgba(50,185,200,0.3)] cursor-pointer border-none"
              >
                Next Random Story
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
