"use client";

import { useState } from "react";

type Rubric = {
  score: number;
  reason: string;
};

type Candidate = {
  id: number;
  name: string;
  text: string;
  similarity?: number;
  matchLevel?: string;
  overallScore?: number;
  recommendation?: string;
  summary?: string;
  rubric?: {
    skills: Rubric;
    experience: Rubric;
    education: Rubric;
    projects: Rubric;
    communication: Rubric;
  };
};

const recommendationConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  Hire:   { label: "HIRE",   color: "#00c97a", bg: "rgba(0,201,122,0.08)",  dot: "#00c97a" },
  Maybe:  { label: "MAYBE",  color: "#f5a623", bg: "rgba(245,166,35,0.08)", dot: "#f5a623" },
  Reject: { label: "REJECT", color: "#ff4d4d", bg: "rgba(255,77,77,0.08)",  dot: "#ff4d4d" },
};

const rubricLabels: Record<string, string> = {
  skills: "Skills Match",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  communication: "Communication",
};

const rubricWeights: Record<string, number> = {
  skills: 30,
  experience: 25,
  education: 15,
  projects: 20,
  communication: 10,
};

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [manualText, setManualText] = useState("");
  const [expandedRubric, setExpandedRubric] = useState<number | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = 10 - candidates.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("doc", file);
      const response = await fetch("/api/extract-doc", { method: "POST", body: formData });
      const data = await response.json();
      if (data.success) {
        setCandidates((prev) => [...prev, { id: Date.now() + Math.random(), name: file.name, text: data.text }]);
      }
    }
  };

  const handleAddText = () => {
    if (!manualText.trim()) return;
    setCandidates((prev) => [...prev, { id: Date.now(), name: `Candidate ${prev.length + 1}`, text: manualText }]);
    setManualText("");
    setShowModal(false);
  };

  const removeCandidate = (id: number) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setAnalyzed(false);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          candidates: candidates.map((c) => ({ id: c.id, name: c.name, text: c.text })),
        }),
      });
      const data = await res.json();
      setCandidates(data.rankedCandidates);
      setAnalyzed(true);
      setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const rankedResults = candidates.filter((c) => c.overallScore !== undefined);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0f;
          color: #e8e8f0;
          font-family: 'DM Mono', monospace;
          min-height: 100vh;
        }

        .page {
          max-width: 860px;
          margin: 0 auto;
          padding: 60px 24px 120px;
        }

        /* HEADER */
        .header {
          margin-bottom: 56px;
        }
        .header-eyebrow {
          font-size: 11px;
          letter-spacing: 0.3em;
          color: #5a5a7a;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .header-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #e8e8f0 30%, #5a5aff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header-sub {
          margin-top: 14px;
          font-size: 13px;
          color: #4a4a6a;
          letter-spacing: 0.05em;
        }

        /* SECTION LABEL */
        .section-label {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #3a3a5a;
          margin-bottom: 10px;
        }

        /* JD TEXTAREA */
        .jd-wrap {
          margin-bottom: 40px;
        }
        .jd-box {
          width: 100%;
          background: #111118;
          border: 1px solid #1e1e2e;
          border-radius: 12px;
          padding: 20px;
          color: #c8c8e0;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          resize: vertical;
          min-height: 160px;
          outline: none;
          transition: border-color 0.2s;
          line-height: 1.7;
        }
        .jd-box:focus { border-color: #5a5aff; }
        .jd-box::placeholder { color: #2e2e4e; }

        /* UPLOAD STRIP */
        .upload-strip {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }
        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.05em;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
          font-weight: 500;
        }
        .upload-btn-pdf {
          background: rgba(255,77,77,0.1);
          border-color: rgba(255,77,77,0.25);
          color: #ff7a7a;
        }
        .upload-btn-pdf:hover { background: rgba(255,77,77,0.18); border-color: #ff4d4d; }
        .upload-btn-doc {
          background: rgba(90,90,255,0.1);
          border-color: rgba(90,90,255,0.25);
          color: #8a8aff;
        }
        .upload-btn-doc:hover { background: rgba(90,90,255,0.18); border-color: #5a5aff; }
        .upload-btn-text {
          background: rgba(0,201,122,0.08);
          border-color: rgba(0,201,122,0.2);
          color: #00c97a;
        }
        .upload-btn-text:hover { background: rgba(0,201,122,0.15); border-color: #00c97a; }
        .upload-btn svg { width: 14px; height: 14px; }

        /* CANDIDATES QUEUE */
        .queue-section { margin-bottom: 40px; }
        .queue-grid { display: flex; flex-direction: column; gap: 8px; }
        .queue-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #111118;
          border: 1px solid #1a1a2a;
          border-radius: 10px;
          padding: 14px 18px;
          transition: border-color 0.2s;
        }
        .queue-item:hover { border-color: #2a2a4a; }
        .queue-item-left { display: flex; align-items: center; gap: 12px; }
        .queue-num {
          font-size: 10px;
          color: #3a3a5a;
          width: 20px;
          text-align: right;
        }
        .queue-icon {
          width: 32px; height: 32px;
          background: #1a1a2a;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        }
        .queue-name { font-size: 13px; color: #c8c8e0; }
        .queue-size { font-size: 11px; color: #3a3a5a; margin-top: 2px; }
        .remove-btn {
          background: none;
          border: none;
          color: #3a3a5a;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 2px 6px;
          border-radius: 4px;
          transition: color 0.2s;
          font-family: 'DM Mono', monospace;
        }
        .remove-btn:hover { color: #ff4d4d; }

        /* ANALYZE BUTTON */
        .analyze-wrap { margin-bottom: 80px; }
        .analyze-btn {
          width: 100%;
          padding: 18px;
          background: #5a5aff;
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.2s;
        }
        .analyze-btn:hover:not(:disabled) { background: #6e6eff; transform: translateY(-1px); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .analyze-btn-loading {
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* RESULTS SECTION */
        .results-section { margin-top: 16px; }
        .results-heading {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
          color: #e8e8f0;
        }
        .results-meta {
          font-size: 12px;
          color: #3a3a5a;
          margin-bottom: 32px;
          letter-spacing: 0.05em;
        }
        .results-grid { display: flex; flex-direction: column; gap: 16px; }

        /* RESULT CARD */
        .result-card {
          background: #0f0f1a;
          border: 1px solid #1a1a2e;
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .result-card:hover { border-color: #2a2a4a; }
        .result-card-top {
          padding: 24px 28px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .result-rank {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #3a3a5a;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .result-name {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #e8e8f0;
          margin-bottom: 8px;
          word-break: break-word;
        }
        .result-summary {
          font-size: 12px;
          color: #5a5a7a;
          line-height: 1.7;
          max-width: 520px;
        }
        .result-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }
        .score-circle {
          width: 72px; height: 72px;
          border-radius: 50%;
          border: 2px solid #1e1e3a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .score-num {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          line-height: 1;
        }
        .score-label {
          font-size: 9px;
          color: #3a3a5a;
          letter-spacing: 0.1em;
          margin-top: 2px;
        }
        .rec-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
        }
        .rec-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }

        /* PROGRESS BAR */
        .progress-wrap {
          padding: 0 28px 20px;
        }
        .progress-track {
          width: 100%;
          height: 3px;
          background: #1a1a2a;
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 1s cubic-bezier(0.4,0,0.2,1);
        }

        /* RUBRIC TOGGLE */
        .rubric-toggle {
          padding: 0 28px 20px;
        }
        .rubric-btn {
          background: none;
          border: 1px solid #1e1e2e;
          color: #4a4a6a;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          padding: 7px 14px;
          border-radius: 6px;
          cursor: pointer;
          letter-spacing: 0.08em;
          transition: all 0.2s;
        }
        .rubric-btn:hover { border-color: #3a3a5a; color: #8a8aaa; }

        /* RUBRIC PANEL */
        .rubric-panel {
          border-top: 1px solid #1a1a2a;
          padding: 20px 28px 24px;
        }
        .rubric-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 0;
          border-bottom: 1px solid #111120;
        }
        .rubric-row:last-child { border-bottom: none; }
        .rubric-cat {
          font-size: 11px;
          color: #4a4a6a;
          width: 120px;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }
        .rubric-weight {
          font-size: 10px;
          color: #2a2a4a;
          width: 28px;
          flex-shrink: 0;
          text-align: right;
        }
        .rubric-bar-wrap {
          flex: 1;
          height: 4px;
          background: #1a1a2a;
          border-radius: 99px;
          overflow: hidden;
        }
        .rubric-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: #5a5aff;
        }
        .rubric-score {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #c8c8e0;
          width: 28px;
          text-align: right;
          flex-shrink: 0;
        }
        .rubric-reason {
          font-size: 11px;
          color: #3a3a5a;
          margin-top: 3px;
          padding-left: 162px;
          line-height: 1.5;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 999;
          padding: 24px;
        }
        .modal-box {
          background: #0f0f1a;
          border: 1px solid #1e1e2e;
          border-radius: 16px;
          width: 100%; max-width: 500px;
          padding: 28px;
        }
        .modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #e8e8f0;
          margin-bottom: 16px;
        }
        .modal-textarea {
          width: 100%;
          background: #080810;
          border: 1px solid #1a1a2a;
          border-radius: 10px;
          padding: 16px;
          color: #c8c8e0;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          min-height: 180px;
          resize: vertical;
          outline: none;
          line-height: 1.7;
          margin-bottom: 16px;
        }
        .modal-textarea:focus { border-color: #5a5aff; }
        .modal-textarea::placeholder { color: #2a2a4a; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .modal-cancel {
          background: none;
          border: 1px solid #1e1e2e;
          color: #4a4a6a;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          padding: 9px 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-cancel:hover { border-color: #3a3a5a; color: #8a8aaa; }
        .modal-submit {
          background: #5a5aff;
          border: none;
          color: #fff;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          padding: 9px 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .modal-submit:hover { background: #6e6eff; }

        /* EMPTY STATE */
        .empty-state {
          border: 1px dashed #1a1a2a;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          color: #2a2a4a;
          font-size: 12px;
          letter-spacing: 0.05em;
          margin-bottom: 40px;
        }

        /* DIVIDER */
        .divider {
          border: none;
          border-top: 1px solid #111120;
          margin: 48px 0;
        }
      `}</style>

      <div className="page">
        {/* HEADER */}
        <div className="header">
          
          <h1 className="header-title">AI HR Agent</h1>
          <p className="header-sub">Powered by RAG + LLaMA 3.1</p>
        </div>

        {/* JOB DESCRIPTION */}
        <div className="jd-wrap">
          
          <textarea
            className="jd-box"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
          />
        </div>

        {/* UPLOAD STRIP */}
        <div className="jd-wrap">
          
          <div className="upload-strip">
            <label className="upload-btn upload-btn-pdf">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Upload PDF
              <input type="file" accept=".pdf" multiple className="hidden" style={{ display: "none" }}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const slots = 10 - candidates.length;
                  const selected = Array.from(files).slice(0, slots);
                  for (const file of selected) {
                    try {
                      const formData = new FormData();
                      formData.append("pdf", file);
                      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
                      const data = await res.json();
                      if (data.success) {
                        setCandidates((prev) => [...prev, { id: Date.now() + Math.random(), name: file.name, text: data.text }]);
                      }
                    } catch (err) { console.error(err); }
                  }
                }}
              />
            </label>

            <label className="upload-btn upload-btn-doc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Upload DOCX
              <input type="file" accept=".docx" multiple className="hidden" style={{ display: "none" }} onChange={handleDocUpload} />
            </label>

            <button className="upload-btn upload-btn-text" onClick={() => setShowModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              Paste Text
            </button>
          </div>
        </div>

        {/* CANDIDATE QUEUE */}
        <div className="queue-section">
          {candidates.filter(c => c.overallScore === undefined).length === 0 && !analyzed ? (
            <div className="empty-state">No candidates added yet — upload PDFs, DOCX files, or paste text above</div>
          ) : (
            <div className="queue-grid">
              {candidates.filter(c => c.overallScore === undefined).map((c, i) => (
                <div className="queue-item" key={c.id}>
                  <div className="queue-item-left">
                    <span className="queue-num">{i + 1}</span>
                    <div className="queue-icon">📄</div>
                    <div>
                      <div className="queue-name">{c.name}</div>
                      <div className="queue-size">{c.text.length.toLocaleString()} chars</div>
                    </div>
                  </div>
                  <button className="remove-btn" onClick={() => removeCandidate(c.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ANALYZE BUTTON */}
        <div className="analyze-wrap">
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || candidates.length === 0 || !jobDescription.trim()}
          >
            {loading ? (
              <div className="analyze-btn-loading">
                <div className="spinner" />
                Analyzing {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}...
              </div>
            ) : (
              `Analyze ${candidates.length > 0 ? candidates.length : ""} Candidate${candidates.length !== 1 ? "s" : ""} →`
            )}
          </button>
        </div>

        {/* RESULTS */}
        {analyzed && rankedResults.length > 0 && (
          <div className="results-section" id="results-section">
            <hr className="divider" />
            <div className="section-label">03 — Results</div>
            <h2 className="results-heading">Rankings</h2>
            <p className="results-meta">{rankedResults.length} candidates evaluated · sorted by overall score</p>

            <div className="results-grid">
              {rankedResults.map((c, index) => {
                const rec = recommendationConfig[c.recommendation || "Maybe"] || recommendationConfig["Maybe"];
                const scoreColor = c.overallScore! >= 80 ? "#00c97a" : c.overallScore! >= 60 ? "#f5a623" : "#ff4d4d";
                const isExpanded = expandedRubric === c.id;

                return (
                  <div className="result-card" key={c.id}>
                    <div className="result-card-top">
                      <div>
                        <div className="result-rank">#{index + 1} Rank</div>
                        <div className="result-name">{c.name}</div>
                        {c.summary && <div className="result-summary">{c.summary}</div>}
                      </div>
                      <div className="result-right">
                        <div className="score-circle" style={{ borderColor: scoreColor + "40" }}>
                          <span className="score-num" style={{ color: scoreColor }}>{c.overallScore}</span>
                          <span className="score-label">/ 100</span>
                        </div>
                        <div className="rec-badge" style={{ background: rec.bg, color: rec.color }}>
                          <div className="rec-dot" style={{ background: rec.dot }} />
                          {rec.label}
                        </div>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="progress-wrap">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${c.overallScore}%`, background: scoreColor }} />
                      </div>
                    </div>

                    {/* RUBRIC TOGGLE */}
                    <div className="rubric-toggle">
                      <button className="rubric-btn" onClick={() => setExpandedRubric(isExpanded ? null : c.id)}>
                        {isExpanded ? "▲ hide rubric" : "▼ view rubric breakdown"}
                      </button>
                    </div>

                    {/* RUBRIC PANEL */}
                    {isExpanded && c.rubric && (
                      <div className="rubric-panel">
                        {Object.entries(c.rubric).map(([key, val]) => (
                          <div key={key}>
                            <div className="rubric-row">
                              <div className="rubric-cat">{rubricLabels[key] || key}</div>
                              <div className="rubric-weight">{rubricWeights[key]}%</div>
                              <div className="rubric-bar-wrap">
                                <div className="rubric-bar-fill" style={{ width: `${(val.score / 10) * 100}%` }} />
                              </div>
                              <div className="rubric-score">{val.score}</div>
                            </div>
                            <div className="rubric-reason">{val.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box">
            <div className="modal-title">Paste Resume Text</div>
            <textarea
              className="modal-textarea"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste the full resume text here..."
            />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="modal-submit" onClick={handleAddText}>Add Candidate</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
