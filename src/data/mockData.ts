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

export const fallbackClasses = [
  {
    id: "CLS-CSE302",
    name: "Operating Systems",
    course_code: "CSE302",
    section: "Section B",
    room: "AB3-204",
    color: "#ea5d38",
    teacher_id: "TCH-001",
    enrolled_count: 0
  },
  {
    id: "CLS-CSE304",
    name: "Java Programming",
    course_code: "CSE304",
    section: "Section A",
    room: "AB3-201",
    color: "#3b82f6",
    teacher_id: "TCH-001",
    enrolled_count: 0
  },
  {
    id: "CLS-CSE308",
    name: "Computer Networks",
    course_code: "CSE308",
    section: "Section C",
    room: "AB3-205",
    color: "#10b981",
    teacher_id: "TCH-001",
    enrolled_count: 0
  },
  {
    id: "CLS-CSE401",
    name: "Artificial Intelligence & ML",
    course_code: "CSE401",
    section: "Section A",
    room: "AI Lab 1 (AB3-301)",
    color: "#8b5cf6",
    teacher_id: "TCH-001",
    enrolled_count: 0
  }
];
