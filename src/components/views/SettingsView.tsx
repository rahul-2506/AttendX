import React, { useState } from 'react';
import { 
  Camera, 
  Sliders, 
  Clock, 
  Bell, 
  Save, 
  Check, 
  Cpu, 
  Network, 
  ShieldCheck, 
  Video, 
  Radio, 
  Zap,
  Server
} from 'lucide-react';
import { SystemSettings } from '../../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#15161a] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#ea5d38]/15 border border-[#ea5d38]/25 flex items-center justify-center text-[#ea5d38]">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">System & Vision Engine Configuration</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Hardware camera inputs, absence thresholds, and continuous AI monitoring parameters
            </p>
          </div>
        </div>

        <button
          type="submit"
          id="save-settings-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-[#0e0f12] bg-[#ea5d38] hover:bg-[#f2724f] active:scale-[0.98] transition-all shadow-md self-start sm:self-auto"
        >
          {saved ? <Check className="w-4 h-4 text-[#0e0f12]" /> : <Save className="w-4 h-4 text-[#0e0f12]" />}
          <span>{saved ? 'Changes Saved' : 'Save System Settings'}</span>
        </button>
      </div>

      {/* 1. Camera Source Architecture (Crucial requirement from prompt) */}
      <div className="p-6 rounded-2xl bg-[#15161a] border border-white/[0.06] flex flex-col gap-4 text-xs">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#ea5d38]" />
            <h3 className="text-sm font-bold text-white">Camera Source Hardware</h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">
            Current: {formData.cameraSource.toUpperCase()}
          </span>
        </div>

        <p className="text-gray-400 text-xs leading-relaxed">
          The Intelligent Attendance System supports flexible hardware cameras. For the initial prototype,
          the internal <strong>Laptop Webcam</strong> is active. You can switch to an <strong>External USB Camera</strong>
          or an <strong>IP RTSP Classroom Stream</strong> at any time without resetting tracking state.
        </p>

        {/* Camera Source Selector Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Laptop Webcam */}
          <div
            onClick={() => setFormData({ ...formData, cameraSource: 'webcam' })}
            className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
              formData.cameraSource === 'webcam'
                ? 'bg-[#1e2027] border-[#ea5d38] ring-1 ring-[#ea5d38]/30'
                : 'bg-[#17181e] border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <Video className="w-5 h-5 text-gray-300" />
              <input
                type="radio"
                name="cameraSource"
                checked={formData.cameraSource === 'webcam'}
                onChange={() => setFormData({ ...formData, cameraSource: 'webcam' })}
                className="accent-[#ea5d38]"
              />
            </div>
            <span className="font-bold text-white text-sm">Laptop Webcam</span>
            <span className="text-gray-400 text-[11px]">Integrated prototype sensor (1080p @ 30fps)</span>
          </div>

          {/* External USB Camera */}
          <div
            onClick={() => setFormData({ ...formData, cameraSource: 'usb' })}
            className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
              formData.cameraSource === 'usb'
                ? 'bg-[#1e2027] border-[#ea5d38] ring-1 ring-[#ea5d38]/30'
                : 'bg-[#17181e] border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <Cpu className="w-5 h-5 text-gray-300" />
              <input
                type="radio"
                name="cameraSource"
                checked={formData.cameraSource === 'usb'}
                onChange={() => setFormData({ ...formData, cameraSource: 'usb' })}
                className="accent-[#ea5d38]"
              />
            </div>
            <span className="font-bold text-white text-sm">External USB Camera</span>
            <span className="text-gray-400 text-[11px]">Wide-angle classroom camera (UVC compliant)</span>
          </div>

          {/* IP RTSP Stream */}
          <div
            onClick={() => setFormData({ ...formData, cameraSource: 'ip' })}
            className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
              formData.cameraSource === 'ip'
                ? 'bg-[#1e2027] border-[#ea5d38] ring-1 ring-[#ea5d38]/30'
                : 'bg-[#17181e] border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <Network className="w-5 h-5 text-gray-300" />
              <input
                type="radio"
                name="cameraSource"
                checked={formData.cameraSource === 'ip'}
                onChange={() => setFormData({ ...formData, cameraSource: 'ip' })}
                className="accent-[#ea5d38]"
              />
            </div>
            <span className="font-bold text-white text-sm">IP / RTSP Stream</span>
            <span className="text-gray-400 text-[11px]">Ceiling-mounted PTZ classroom surveillance feed</span>
          </div>
        </div>

        {formData.cameraSource === 'ip' && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#111216] border border-white/[0.08] flex flex-col gap-1.5">
            <label className="text-gray-300 font-semibold text-xs">RTSP Stream URL</label>
            <input
              type="text"
              value={formData.ipStreamUrl}
              onChange={(e) => setFormData({ ...formData, ipStreamUrl: e.target.value })}
              className="bg-[#1a1b22] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ea5d38]"
              placeholder="rtsp://admin:pass@192.168.1.100:554/live"
            />
          </div>
        )}
      </div>

      {/* 2. Recognition Confidence & Absence Thresholds */}
      <div className="p-6 rounded-2xl bg-[#15161a] border border-white/[0.06] flex flex-col gap-5 text-xs">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#ea5d38]" />
            <h3 className="text-sm font-bold text-white">Detection & Absence Thresholds</h3>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Continuous Presence Logic
          </span>
        </div>

        {/* Recognition Confidence */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-white">Face Recognition Confidence Threshold</span>
              <p className="text-[11px] text-gray-400">Minimum cosine similarity score required to mark a student present</p>
            </div>
            <span className="text-base font-mono font-bold text-[#ea5d38]">
              {formData.recognitionConfidenceThreshold}%
            </span>
          </div>
          <input
            type="range"
            min="60"
            max="98"
            step="1"
            value={formData.recognitionConfidenceThreshold}
            onChange={(e) => setFormData({ ...formData, recognitionConfidenceThreshold: Number(e.target.value) })}
            className="w-full accent-[#ea5d38] h-2 bg-[#202227] rounded-lg cursor-pointer"
          />
        </div>

        {/* Temporary Absence Grace Period */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-white">Temporary Absence Grace Period</span>
              <p className="text-[11px] text-gray-400">Time allowed for water breaks or brief stepping out before flagging</p>
            </div>
            <span className="text-base font-mono font-bold text-amber-400">
              {formData.temporaryAbsenceThresholdMinutes} minutes
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            step="1"
            value={formData.temporaryAbsenceThresholdMinutes}
            onChange={(e) => setFormData({ ...formData, temporaryAbsenceThresholdMinutes: Number(e.target.value) })}
            className="w-full accent-amber-400 h-2 bg-[#202227] rounded-lg cursor-pointer"
          />
        </div>

        {/* Prolonged Absence Threshold */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-white">Prolonged Absence Alert Threshold</span>
              <p className="text-[11px] text-gray-400">Time undetected after which a student is flagged for instructor attention</p>
            </div>
            <span className="text-base font-mono font-bold text-red-400">
              {formData.prolongedAbsenceThresholdMinutes} minutes
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={formData.prolongedAbsenceThresholdMinutes}
            onChange={(e) => setFormData({ ...formData, prolongedAbsenceThresholdMinutes: Number(e.target.value) })}
            className="w-full accent-red-400 h-2 bg-[#202227] rounded-lg cursor-pointer"
          />
        </div>

        {/* Class Duration */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-white">Class Duration Period</span>
              <p className="text-[11px] text-gray-400">Nominal lecture or lab session length</p>
            </div>
            <span className="text-base font-mono font-bold text-white">
              {formData.classDurationMinutes} minutes
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="180"
            step="15"
            value={formData.classDurationMinutes}
            onChange={(e) => setFormData({ ...formData, classDurationMinutes: Number(e.target.value) })}
            className="w-full accent-emerald-400 h-2 bg-[#202227] rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 3. Notifications & Automation Preferences */}
      <div className="p-6 rounded-2xl bg-[#15161a] border border-white/[0.06] flex flex-col gap-4 text-xs">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#ea5d38]" />
            <h3 className="text-sm font-bold text-white">Notification & Logging Automation</h3>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
          <div>
            <span className="text-sm font-semibold text-white">Auto-Capture Frame on Absence</span>
            <p className="text-[11px] text-gray-400">Automatically save camera snapshot when a prolonged absence is triggered</p>
          </div>
          <input
            type="checkbox"
            checked={formData.autoSnapshotOnAbsence}
            onChange={(e) => setFormData({ ...formData, autoSnapshotOnAbsence: e.target.checked })}
            className="w-4 h-4 accent-[#ea5d38] rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
          <div>
            <span className="text-sm font-semibold text-white">Notify Faculty on Prolonged Absence</span>
            <p className="text-[11px] text-gray-400">Push immediate dashboard banner alert to instructor</p>
          </div>
          <input
            type="checkbox"
            checked={formData.notifyFacultyOnProlonged}
            onChange={(e) => setFormData({ ...formData, notifyFacultyOnProlonged: e.target.checked })}
            className="w-4 h-4 accent-[#ea5d38] rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm font-semibold text-white">FastAPI Sync Endpoint</span>
            <p className="text-[11px] text-gray-400">Backend server URL for continuous attendance ingestion</p>
          </div>
          <input
            type="text"
            value={formData.fastApiSyncUrl}
            onChange={(e) => setFormData({ ...formData, fastApiSyncUrl: e.target.value })}
            className="bg-[#1a1b22] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white font-mono text-xs w-64 focus:outline-none"
          />
        </div>
      </div>
    </form>
  );
};
