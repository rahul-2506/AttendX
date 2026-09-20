import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Upload, 
  RefreshCw,
  Scan,
  AlertCircle,
  Video,
  RotateCcw,
  Image as ImageIcon,
  FileImage,
  Trash2,
  BookOpen
} from 'lucide-react';
import { Student, ClassCourse } from '../types';
import { apiService } from '../services/api';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (student: Omit<Student, 'id'> & { faceSampleBase64?: string; classId?: string }) => void;
  targetClassId?: string;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
  targetClassId
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [batch, setBatch] = useState('2025-2029');
  const [selectedClassId, setSelectedClassId] = useState<string>(targetClassId || '');
  const [availableClasses, setAvailableClasses] = useState<ClassCourse[]>([]);

  // Enrollment Method: 'webcam' | 'upload'
  const [enrollMethod, setEnrollMethod] = useState<'webcam' | 'upload'>('webcam');

  // Face capture / upload states
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setName('');
    setRollNumber('');
    setEmail('');
    setDepartment('Computer Science');
    setBatch('2025-2029');
    setSelectedClassId(targetClassId || '');
    setCapturedPhotoUrl(null);
    setUploadedFileName(null);
    setFaceCaptured(false);
    setWebcamError(null);
    setUploadError(null);
    setEnrollMethod('webcam');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [targetClassId]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      apiService.getClasses().then((clsList) => {
        setAvailableClasses(clsList);
        if (!selectedClassId && clsList.length > 0) {
          setSelectedClassId(targetClassId || clsList[0].id);
        }
      });
    }
  }, [isOpen, resetForm, targetClassId]);

  const startModalWebcam = useCallback(async () => {
    setWebcamError(null);
    try {
      if (modalStreamRef.current) {
        modalStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      modalStreamRef.current = stream;
      if (modalVideoRef.current) {
        modalVideoRef.current.srcObject = stream;
        await modalVideoRef.current.play();
      }
      setStreamActive(true);
    } catch (err: any) {
      console.error('[AddStudentModal] Camera error:', err);
      setWebcamError('Camera access denied or webcam not connected.');
      setStreamActive(false);
    }
  }, []);

  const stopModalWebcam = useCallback(() => {
    if (modalStreamRef.current) {
      modalStreamRef.current.getTracks().forEach((track) => track.stop());
      modalStreamRef.current = null;
    }
    setStreamActive(false);
  }, []);

  useEffect(() => {
    if (isOpen && step === 2 && enrollMethod === 'webcam' && !faceCaptured) {
      startModalWebcam();
    }
    return () => {
      if (modalStreamRef.current) {
        modalStreamRef.current.getTracks().forEach((t) => t.stop());
        modalStreamRef.current = null;
      }
    };
  }, [isOpen, step, enrollMethod, faceCaptured, startModalWebcam]);

  const handleCaptureWebcam = () => {
    if (!modalVideoRef.current || !streamActive) return;
    setIsCapturing(true);

    try {
      const video = modalVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedPhotoUrl(dataUrl);
        setFaceCaptured(true);
        stopModalWebcam();
      }
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const processImageFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit.');
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedPhotoUrl(result);
      setFaceCaptured(true);
      stopModalWebcam();
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setUploadedFileName(null);
    setFaceCaptured(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (enrollMethod === 'webcam') {
      startModalWebcam();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rollNumber) return;

    onAddStudent({
      name: name.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      email: email.trim() || `${rollNumber.trim().toLowerCase()}@cs.edu`,
      avatar: capturedPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      faceSampleBase64: capturedPhotoUrl || undefined,
      status: 'present',
      presencePercentage: 100,
      presentMinutes: 1,
      awayMinutes: 0,
      lastSeen: 'Just now',
      confidence: 96,
      enrolledDate: 'Today',
      department,
      batch,
      faceRegistered: !!capturedPhotoUrl,
      avatarBgColor: '#ea5d38',
      classId: selectedClassId || targetClassId
    });

    stopModalWebcam();
    resetForm();
    onClose();
  };

  const handleModalClose = () => {
    stopModalWebcam();
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const targetClassObj = availableClasses.find((c) => c.id === selectedClassId);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={handleModalClose}
    >
      <div 
        id="add-student-modal"
        className="w-full max-w-lg bg-[#16171c] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#1a1b21]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ea5d38]/20 border border-[#ea5d38]/30 flex items-center justify-center text-[#ea5d38]">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Enroll Student into Class</h3>
              <p className="text-[11px] text-gray-400">
                Enrolling into: <span className="text-[#ea5d38] font-semibold">{targetClassObj?.name || 'Class Roster'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={handleModalClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 py-2.5 bg-[#131418] border-b border-white/[0.04] flex items-center justify-between text-xs text-gray-400">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-[#ea5d38] font-semibold' : ''}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
            <span>Student & Class</span>
          </div>
          <span className="text-gray-600">→</span>
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-[#ea5d38] font-semibold' : ''}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
            <span>Face Biometrics</span>
          </div>
          <span className="text-gray-600">→</span>
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-[#ea5d38] font-semibold' : ''}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 && (
            <div className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Target Class *</label>
                <div className="relative">
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-[#1b1d24] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#ea5d38]"
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.course_code} - {cls.name} ({cls.section})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Full Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siddharth Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1b1d24] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea5d38]"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Student Roll Number / ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24CS101"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full bg-[#1b1d24] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea5d38] font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#1b1d24] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#ea5d38]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Batch</label>
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full bg-[#1b1d24] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#ea5d38] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-white/[0.06] mt-2">
                <button
                  type="button"
                  disabled={!name.trim() || !rollNumber.trim()}
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-[#ea5d38] hover:bg-[#fa6d48] text-white font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Next: Face Biometric Capture →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-4 text-xs">
              {/* Source Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-[#1b1d24] border border-white/[0.08] w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEnrollMethod('webcam');
                    if (!faceCaptured) startModalWebcam();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                    enrollMethod === 'webcam'
                      ? 'bg-[#ea5d38] text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Live Webcam</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEnrollMethod('upload');
                    stopModalWebcam();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                    enrollMethod === 'upload'
                      ? 'bg-[#ea5d38] text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>
              </div>

              {/* Webcam View */}
              {enrollMethod === 'webcam' && (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-full aspect-4/3 max-w-sm rounded-xl overflow-hidden bg-black border border-white/[0.1] flex items-center justify-center">
                    {!faceCaptured ? (
                      <>
                        <video
                          ref={modalVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover mirror"
                        />
                        {/* Target Reticle */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-56 border-2 border-dashed border-[#ea5d38]/70 rounded-full flex items-center justify-center animate-pulse">
                            <span className="text-[10px] text-[#ea5d38] bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                              Align Face Here
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="relative w-full h-full">
                        <img
                          src={capturedPhotoUrl!}
                          alt="Face sample"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Photo Captured
                        </div>
                      </div>
                    )}
                  </div>

                  {webcamError && (
                    <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {webcamError}
                    </div>
                  )}

                  {!faceCaptured ? (
                    <button
                      type="button"
                      onClick={handleCaptureWebcam}
                      disabled={!streamActive || isCapturing}
                      className="px-6 py-2.5 rounded-xl bg-[#ea5d38] hover:bg-[#fa6d48] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#ea5d38]/20 cursor-pointer disabled:opacity-40"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-gray-200 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake Photo
                    </button>
                  )}
                </div>
              )}

              {/* Upload View */}
              {enrollMethod === 'upload' && (
                <div className="w-full flex flex-col items-center gap-3">
                  {!faceCaptured ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full aspect-4/3 max-w-sm rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#ea5d38] bg-[#ea5d38]/10'
                          : 'border-white/[0.15] bg-[#1a1b21] hover:border-[#ea5d38]/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <FileImage className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="font-semibold text-white text-xs">Click to browse or drag face photo here</p>
                      <p className="text-[11px] text-gray-400 mt-1">Clear front-facing portrait (JPG, PNG, WebP)</p>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-4/3 max-w-sm rounded-xl overflow-hidden bg-black border border-white/[0.1]">
                      <img
                        src={capturedPhotoUrl!}
                        alt="Uploaded face sample"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Image Uploaded
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {uploadError}
                    </div>
                  )}

                  {faceCaptured && (
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-gray-200 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      Change Photo
                    </button>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between w-full pt-3 border-t border-white/[0.06] mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-[#ea5d38] hover:bg-[#fa6d48] text-white font-semibold transition-colors cursor-pointer"
                >
                  Next: Review & Confirm →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1a1b21] border border-white/[0.06]">
                <img
                  src={capturedPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={name}
                  className="w-14 h-14 rounded-full object-cover border border-[#ea5d38]/50"
                />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">{name}</h4>
                  <p className="font-mono text-gray-400">{rollNumber}</p>
                  <p className="text-[11px] text-gray-400">{department} • Batch {batch}</p>
                </div>
              </div>

              <div className="rounded-xl bg-[#131418] border border-white/[0.06] p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Class Target:</span>
                  <span className="text-[#ea5d38] font-bold">{targetClassObj?.name || 'Class Roster'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Face Recognition Embedding:</span>
                  <span className={faceCaptured ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                    {faceCaptured ? '✓ Ready (YuNet + SFace)' : 'Not captured (will not match on camera)'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-white/[0.06] mt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-[#ea5d38] hover:bg-[#fa6d48] text-white font-bold transition-all shadow-lg shadow-[#ea5d38]/30 cursor-pointer"
                >
                  Complete Enrollment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
