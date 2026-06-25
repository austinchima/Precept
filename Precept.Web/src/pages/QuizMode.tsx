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
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-accent-teal/10 border-t-accent-teal animate-spin" />
          <span className="font-mono text-sm text-accent-teal animate-pulse">Synchronizing Memory Cells...</span>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-6 text-center py-24">
        <div className="glass-panel rounded-2xl p-10 w-full max-w-[448px] flex flex-col items-center opacity-0 animate-fade-in-up">
          <div className="w-16 h-16 rounded-xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
            <i className="fa-solid fa-brain text-accent-teal text-2xl"></i>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Memory Grid Offline</h2>
          <p className="text-text-secondary text-sm mb-8 max-w-[65ch] leading-relaxed">
            The Story Bank contains no narratives. Please commit technical narratives to memory before initiating retrieval sequences.
          </p>
          <button 
            onClick={() => navigate('/story-bank')}
            className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i> Go to Story Bank
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white flex flex-col font-sans antialiased selection:bg-accent-teal/30 min-h-full">
      {/* Focus Mode Top Bar */}
      <header className="flex items-center justify-between px-6 md:px-12 h-20 border-b border-panel-border/30 sticky top-0 bg-dashboard-bg/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 text-text-secondary font-mono text-xs uppercase tracking-widest">
          <i className="fa-solid fa-brain text-accent-teal text-sm"></i>
          <span>Quiz Mode</span>
          <span className="text-text-secondary/30">—</span>
          <span className="text-accent-teal">{story.category}</span>
        </div>
        <button 
          onClick={() => {
            if (isRecording && recognitionRef.current) {
              recognitionRef.current.stop();
            }
            navigate('/story-bank');
          }}
          className="border border-panel-border/30 text-text-secondary hover:text-white hover:border-white/20 px-4 py-2 min-h-[44px] rounded-xl transition-all font-mono text-xs uppercase flex items-center justify-center gap-2 group cursor-pointer"
        >
          Exit Quiz
          <i className="fa-solid fa-xmark text-[10px] group-hover:text-[#f87171] transition-colors"></i>
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col items-center py-12 px-6 md:px-12 w-full">
        {/* Constrained Area for Focus */}
        <div className="w-full max-w-[840px] flex flex-col gap-8">
          {/* Phase 1 & 2 Composite Card */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden opacity-0 animate-fade-in-up">
            {/* Subtle Top Accent */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent-teal/20 via-accent-teal to-accent-teal/20"></div>
            
            {/* Technical Snippet Display */}
            <div className="bg-dashboard-bg/70 rounded-xl p-5 border border-panel-border/40 relative group shadow-inner">
              <div className="absolute top-2 right-4 text-text-secondary/40 font-mono text-[9px] uppercase tracking-wider select-none">
                {story.title}
              </div>
              <pre className="font-mono text-xs text-accent-teal overflow-x-auto custom-scrollbar pb-1 whitespace-pre-wrap">
                <code>{story.codeSnippet}</code>
              </pre>
            </div>

            {/* Prompt & User Input Area */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-white">Explain what this code does and why it exists. Speak or type your answer.</h2>
              <div className="relative">
                <textarea 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={phase === 'reveal'}
                  className="input-base w-full resize-y min-h-[140px] text-sm disabled:opacity-80" 
                  placeholder="A debouncer is used to..."
                />
                {/* Mic Button */}
                <button
                  onClick={toggleRecording}
                  disabled={phase === 'reveal'}
                  className={`absolute bottom-4 right-4 transition-all flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl border cursor-pointer ${
                    isRecording 
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                      : 'bg-white/5 text-text-secondary hover:text-accent-teal border-panel-border/30 hover:border-accent-teal/30 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  title={isRecording ? 'Listening (Click to Stop)' : 'Speak Answer'}
                >
                  <i className={`${isRecording ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone'} text-sm`}></i>
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
                  className="w-full inline-flex items-center justify-center px-4 py-3.5 min-h-[44px] rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-[1.02] transition-all duration-300 cursor-pointer gap-2"
                >
                  <i className="fa-solid fa-eye text-xs"></i>
                  Access Memory Context (Reveal Explanation)
                </button>
              </div>
            ) : (
              <>
                <hr className="border-panel-border/30 my-2"/>
                
                {/* Phase 2: Revealed Answer State */}
                <div className="flex flex-col gap-4 opacity-0 animate-fade-in-up">
                  <div className="flex items-center gap-2 text-accent-teal font-mono text-xs uppercase tracking-wider">
                    <i className="fa-solid fa-circle-check text-sm"></i>
                    Correct Explanation
                  </div>
                  <div className="text-sm text-text-secondary p-4 bg-dashboard-bg/50 border-l-2 border-accent-teal rounded-r-xl whitespace-pre-wrap leading-relaxed">
                    {story.explanation}
                  </div>
                </div>

                {/* Self Assessment Actions */}
                <div className="flex flex-col gap-3 bg-dashboard-bg/50 p-5 rounded-xl border border-panel-border/30 mt-2">
                  <div className="font-mono text-xs text-text-secondary uppercase tracking-wider text-center mb-2">Self Assessment</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Success Action */}
                    <button 
                      onClick={() => handleAssessment('Nailed it')}
                      className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-dashboard-bg py-3.5 min-h-[44px] rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2 group cursor-pointer hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      <i className="fa-solid fa-circle-check text-sm group-hover:scale-110 transition-transform"></i>
                      Nailed it
                    </button>
                    {/* Neutral Action */}
                    <button 
                      onClick={() => handleAssessment('Partial')}
                      className="bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:text-white py-3.5 min-h-[44px] rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2 group cursor-pointer"
                    >
                      <i className="fa-solid fa-minus text-sm group-hover:scale-110 transition-transform"></i>
                      Partial
                    </button>
                    {/* Warning/Error Action */}
                    <button 
                      onClick={() => handleAssessment('Blank panic')}
                      className="bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-dashboard-bg py-3.5 min-h-[44px] rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2 group cursor-pointer hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    >
                      <i className="fa-solid fa-triangle-exclamation text-sm group-hover:scale-110 transition-transform"></i>
                      Blank Panic
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Loop Continuation */}
          {phase === 'reveal' && (
            <div className="flex justify-end pt-2 opacity-0 animate-fade-in-up delay-200">
              <button 
                onClick={loadNextStory}
                className="inline-flex items-center justify-center px-6 py-3.5 min-h-[44px] rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2"
              >
                Next Random Story
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
