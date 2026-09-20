import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check,
  Terminal,
  Pause,
  Play,
  Filter,
  FileText
} from 'lucide-react';
import { apiService } from '../services/api';

interface VisionDiagnosticsData {
  camera: {
    status: string;
    fps: number;
    resolution: string;
  };
  tracking: {
    active_tracks: number;
    average_confidence: number;
  };
  recognition: {
    sface_calls_last_window: number;
    reidentifications_last_window: number;
  };
  detection: {
    yunet_calls_last_window: number;
  };
  attendance: {
    present: number;
    uncertain: number;
    temporarily_away: number;
    prolonged_absence: number;
    not_seen: number;
  };
  unknown_faces: number;
  recent_events: Array<{
    timestamp: string;
    source: string;
    title: string;
    details: string;
  }>;
}

interface LogEntry {
  timestamp: string;
  category: string;
  level: string;
  message: string;
  raw: string;
  created: number;
}

export const VisionDiagnosticsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'logs'>('metrics');
  const [data, setData] = useState<VisionDiagnosticsData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Poll diagnostics & logs
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      if (!mounted) return;
      const [diagRes, logRes] = await Promise.all([
        apiService.getVisionDiagnostics(),
        isLiveStreaming ? apiService.getLiveLogs(150) : Promise.resolve(null)
      ]);

      if (mounted) {
        if (diagRes) setData(diagRes);
        if (logRes && isLiveStreaming) setLogs(logRes);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 1200);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isLiveStreaming]);

  // Auto-scroll log console
  useEffect(() => {
    if (activeTab === 'logs' && isLiveStreaming && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, activeTab, isLiveStreaming]);

  const handleCopyLogs = () => {
    const text = logs.map(l => l.raw || `[${l.timestamp}] [${l.category}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogFile = () => {
    const downloadUrl = apiService.getDownloadLogUrl();
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `attendx_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isHealthy = data?.camera?.status === 'active';
  const fps = data?.camera?.fps ?? 0;
  const activeTracks = data?.tracking?.active_tracks ?? 0;
  const yunetCalls = data?.detection?.yunet_calls_last_window ?? 0;
  const sfaceCalls = data?.recognition?.sface_calls_last_window ?? 0;
  const reidCalls = data?.recognition?.reidentifications_last_window ?? 0;
  const avgConf = Math.round((data?.tracking?.average_confidence ?? 0.9) * 100);
  const unknownCount = data?.unknown_faces ?? 0;

  const filteredLogs = logs.filter(l => {
    if (filterCategory === 'ALL') return true;
    return l.category.toUpperCase().includes(filterCategory.toUpperCase());
  });

  return (
    <div className="bg-[#18191c] border border-border rounded-xl shadow-lg overflow-hidden transition-all duration-200">
      {/* Header bar / Toggle */}
      <div className="px-4 py-2.5 flex items-center justify-between hover:bg-card-hover/40 transition-colors">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 text-left focus:outline-none cursor-pointer flex-1"
        >
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-semibold tracking-wider text-text-muted uppercase">Vision Diagnostics & Logs</span>
          </div>
          <div className="hidden sm:flex items-center space-x-3 text-xs text-text-muted font-mono">
            <span>FPS: <strong className="text-text-primary">{fps}</strong></span>
            <span>Tracks: <strong className="text-emerald-400">{activeTracks}</strong></span>
            <span>YuNet: <strong className="text-sky-400">{yunetCalls}</strong></span>
            <span>SFace: <strong className="text-amber-400">{sfaceCalls}</strong></span>
            <span>Re-ID: <strong className="text-indigo-400">{reidCalls}</strong></span>
          </div>
        </button>

        <div className="flex items-center space-x-2">
          {/* Direct Download Log File Button */}
          <button
            onClick={handleDownloadLogFile}
            title="Save and download full attendx.log file to disk"
            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-coral-500 text-zinc-300 hover:text-white border border-border/80 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Save Logs (.log)</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-1.5 text-text-muted hover:text-text-primary text-[11px] font-mono bg-sidebar px-2 py-1 rounded border border-border/50 cursor-pointer"
          >
            <span>{isOpen ? 'Hide' : 'Inspect'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Diagnostics Drawer */}
      {isOpen && (
        <div className="p-4 border-t border-border/60 bg-[#121316] space-y-4">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'metrics'
                    ? 'bg-zinc-800 text-coral-400 border border-coral-500/30'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Metrics & Summary
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-zinc-800 text-coral-400 border border-coral-500/30'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Live Log Stream ({logs.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-muted bg-zinc-900 px-2 py-0.5 rounded border border-border/40">
                Log file: <strong className="text-zinc-300">backend/logs/attendx.log</strong> (auto-flushed)
              </span>
            </div>
          </div>

          {activeTab === 'metrics' ? (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                <div className="bg-[#1a1b1f] border border-border/40 p-2.5 rounded-lg">
                  <div className="text-[10px] uppercase font-mono text-text-muted">Camera FPS</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{fps}</div>
                  <div className="text-[10px] text-text-muted">{data?.camera?.resolution || '1280x720'}</div>
                </div>

                <div className="bg-[#1a1b1f] border border-border/40 p-2.5 rounded-lg">
                  <div className="text-[10px] uppercase font-mono text-text-muted">Active Tracks</div>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">{activeTracks}</div>
                  <div className="text-[10px] text-emerald-500/80">Real-time IoU</div>
                </div>

                <div className="bg-[#1a1b1f] border border-border/40 p-2.5 rounded-lg">
                  <div className="text-[10px] uppercase font-mono text-text-muted">YuNet Detector</div>
                  <div className="text-base font-bold font-mono text-sky-400 mt-0.5">{yunetCalls} <span className="text-[11px] font-normal text-text-muted">calls/win</span></div>
                  <div className="text-[10px] text-text-muted">Fast Loop</div>
                </div>

                <div className="bg-[#1a1b1f] border border-border/40 p-2.5 rounded-lg">
                  <div className="text-[10px] uppercase font-mono text-text-muted">SFace Embedder</div>
                  <div className="text-base font-bold font-mono text-amber-400 mt-0.5">{sfaceCalls} <span className="text-[11px] font-normal text-text-muted">calls/win</span></div>
                  <div className="text-[10px] text-amber-400/80">Conditional Loop</div>
                </div>

                <div className="bg-[#1a1b1f] border border-border/40 p-2.5 rounded-lg">
                  <div className="text-[10px] uppercase font-mono text-text-muted">Re-Identifications</div>
                  <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">{reidCalls}</div>
                  <div className="text-[10px] text-text-muted">Auto-Confirmed</div>
                </div>

                <div className="bg-[#1a1b1f] border border-border/40 p-2.5 rounded-lg">
                  <div className="text-[10px] uppercase font-mono text-text-muted">Avg Confidence</div>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">{avgConf}%</div>
                  <div className="text-[10px] text-emerald-400">Stable</div>
                </div>

                <div className="bg-[#1a1b1f] border border-border/40 p-2.5 rounded-lg">
                  <div className="text-[10px] uppercase font-mono text-text-muted">Unknowns</div>
                  <div className="text-base font-bold font-mono text-orange-400 mt-0.5">{unknownCount}</div>
                  <div className="text-[10px] text-text-muted">Isolated</div>
                </div>
              </div>

              {/* Recent 5 Diagnostic Log Events */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Live Engine Event Stream (Latest 5)</span>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="text-[11px] text-coral-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View All Logs &rarr;
                  </button>
                </div>
                <div className="bg-[#0f1012] border border-border/50 rounded-lg p-2.5 font-mono text-xs space-y-1.5">
                  {(!data?.recent_events || data.recent_events.length === 0) ? (
                    <div className="text-text-muted text-[11px] italic py-1">Awaiting vision & tracking events...</div>
                  ) : (
                    data.recent_events.slice(0, 5).map((evt, idx) => (
                      <div key={idx} className="flex items-start justify-between text-[11px] border-b border-border/20 last:border-0 pb-1 last:pb-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-text-muted text-[10px]">{evt.timestamp}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                            evt.source === 'RECOGNIZE' ? 'bg-amber-500/20 text-amber-300' :
                            evt.source === 'REIDENTIFY' ? 'bg-indigo-500/20 text-indigo-300' :
                            evt.source === 'ATTENDANCE' ? 'bg-emerald-500/20 text-emerald-300' :
                            'bg-sky-500/20 text-sky-300'
                          }`}>
                            [{evt.source}]
                          </span>
                          <span className="text-text-primary">{evt.title}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Full Live Log Console */
            <div className="space-y-2">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 p-2 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-coral-400" /> Filter:
                  </span>
                  {['ALL', 'SESSION', 'RECOGNIZE', 'TRACK', 'ATTENDANCE', 'PERFORMANCE', 'DETECT', 'CAMERA'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-coral-500 text-white font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                    className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1 border cursor-pointer ${
                      isLiveStreaming
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {isLiveStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isLiveStreaming ? 'Live' : 'Paused'}</span>
                  </button>

                  <button
                    onClick={handleCopyLogs}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-border text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadLogFile}
                    className="px-3 py-1 rounded bg-coral-600 hover:bg-coral-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download attendx.log</span>
                  </button>
                </div>
              </div>

              {/* Log stream box */}
              <div
                ref={logContainerRef}
                className="bg-[#0b0c0e] border border-border/80 rounded-lg p-3 font-mono text-xs max-h-80 overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-zinc-700"
              >
                {filteredLogs.length === 0 ? (
                  <div className="text-zinc-500 italic py-4 text-center">No logs found matching filter '{filterCategory}'.</div>
                ) : (
                  filteredLogs.map((logItem, idx) => (
                    <div key={idx} className="leading-relaxed hover:bg-zinc-900/60 px-1 py-0.5 rounded flex items-start gap-2">
                      <span className="text-zinc-500 text-[10px] shrink-0">[{logItem.timestamp}]</span>
                      <span className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                        logItem.category.includes('SESSION') ? 'bg-indigo-500/20 text-indigo-300' :
                        logItem.category.includes('RECOGNIZE') ? 'bg-amber-500/20 text-amber-300' :
                        logItem.category.includes('REIDENTIFY') ? 'bg-purple-500/20 text-purple-300' :
                        logItem.category.includes('ATTENDANCE') ? 'bg-emerald-500/20 text-emerald-300' :
                        logItem.category.includes('PERFORMANCE') ? 'bg-teal-500/20 text-teal-300' :
                        logItem.category.includes('TRACK') ? 'bg-blue-500/20 text-blue-300' :
                        logItem.category.includes('ERROR') ? 'bg-red-500/20 text-red-300' :
                        'bg-zinc-700 text-zinc-300'
                      }`}>
                        [{logItem.category}]
                      </span>
                      <span className="text-zinc-200 break-all">{logItem.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
