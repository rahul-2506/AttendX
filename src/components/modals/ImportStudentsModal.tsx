import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { apiService } from '../../services/api';

interface ImportStudentsModalProps {
  classId: string;
  className: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  classId,
  className,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ message: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Please provide CSV data or select a CSV file.');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      // Parse CSV
      const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setError('CSV file is empty.');
        return;
      }

      // Check header
      let startIndex = 0;
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes('student_id') || firstLineLower.includes('roll') || firstLineLower.includes('name')) {
        startIndex = 1;
      }

      const studentsToImport: Array<{
        student_id: string;
        name: string;
        department?: string;
        batch?: string;
        email?: string;
      }> = [];

      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          studentsToImport.push({
            student_id: cols[0],
            name: cols[1],
            department: cols[2] || 'Computer Science',
            batch: cols[3] || '2024-2028',
            email: cols[4] || `${cols[0].toLowerCase()}@cs.edu`
          });
        }
      }

      if (studentsToImport.length === 0) {
        setError('No valid student rows found. Expected format: student_id,name,department,batch');
        return;
      }

      const res = await apiService.importStudentsCsv(classId, studentsToImport);
      setResult({ message: res.message, count: res.enrolled_count });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('CSV import error:', err);
      setError(err.message || 'Failed to import CSV students.');
    } finally {
      setImporting(false);
    }
  };

  const sampleCsv = `student_id,name,department,batch
24CS101,Aarav Sharma,Computer Science,2024-2028
24CS102,Diya Patel,Computer Science,2024-2028
24CS103,Rohan Verma,Computer Science,2024-2028`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral-500/15 border border-coral-500/30 flex items-center justify-center text-coral-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Import Students into Class</h3>
              <p className="text-xs text-zinc-400">Target Class: <span className="text-zinc-200 font-semibold">{className}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{result.message}</span>
          </div>
        )}

        {/* File Upload Zone */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-2">Upload CSV File</label>
          <div className="border-2 border-dashed border-zinc-700 hover:border-coral-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-zinc-950/50 relative">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <FileText className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-zinc-300">
              {fileName ? fileName : 'Click or drag CSV file here to upload'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">Columns: student_id, name, department, batch</p>
          </div>
        </div>

        {/* CSV Text Paste Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Or Paste CSV Content</label>
            <button
              type="button"
              onClick={() => setCsvText(sampleCsv)}
              className="text-[11px] text-coral-400 hover:text-coral-300 transition-colors"
            >
              Insert Sample Template
            </button>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            placeholder="student_id,name,department,batch&#10;24CS101,Aarav Sharma,Computer Science,2024-2028"
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-coral-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white shadow-lg shadow-coral-950/40 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {importing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enrolling Students...
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                Enroll into {className}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
