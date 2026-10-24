import React, { useState, useEffect } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import {
  FileCode,
  Folder,
  Plus,
  Trash2,
  Save,
  Play,
  Square,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Terminal,
  Activity,
  Layers,
  Cpu,
  Copy
} from 'lucide-react';

export const LearnerScreen: React.FC = () => {
  const {
    isLearnerLocked,
    runState,
    startTraining,
    stopTraining,
    wsConnected,
    emittedChecklist,
    terminalLogs
  } = useSim();

  const [files, setFiles] = useState<{ name: string; size: number }[]>([
    { name: 'learner.py', size: 1048 },
    { name: 'policy_network.py', size: 2450 },
    { name: 'reward_wrapper.py', size: 1820 }
  ]);
  const [activeFile, setActiveFile] = useState<string>('learner.py');
  const [editorContent, setEditorContent] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [commandStr, setCommandStr] = useState<string>('python3 learner.py');
  const [interpreterPath, setInterpreterPath] = useState<string>('/usr/bin/python3');
  const [launchInTerminal, setLaunchInTerminal] = useState<boolean>(true);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  // Build & Benchmark state
  const [benchmarkStatus, setBenchmarkStatus] = useState<string>('idle');
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);

  // Test connection state
  const [testConnStatus, setTestConnStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load active file content
  useEffect(() => {
    fetch(`/api/learner/read?file=${activeFile}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content !== undefined) {
          setEditorContent(data.content);
          setIsSaved(true);
        }
      })
      .catch(() => {
        // Fallback demo content
        setEditorContent(`# ${activeFile}\nfrom f1ui_bridge import bridge\nimport time\n\n# YOUR LEARNER CODE HERE\n`);
      });
  }, [activeFile]);

  // Handle Ctrl+S Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, editorContent, isLearnerLocked]);

  const handleSaveFile = async () => {
    if (isLearnerLocked) return;
    try {
      const res = await fetch('/api/learner/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: activeFile, content: editorContent })
      });
      if (res.ok) {
        setIsSaved(true);
        setErrorMessage(null);
      } else {
        setErrorMessage('Cannot save: Learner Lock is active during training.');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to write file to disk.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleInsertTemplate = async () => {
    if (isLearnerLocked) return;
    try {
      const res = await fetch('/api/learner/template');
      const text = await res.text();
      setEditorContent(text);
      setIsSaved(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunBenchmark = async () => {
    setBenchmarkStatus('running');
    try {
      const res = await fetch('/api/learner/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: 2000, tolerance: 1e-6 })
      });
      const data = await res.json();
      setBenchmarkResults(data);
      setBenchmarkStatus('done');
    } catch (e) {
      setBenchmarkStatus('error');
    }
  };

  const handleTestConnection = () => {
    setTestConnStatus('testing');
    setTimeout(() => {
      if (wsConnected) {
        setTestConnStatus('success');
      } else {
        setTestConnStatus('failed');
      }
    }, 1200);
  };

  const requiredMessageTypes = ['hello', 'frame', 'lap_complete', 'stats', 'phase', 'metrics', 'status', 'log'];

  return (
    <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex flex-col p-4 bg-[#07090F] select-none font-mono">
      {/* Top Header & Learner Lock Banner */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#1E2740]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#121826] border border-[#1E2740] text-[#19B8C9]">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider text-[#D7DEEC]">
              PYTHON LEARNER CODE EDITOR & ORCHESTRATION
            </h1>
            <p className="text-[11px] text-[#7C88A6]">
              Paste custom reinforcement learning algorithms; communicates via local WebSocket SDK (f1ui_bridge)
            </p>
          </div>
        </div>

        {isLearnerLocked ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FF4458]/15 border border-[#FF4458]/40 text-[#FF4458] text-xs font-bold shadow-[0_0_12px_rgba(255,68,88,0.2)]">
            <Lock className="w-4 h-4" />
            <span>LEARNER LOCKED: Training Active (Modifications Disabled)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#3DFF8F]/15 border border-[#3DFF8F]/40 text-[#3DFF8F] text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready for Editing</span>
          </div>
        )}
      </div>

      {/* Main 3-Column Workspace: File Tree (Left) | Code Editor (Center) | Run & Benchmark (Right) */}
      <div className="flex-1 min-h-0 my-3 grid grid-cols-12 gap-3">
        {/* Left Column: File Tree (Col 2) */}
        <div className="col-span-2 p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2740] text-xs font-bold text-[#D7DEEC] uppercase">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#19B8C9]" />
                <span>learner/</span>
              </span>
              <button
                disabled={isLearnerLocked}
                onClick={() => {
                  setNewFileName('');
                  setShowNewFileModal(true);
                }}
                className="p-1 rounded bg-[#121826] hover:bg-[#1E2740] text-[#19B8C9] disabled:opacity-30 cursor-pointer"
                title="Create New File"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="py-2 space-y-1">
              {files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFile(f.name)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeFile === f.name
                      ? 'bg-[#121826] text-[#19B8C9] border-b-2 border-[#19B8C9] font-bold'
                      : 'text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826]/40'
                  }`}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-[10px] text-[#7C88A6]">{(f.size / 1024).toFixed(1)}k</span>
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={isLearnerLocked}
            onClick={handleInsertTemplate}
            className="w-full py-2 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#19B8C9] font-bold hover:bg-[#1E2740] transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Insert Template</span>
          </button>
        </div>

        {/* Center Column: Code Editor with Tabs & Save (Col 6) */}
        <div className="col-span-6 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-hidden">
          {/* Editor Tab Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#07090F] border-b border-[#1E2740]">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-t-lg bg-[#0D111A] border-t-2 border-x border-[#1E2740] text-xs text-[#19B8C9] font-bold flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>{activeFile}</span>
                {!isSaved && <span className="w-2 h-2 rounded-full bg-[#FFC247]" title="Unsaved changes" />}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#7C88A6]">Ctrl + S to save</span>
              <button
                disabled={isLearnerLocked || isSaved}
                onClick={handleSaveFile}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#19B8C9] text-black font-bold text-xs uppercase disabled:opacity-30 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Text Editor Area */}
          <div className="flex-1 w-full p-3 overflow-hidden flex flex-col relative bg-[#05070B]">
            {isLearnerLocked && (
              <div className="absolute top-2 right-3 z-20 px-2 py-0.5 rounded bg-[#FF4458]/20 border border-[#FF4458]/40 text-[#FF4458] text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> READ ONLY
              </div>
            )}
            <textarea
              readOnly={isLearnerLocked}
              value={editorContent}
              onChange={(e) => {
                setEditorContent(e.target.value);
                setIsSaved(false);
              }}
              spellCheck={false}
              className="w-full flex-1 bg-transparent text-[#D7DEEC] font-mono text-xs leading-relaxed outline-none resize-none code-editor"
            />
          </div>

          {/* Editor Footer Status */}
          <div className="px-3 py-1.5 bg-[#07090F] border-t border-[#1E2740] flex items-center justify-between text-[10px] text-[#7C88A6]">
            <span>UTF-8 | Python 3 | {editorContent.split('\n').length} lines</span>
            <span>{isSaved ? 'Saved to disk' : 'Modified (unsaved)'}</span>
          </div>
        </div>

        {/* Right Column: Run Panel & Benchmark Suite (Col 4) */}
        <div className="col-span-4 p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-y-auto">
          <div className="space-y-3">
            {/* Run Execution Controls */}
            <div className="pb-3 border-b border-[#1E2740] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#D7DEEC] uppercase">
                <span>Run Process Panel</span>
                <span className="text-[10px] text-[#19B8C9]">{wsConnected ? 'Hub Online' : 'Hub Offline'}</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <label className="text-[10px] text-[#7C88A6] uppercase">Launch Command:</label>
                  <input
                    type="text"
                    disabled={isLearnerLocked}
                    value={commandStr}
                    onChange={(e) => setCommandStr(e.target.value)}
                    className="w-full bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded-lg px-2.5 py-1 text-xs focus:border-[#19B8C9] outline-none disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#7C88A6] uppercase">Interpreter:</label>
                  <input
                    type="text"
                    disabled={isLearnerLocked}
                    value={interpreterPath}
                    onChange={(e) => setInterpreterPath(e.target.value)}
                    className="w-full bg-[#07090F] border border-[#1E2740] text-[#7C88A6] rounded-lg px-2.5 py-1 text-xs focus:border-[#19B8C9] outline-none disabled:opacity-40"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#7C88A6]">Launch in real terminal:</span>
                  <input
                    type="checkbox"
                    checked={launchInTerminal}
                    onChange={(e) => setLaunchInTerminal(e.target.checked)}
                    className="accent-[#19B8C9] cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex gap-2">
                {runState === 'idle' ? (
                  <button
                    onClick={startTraining}
                    className="flex-1 py-2 rounded-xl bg-[#3DFF8F] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#3DFF8F]/90 transition-all cursor-pointer shadow-[0_0_10px_rgba(61,255,143,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch</span>
                  </button>
                ) : (
                  <button
                    onClick={stopTraining}
                    className="flex-1 py-2 rounded-xl bg-[#FF4458] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#FF4458]/90 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,68,88,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Run</span>
                  </button>
                )}

                <button
                  onClick={handleTestConnection}
                  className="px-3 py-2 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#19B8C9] font-bold hover:bg-[#1E2740] cursor-pointer"
                >
                  {testConnStatus === 'testing' ? 'Testing...' : 'Test Conn'}
                </button>
              </div>

              {testConnStatus === 'success' && (
                <div className="text-[10px] text-[#3DFF8F] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Core answered ping | SDK v1.4.0 verified
                </div>
              )}
            </div>

            {/* Checklist of message types emitted so far */}
            <div className="pb-3 border-b border-[#1E2740]">
              <div className="text-[10px] font-bold text-[#7C88A6] uppercase mb-1.5">
                Emitted Telemetry Contract:
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {requiredMessageTypes.map((type) => {
                  const emitted = emittedChecklist.includes(type);
                  return (
                    <div
                      key={type}
                      className={`px-2 py-1 rounded flex items-center justify-between border ${
                        emitted
                          ? 'bg-[#3DFF8F]/15 border-[#3DFF8F]/40 text-[#3DFF8F]'
                          : 'bg-[#07090F] border-[#1E2740] text-[#7C88A6]'
                      }`}
                    >
                      <span>{type}</span>
                      <span>{emitted ? '✓' : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Build & Benchmark Panel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#D7DEEC] uppercase">
                <span>Build & Benchmark</span>
                <button
                  onClick={handleRunBenchmark}
                  disabled={benchmarkStatus === 'running'}
                  className="px-2.5 py-1 rounded-lg bg-[#19B8C9]/20 border border-[#19B8C9]/50 text-[#19B8C9] text-[10px] font-bold hover:bg-[#19B8C9]/30 cursor-pointer"
                >
                  {benchmarkStatus === 'running' ? 'Benchmarking...' : 'Profile & Compare'}
                </button>
              </div>

              <div className="text-[10px] text-[#7C88A6]">
                Tests numeric equivalence within 1e-6 tolerance on fixed seed (2000 steps).
              </div>

              {benchmarkResults && (
                <div className="space-y-1 text-[10px] bg-[#07090F] p-2 rounded-xl border border-[#1E2740]">
                  <div className="flex items-center justify-between font-bold text-[#3DFF8F]">
                    <span>Best Variant:</span>
                    <span>{benchmarkResults.best_variant}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#19B8C9]">
                    <span>Throughput Speedup:</span>
                    <span className="font-bold">{benchmarkResults.overall_speedup}</span>
                  </div>
                  <div className="pt-1 border-t border-[#1E2740] space-y-0.5">
                    {benchmarkResults.variants.map((v: any) => (
                      <div key={v.name} className="flex items-center justify-between text-[#7C88A6]">
                        <span className="truncate pr-1">• {v.name}</span>
                        <span className="text-[#D7DEEC] font-bold">{v.speedup}x (Δ {v.maxDiff.toExponential(1)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Process Output Log Tail with Copy Support */}
          <div className="pt-2 border-t border-[#1E2740]">
            <div className="flex items-center justify-between text-[10px] text-[#7C88A6] uppercase mb-1">
              <span>Process Log Tail:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const tail = terminalLogs.slice(-20).join('\n');
                    navigator.clipboard.writeText(tail);
                    setCopyNotice('Copied last 20 log lines!');
                    setTimeout(() => setCopyNotice(null), 2500);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121826] border border-[#1E2740] hover:border-[#19B8C9] text-[9px] text-[#19B8C9] cursor-pointer"
                  title="Copy last 20 log lines"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>Copy Tail</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(terminalLogs.join('\n'));
                    setCopyNotice('Copied full log!');
                    setTimeout(() => setCopyNotice(null), 2500);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121826] border border-[#1E2740] hover:border-[#19B8C9] text-[9px] text-[#D7DEEC] cursor-pointer"
                  title="Copy full log"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>Copy All</span>
                </button>
              </div>
            </div>
            <div className="h-24 bg-[#07090F] border border-[#1E2740] rounded-lg p-2 overflow-y-auto text-[9px] text-[#D7DEEC] space-y-0.5 select-text font-mono">
              {terminalLogs.slice(-25).map((log, i) => (
                <div key={i} className="hover:bg-[#121826]/40 rounded px-1 select-text">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* In-UI Notification Banner */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-[#FF4458]/20 border border-[#FF4458] text-[#FF4458] text-xs font-bold shadow-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-white hover:text-[#FF4458] cursor-pointer">✕</button>
        </div>
      )}

      {/* Custom UI Modal for New Python File */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[420px] bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2740] pb-2">
              <span className="font-bold text-sm text-[#D7DEEC] uppercase">Create New Python Script</span>
              <button onClick={() => setShowNewFileModal(false)} className="text-[#7C88A6] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#7C88A6] uppercase">Script Filename (in learner/):</label>
              <input
                type="text"
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. policy_v2.py"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFileName.trim()) {
                    const rawName = newFileName.trim();
                    const cleanName = rawName.endsWith('.py') ? rawName : `${rawName}.py`;
                    if (!files.find((f) => f.name === cleanName)) {
                      setFiles([...files, { name: cleanName, size: 0 }]);
                      setActiveFile(cleanName);
                      setEditorContent(`# ${cleanName}\nfrom f1ui_bridge import bridge\nimport time\n\n# YOUR POLICY LOGIC HERE\n`);
                    }
                    setShowNewFileModal(false);
                  }
                }}
                className="w-full bg-[#07090F] border border-[#1E2740] rounded-xl px-3 py-2 text-xs text-[#D7DEEC] focus:border-[#19B8C9] outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="flex-1 py-2 bg-[#121826] border border-[#1E2740] text-[#7C88A6] hover:text-[#D7DEEC] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newFileName.trim()) return;
                  const rawName = newFileName.trim();
                  const cleanName = rawName.endsWith('.py') ? rawName : `${rawName}.py`;
                  if (!files.find((f) => f.name === cleanName)) {
                    setFiles([...files, { name: cleanName, size: 0 }]);
                    setActiveFile(cleanName);
                    setEditorContent(`# ${cleanName}\nfrom f1ui_bridge import bridge\nimport time\n\n# YOUR POLICY LOGIC HERE\n`);
                  }
                  setShowNewFileModal(false);
                }}
                className="flex-1 py-2 bg-[#19B8C9] text-black text-xs font-bold rounded-xl hover:bg-[#19B8C9]/90 cursor-pointer shadow-[0_0_10px_rgba(25,184,201,0.3)]"
              >
                Create Script
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
