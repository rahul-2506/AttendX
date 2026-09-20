import React, { useState, useEffect, useCallback } from 'react';
import { NavigationTab, Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { TodayScheduleView } from './components/views/TodayScheduleView';
import { ClassesView } from './components/views/ClassesView';
import { LiveClassroomView } from './components/views/LiveClassroomView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AttendanceHistoryView } from './components/views/AttendanceHistoryView';
import { SettingsView } from './components/views/SettingsView';
import { StudentDetailModal } from './components/StudentDetailModal';
import { AddStudentModal } from './components/AddStudentModal';
import { ExportReportModal } from './components/ExportReportModal';
import { initialSettings } from './data/mockData';
import { Student, SystemSettings, ActivityEvent, DetectedFace, ClassSession, TodayScheduleItem } from './types';
import { apiService } from './services/api';
import { wsService } from './services/websocket';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('today');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [session, setSession] = useState<ClassSession | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [isPaused, setIsPaused] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [targetClassIdForModal, setTargetClassIdForModal] = useState<string | undefined>(undefined);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadActiveSessionData = useCallback(async () => {
    try {
      const sess = await apiService.getCurrentSession();
      if (sess && sess.status === 'active') {
        setSession(sess);
        setIsSessionActive(true);
        if (sess.classId) {
          const classStudents = await apiService.getClassStudents(sess.classId);
          setStudents(classStudents);
        } else {
          const liveStudents = await apiService.getLiveAttendance();
          setStudents(liveStudents);
        }
      } else {
        setSession(sess);
        setIsSessionActive(false);
      }
    } catch {
      setIsSessionActive(false);
    }
  }, []);

  // 1. Initial Load from Backend API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [loadedSettings, loadedEvents] = await Promise.all([
          apiService.getSettings(),
          apiService.getAttendanceEvents()
        ]);
        if (loadedSettings) setSettings(loadedSettings);
        if (loadedEvents) setActivityEvents(loadedEvents);
        await loadActiveSessionData();
      } catch (err) {
        console.log('[ATTENDX] Loaded teacher dashboard');
      }
    };

    loadInitialData();

    // 2. Connect Real-time WebSocket
    wsService.connect();

    // Subscriptions
    const unsubRecognized = wsService.on('student_recognized', (data) => {
      setStudents(prev => prev.map(s => {
        if (s.rollNumber === data.student_id || s.id === data.student_id) {
          return {
            ...s,
            status: 'present',
            presencePercentage: data.presence_percentage ?? s.presencePercentage,
            presentMinutes: data.present_duration ?? s.presentMinutes
          };
        }
        return s;
      }));

      const newEvt: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        studentName: data.name,
        studentId: data.student_id,
        message: `${data.name} recognized in class`,
        type: 'present',
        badgeText: 'Present'
      };
      setActivityEvents(prev => [newEvt, ...prev]);
    });

    const unsubReturned = wsService.on('student_returned', (data) => {
      setStudents(prev => prev.map(s => {
        if (s.rollNumber === data.student_id || s.id === data.student_id) {
          return {
            ...s,
            status: 'present',
            presencePercentage: data.presence_percentage ?? s.presencePercentage,
            presentMinutes: data.present_duration ?? s.presentMinutes,
            awayMinutes: data.away_duration ?? 0
          };
        }
        return s;
      }));

      const newEvt: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        studentName: data.name,
        studentId: data.student_id,
        message: data.message || `${data.name} returned to class`,
        type: 'present',
        badgeText: 'Returned'
      };
      setActivityEvents(prev => [newEvt, ...prev]);
      showToast(`${data.name} returned to class`);
    });

    const unsubAway = wsService.on('student_temporary_absence', (data) => {
      setStudents(prev => prev.map(s => {
        if (s.rollNumber === data.student_id || s.id === data.student_id) {
          return { ...s, status: 'away' };
        }
        return s;
      }));

      const newEvt: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        studentName: data.name,
        studentId: data.student_id,
        message: data.message || `${data.name} temporarily away`,
        type: 'away',
        badgeText: 'Away'
      };
      setActivityEvents(prev => [newEvt, ...prev]);
    });

    const unsubProlonged = wsService.on('student_prolonged_absence', (data) => {
      setStudents(prev => prev.map(s => {
        if (s.rollNumber === data.student_id || s.id === data.student_id) {
          return { ...s, status: 'prolonged', flagReason: 'Exceeded absence limit' };
        }
        return s;
      }));

      const newEvt: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        studentName: data.name,
        studentId: data.student_id,
        message: data.message || `Prolonged absence: ${data.name}`,
        type: 'prolonged',
        badgeText: 'Prolonged'
      };
      setActivityEvents(prev => [newEvt, ...prev]);
      showToast(`Flagged prolonged absence: ${data.name}`);
    });

    const unsubUnknown = wsService.on('unknown_face', (data) => {
      const newEvt: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: 'Unregistered person detected in classroom',
        type: 'unknown',
        badgeText: 'Unknown Person'
      };
      setActivityEvents(prev => [newEvt, ...prev]);
    });

    return () => {
      unsubRecognized();
      unsubReturned();
      unsubAway();
      unsubProlonged();
      unsubUnknown();
      wsService.disconnect();
    };
  }, [loadActiveSessionData]);

  // Session Start Handler
  const handleStartClassSession = async (classId: string) => {
    try {
      const res = await apiService.startClassSession(classId);
      if (res && res.session) {
        setSession({
          id: res.session.id,
          classId: res.session.class_id,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          courseCode: res.session.course_code,
          courseName: res.session.course_name,
          section: res.session.section,
          room: res.session.room,
          instructor: res.session.instructor,
          startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          durationMinutes: 60,
          totalEnrolled: res.session.total_enrolled || 0,
          studentsPresent: 0,
          temporarilyAway: 0,
          prolongedAbsence: 0,
          notDetected: res.session.total_enrolled || 0,
          unregisteredDetected: 0,
          averagePresence: 0.0,
          flaggedStudents: 0,
          status: 'active'
        });
        setIsSessionActive(true);
      }

      // Load enrolled students for this class
      const enrolled = await apiService.getClassStudents(classId);
      setStudents(enrolled);

      // Switch to Live Classroom
      setActiveTab('live');
      showToast(`Class session started for ${res.session?.course_name || 'Class'}`);
    } catch (err) {
      console.error('Failed to start class session:', err);
      showToast('Error starting session.');
    }
  };

  // Session End Handler
  const handleEndClassSession = async () => {
    if (!session) return;
    try {
      await apiService.endSession(session.id);
      setIsSessionActive(false);
      setSession(prev => prev ? { ...prev, status: 'completed' } : null);
      showToast('Class session completed & attendance saved.');
      setActiveTab('today');
    } catch (err) {
      console.error('Failed to end session:', err);
      showToast('Error ending session.');
    }
  };

  // Student Add / Enroll Handler
  const handleAddStudent = async (studentData: Omit<Student, 'id'> & { faceSampleBase64?: string; classId?: string }) => {
    try {
      const targetCid = studentData.classId || targetClassIdForModal || session?.classId;
      if (targetCid) {
        await apiService.enrollStudentInClass(targetCid, {
          roll_number: studentData.rollNumber,
          name: studentData.name,
          department: studentData.department,
          batch: studentData.batch,
          email: studentData.email,
          avatar: studentData.avatar,
          face_sample_base64: studentData.faceSampleBase64
        });
        showToast(`Student ${studentData.name} enrolled into class roster`);
        if (session && session.classId === targetCid) {
          const updated = await apiService.getClassStudents(targetCid);
          setStudents(updated);
        }
      } else {
        showToast('Please select a target class to enroll.');
      }
    } catch (err: any) {
      console.error('Failed to enroll student:', err);
      showToast(err.message || 'Error enrolling student.');
    }
  };

  // Settings Save Handler
  const handleSaveSettings = async (newSettings: SystemSettings) => {
    try {
      const updated = await apiService.updateSettings(newSettings);
      setSettings(updated);
      showToast('System settings saved.');
    } catch (err) {
      showToast('Error saving settings.');
    }
  };

  const heatmapRows = students.map((s) => ({
    studentId: s.id,
    name: s.name,
    intervals: [
      { time: '14:00', status: s.status as any, value: s.presencePercentage },
      { time: '14:15', status: s.status as any, value: s.presencePercentage },
      { time: '14:30', status: s.status as any, value: s.presencePercentage },
      { time: '14:45', status: s.status as any, value: s.presencePercentage },
    ]
  }));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0d10] text-zinc-100 font-sans antialiased selection:bg-coral-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isLiveSessionActive={isSessionActive}
      />

      {/* Main App Workspace */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-[#0e0f12]">
        {/* Global Topbar */}
        <Topbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenExportModal={() => setShowExportModal(true)}
          onTakeSnapshot={() => apiService.captureSnapshot().then(ts => showToast(`Snapshot saved at ${ts}`))}
          onOpenSettings={() => setActiveTab('settings')}
          isLiveSessionActive={isSessionActive}
        />

        {/* Dynamic View Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          {activeTab === 'today' && (
            <TodayScheduleView
              onStartSession={handleStartClassSession}
              onViewClass={(cid) => {
                setActiveTab('classes');
              }}
              onNavigateToLive={() => setActiveTab('live')}
              activeSessionId={isSessionActive && session ? session.id : null}
            />
          )}

          {activeTab === 'classes' && (
            <ClassesView
              onStartSession={handleStartClassSession}
              onOpenAddStudentModal={(cid) => {
                setTargetClassIdForModal(cid);
                setShowAddStudentModal(true);
              }}
            />
          )}

          {activeTab === 'live' && (
            <LiveClassroomView
              students={students}
              detectedFaces={detectedFaces}
              heatmapRows={heatmapRows}
              activityEvents={activityEvents}
              settings={settings}
              currentSession={session}
              onSelectStudent={setSelectedStudent}
              onOpenSettings={() => setActiveTab('settings')}
              onOpenExportModal={() => setShowExportModal(true)}
              onTakeSnapshot={() => apiService.captureSnapshot().then(ts => showToast(`Snapshot saved at ${ts}`))}
              onEndSession={handleEndClassSession}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              isSessionActive={isSessionActive}
              setIsSessionActive={setIsSessionActive}
            />
          )}

          {activeTab === 'history' && (
            <AttendanceHistoryView
              onOpenExportModal={() => setShowExportModal(true)}
              onSelectSession={(sess) => {}}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdateStatus={async (stdId: string, newStatus: Student['status']) => {
            await apiService.overrideStatus(stdId, newStatus);
            setStudents(prev => prev.map(s => s.id === stdId ? { ...s, status: newStatus } : s));
            showToast(`Status updated to ${newStatus}`);
          }}
          onDeleteStudent={async (stdId: string) => {
            await apiService.deleteStudent(stdId);
            setStudents(prev => prev.filter(s => s.id !== stdId));
            setSelectedStudent(null);
            showToast('Student deleted from record');
          }}
        />
      )}

      {showAddStudentModal && (
        <AddStudentModal
          isOpen={showAddStudentModal}
          onClose={() => {
            setShowAddStudentModal(false);
            setTargetClassIdForModal(undefined);
          }}
          onAddStudent={handleAddStudent}
          targetClassId={targetClassIdForModal || session?.classId}
        />
      )}

      {showExportModal && session && (
        <ExportReportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          session={session}
          students={students}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-medium shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-coral-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
