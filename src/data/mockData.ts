import { Student, ActivityEvent, ClassSession, HeatmapStudentRow, SystemSettings, DetectedFace } from '../types';

export const initialSettings: SystemSettings = {
  cameraSource: 'webcam',
  selectedDeviceId: 'integrated-webcam-01',
  ipStreamUrl: 'rtsp://admin:lab3@192.168.1.120:554/live',
  recognitionConfidenceThreshold: 85,
  temporaryAbsenceThresholdMinutes: 5,
  prolongedAbsenceThresholdMinutes: 10,
  classDurationMinutes: 60,
  autoSnapshotOnAbsence: true,
  alertSoundEnabled: false,
  notifyFacultyOnProlonged: true,
  highPrecisionMode: true,
  fastApiSyncUrl: 'http://localhost:8000/api/v1',
};

export const currentSession: ClassSession = {
  id: 'SES-2026-CSE302-B',
  date: 'Today • Live Class',
  courseCode: 'CSE302',
  courseName: 'Operating Systems',
  section: 'Section B',
  room: 'Computer Science Lab 3',
  instructor: 'Prof. Rahul M.',
  startTime: '09:00 AM',
  endTime: '10:00 AM',
  durationMinutes: 60,
  totalEnrolled: 0,
  studentsPresent: 0,
  temporarilyAway: 0,
  prolongedAbsence: 0,
  unregisteredDetected: 0,
  averagePresence: 0,
  flaggedStudents: 0,
  status: 'active',
};

export const mockStudents: Student[] = [];

export const detectedFacesOnCamera: DetectedFace[] = [];

export const mockHeatmapRows: HeatmapStudentRow[] = [];

export const mockActivityFeed: ActivityEvent[] = [];

export const mockAnalyticsData = {
  weeklyAttendance: [
    { day: 'Mon', rate: 0, present: 0, away: 0 },
    { day: 'Tue', rate: 0, present: 0, away: 0 },
    { day: 'Wed', rate: 0, present: 0, away: 0 },
    { day: 'Thu', rate: 0, present: 0, away: 0 },
    { day: 'Fri', rate: 0, present: 0, away: 0 },
    { day: 'Sat', rate: 0, present: 0, away: 0 },
  ],
  statusDistribution: [
    { name: 'Continuous Present (>90%)', value: 0, color: '#10b981' },
    { name: 'Temporary Absence (<5m)', value: 0, color: '#f59e0b' },
    { name: 'Prolonged Absence (>10m)', value: 0, color: '#ef4444' },
  ],
  departmentBreakdown: [],
};
