import React, { useState } from 'react';
import { api } from '../api';
import { GoogleGenAI } from '@google/genai';

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
  
  // Input fields
  const [company, setCompany] = useState('Stripe');
  const [role, setRole] = useState('Frontend Engineer');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState(
    'We are looking for a Frontend Engineer with strong experience in React, TypeScript, and modern state management. You should be familiar with REST APIs, GraphQL, and CI/CD pipelines...'
  );
  
  // Gemini API Key state
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('precept_gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  
  // Fallback manual keywords
  const [useManualKeywords, setUseManualKeywords] = useState(false);
  const [manualKeywords, setManualKeywords] = useState('React, TypeScript, REST APIs, CI/CD, Frontend, GraphQL, WebRTC');

  const activeApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || customApiKey;

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('precept_gemini_api_key', customApiKey.trim());
    setShowKeyInput(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResults(null);
    
    let extracted: string[] = [];

    try {
      if (useManualKeywords || !activeApiKey) {
        extracted = manualKeywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);
      } else {
        // Execute Gemini Extraction
        const ai = new GoogleGenAI({ apiKey: activeApiKey });
        const prompt = `
          You are an expert technical recruiter. Analyze the following job description and extract a flat list of technical skills, frameworks, tools, databases, and methodologies as single keywords (e.g. "React", "TypeScript", "EF Core", "Docker").
          Return ONLY a JSON array of strings. Do not include any markdown formatting, backticks, or surrounding text.
          
          Job Description:
          ${jdText}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']') + 1;
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          extracted = JSON.parse(text.substring(jsonStart, jsonEnd));
        } else {
          extracted = text
            .replace(/[\[\]"]/g, '')
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        }
      }

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
      alert('Failed to execute analysis. Please check your API key or network connection.');
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
      alert(`Successfully added application pipeline for ${results.companyName}!`);
    } catch (err) {
      console.error('Failed to create application from JD:', err);
      alert('Failed to add to applications pipeline.');
    } finally {
      setIsAdding(false);
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 50) return 'text-primary';
    return 'text-error';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 80) {
      return (
        <p className="font-body-md text-body-md text-on-surface">
          Strong core match. Perfect technical fit. <span className="text-primary font-code">Recommended: Apply.</span>
        </p>
      );
    }
    if (score >= 50) {
      return (
        <p className="font-body-md text-body-md text-on-surface">
          Moderate compatibility. Missing components are learnable. <span className="text-primary font-code">Recommended: Apply.</span>
        </p>
      );
    }
    return (
      <p className="font-body-md text-body-md text-on-surface">
        Low compatibility. Significant skill gaps detected. <span className="text-error font-code">Recommended: Review.</span>
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-xl fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">Analysis Engine</span>
            <div className="h-[1px] w-12 bg-primary/30"></div>
          </div>
          <h2 className="font-h2 text-h2 text-on-surface">JD Matcher</h2>
          <p className="font-code text-code text-on-surface-variant mt-sm max-w-2xl">
            Paste a job description to instantly align your skills, identify gaps, and generate optimized resume bullets tailored to the specific role.
          </p>
        </div>

        <button 
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="border border-outline-variant text-on-surface hover:bg-surface-variant px-md py-sm rounded transition-colors font-label-caps text-label-caps flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">vpn_key</span>
          {activeApiKey ? 'Update Key' : 'Configure Gemini'}
        </button>
      </div>

      {/* API Key Panel */}
      {showKeyInput && (
        <div className="bg-surface-container border border-outline-variant rounded-lg p-md animate-in slide-in-from-top-8 duration-200">
          <form onSubmit={handleSaveApiKey} className="flex flex-col gap-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-label-caps text-label-caps text-primary uppercase">Gemini Protocol Authentication</h3>
              <button 
                type="button" 
                onClick={() => setShowKeyInput(false)}
                className="text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <p className="font-code text-code text-on-surface-variant">
              Input a Gemini API Key from Google AI Studio. This enables automated keyword parsing of JDs.
            </p>
            <div className="flex gap-sm">
              <div className="tech-border-focus rounded bg-surface-container-low border border-outline-variant p-[1px] flex-1">
                <input 
                  type="password" 
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-code text-code px-sm py-xs"
                  placeholder="AIzaSy..."
                />
              </div>
              <button 
                type="submit" 
                className="bg-primary-container text-on-primary-fixed font-code text-code px-md py-xs rounded hover:bg-primary transition-colors cursor-pointer border-none"
              >
                Save Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: Input (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-md">
          <div className="bg-surface-container border border-outline-variant p-md rounded-lg flex flex-col gap-md">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
              <span class="material-symbols-outlined text-primary">document_scanner</span>
              Analyze Job Description
            </h3>
            
            {/* Metadata Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant">Company Name</label>
                <div className="tech-border-focus rounded bg-surface-container-low border border-outline-variant p-[1px]">
                  <input 
                    type="text" 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-code text-code px-sm py-xs"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant">Role Title</label>
                <div className="tech-border-focus rounded bg-surface-container-low border border-outline-variant p-[1px]">
                  <input 
                    type="text" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-code text-code px-sm py-xs"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-label-caps text-on-surface-variant">Job URL (Optional)</label>
              <div className="tech-border-focus rounded bg-surface-container-low border border-outline-variant p-[1px] flex items-center">
                <span className="material-symbols-outlined text-outline-variant pl-sm text-[18px]">link</span>
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-code text-code px-sm py-xs"
                  placeholder="https://careers.company.com/jobs/..."
                />
              </div>
            </div>
            
            {/* JD Textarea */}
            <div className="flex flex-col gap-xs min-h-[300px]">
              <div className="flex justify-between items-end">
                <label className="font-label-caps text-label-caps text-on-surface-variant">Paste JD Text</label>
                <span className="font-code text-[10px] text-outline-variant">~{jdText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div className="tech-border-focus rounded bg-surface-container-low border border-outline-variant p-[1px] flex-1">
                <textarea 
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  className="w-full h-full bg-transparent border-none focus:ring-0 text-on-surface font-body-md text-body-md p-sm resize-none min-h-[260px]" 
                  placeholder="Paste the full job description here..."
                />
              </div>
            </div>

            {/* Fallback Option Toggle */}
            <div className="flex flex-col gap-2 p-4 bg-surface-container-low border border-outline-variant rounded-lg">
              <label className="flex items-center gap-2 font-code text-code text-on-surface-variant cursor-pointer hover:text-on-surface select-none">
                <input 
                  type="checkbox" 
                  checked={useManualKeywords || !activeApiKey} 
                  disabled={!activeApiKey}
                  onChange={(e) => setUseManualKeywords(e.target.checked)}
                  className="accent-primary"
                />
                Use manual keywords fallback {!activeApiKey && '(No API Key configured)'}
              </label>
              {(useManualKeywords || !activeApiKey) && (
                <div className="tech-border-focus rounded bg-surface-container border border-outline-variant p-[1px] mt-1">
                  <input 
                    type="text" 
                    value={manualKeywords}
                    onChange={(e) => setManualKeywords(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-code text-code px-sm py-xs"
                    placeholder="Enter keywords separated by commas..."
                  />
                </div>
              )}
            </div>
            
            {/* Action */}
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jdText.trim()}
              className="w-full bg-primary-container text-on-primary-fixed font-code text-code py-sm px-md rounded hover:bg-primary transition-colors flex items-center justify-center gap-sm mt-sm group cursor-pointer border-none"
            >
              <span className="material-symbols-outlined">bolt</span>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Description'}
            </button>
          </div>
        </div>
        
        {/* Right Column: Analysis Output (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-md">
          {isAnalyzing && (
            <div className="bg-surface-container border border-outline-variant rounded-lg p-md flex flex-col items-center justify-center min-h-[400px] text-primary">
              <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin mb-4" />
              <p className="font-code text-code uppercase tracking-wider animate-pulse">Running Match Vectors...</p>
            </div>
          )}

          {!results && !isAnalyzing && (
            <div className="bg-surface-container border border-outline-variant rounded-lg p-md flex flex-col items-center justify-center min-h-[400px] text-on-surface-variant text-center gap-sm">
              <span className="material-symbols-outlined text-[48px] opacity-50 text-primary">percent</span>
              <p className="font-code text-code uppercase tracking-wider">Awaiting Analysis Parameters</p>
              <p className="text-sm max-w-[320px] leading-normal">
                Configure your Gemini protocol or toggle manual keywords, paste a JD, and execute analysis.
              </p>
            </div>
          )}

          {results && !isAnalyzing && (
            <>
              {/* Match Score Card */}
              <div className="bg-surface-container border border-outline-variant p-md rounded-lg flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-[inset_0_0_20px_rgba(50,185,200,0.1)] transition-all duration-300">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase self-start mb-md">Match Analysis</h4>
                
                <div className="relative w-48 h-48 mb-md">
                  <svg className={`circular-chart w-full h-full ${getScoreColorClass(results.yourMatchScore || 0)}`} viewBox="0 0 36 36">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                    <path 
                      className="circle stroke-current" 
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      strokeDasharray={`${results.yourMatchScore || 0}, 100`}
                    ></path>
                    <text className="percentage" x="18" y="20.35">{results.yourMatchScore || 0}%</text>
                  </svg>
                </div>
                
                <div className="text-center bg-surface-container-high/50 p-sm rounded border border-outline-variant/30 w-full">
                  {getScoreDescription(results.yourMatchScore || 0)}
                </div>
              </div>
              
              {/* Keyword Extraction Card */}
              <div className="bg-surface-container border border-outline-variant p-md rounded-lg flex flex-col gap-md flex-1">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center justify-between">
                  Keyword Match
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                </h4>
                
                {/* Matched */}
                <div className="flex flex-col gap-sm">
                  <span className="font-code text-code text-on-surface-variant border-b border-outline-variant pb-xs flex items-center gap-xs">
                    <span className="material-symbols-outlined text-primary text-[14px]">check_circle</span>
                    Matched Skills ({results.extractedKeyWords.length - results.missingKeyWords.length})
                  </span>
                  <div className="flex flex-wrap gap-xs">
                    {results.extractedKeyWords
                      .filter(kw => !results.missingKeyWords.some(m => m.toLowerCase() === kw.toLowerCase()))
                      .map(kw => (
                        <span key={kw} className="px-sm py-xs bg-primary/10 text-primary border border-primary/20 rounded-full font-code text-[12px] flex items-center gap-xs">
                          {kw}
                        </span>
                      ))}
                    {results.extractedKeyWords.length === results.missingKeyWords.length && (
                      <span className="text-xs font-code text-on-surface-variant italic">No matched capabilities.</span>
                    )}
                  </div>
                </div>
                
                {/* Missing */}
                <div className="flex flex-col gap-sm mt-sm">
                  <span className="font-code text-code text-on-surface-variant border-b border-outline-variant pb-xs flex items-center gap-xs">
                    <span className="material-symbols-outlined text-error text-[14px]">cancel</span>
                    Missing / Gap ({results.missingKeyWords.length})
                  </span>
                  <div className="flex flex-wrap gap-xs">
                    {results.missingKeyWords.map(kw => (
                      <span key={kw} className="px-sm py-xs bg-error/10 text-error border border-error/20 rounded-full font-code text-[12px] opacity-80">
                        {kw}
                      </span>
                    ))}
                    {results.missingKeyWords.length === 0 && (
                      <span className="text-xs font-code text-primary italic">No skill gaps! Perfect match.</span>
                    )}
                  </div>
                </div>
                
                {/* Action Secondary */}
                <button 
                  onClick={handleAddToApplications}
                  disabled={isAdding}
                  className="mt-auto w-full border border-outline-variant text-on-surface font-code text-code py-sm px-md rounded hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-sm cursor-pointer bg-transparent"
                >
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                  {isAdding ? 'Adding...' : 'Add to Applications'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
