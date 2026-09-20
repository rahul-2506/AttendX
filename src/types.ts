export type AttendanceStatus = 'present' | 'away' | 'prolonged' | 'not_detected' | 'unknown';

export interface DetectedFace {
  track_id?: string;
  id?: string;
  student_id?: string | null;
  studentId?: string;
  name?: string | null;
  confidence: number;
  status: 'recognized' | 'unknown' | 'present' | 'away' | 'prolonged' | 'uncertain';
  bbox: {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    width: number; // percentage 0-100
    height: number; // percentage 0-100
  };
  seat?: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  avatar: string;
  email: string;
  status: AttendanceStatus;
  presencePercentage: number;
  presentMinutes: number;
  awayMinutes: number;
  lastSeen: string;
  confidence: number;
  enrolledDate: string;
  department: string;
  batch: string;
  faceRegistered: boolean;
  avatarBgColor?: string;
  flagReason?: string;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  day_of_week: number; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  start_time: string;
  end_time: string;
  room: string;
}

export interface ClassCourse {
  id: string;
  name: string;
  course_code: string;
  section: string;
  room: string;
  color?: string;
  teacher_id?: string;
  teacher_name?: string;
  enrolled_count: number;
  sessions_count: number;
  timetable: TimetableEntry[];
  created_at: string;
}

export interface TodayScheduleItem {
  timetable_id: string;
  class_id: string;
  course_code: string;
  course_name: string;
  section: string;
  room: string;
  color?: string;
  start_time: string;
  end_time: string;
  enrolled_count: number;
  status: 'NOW' | 'UPCOMING' | 'COMPLETED' | 'ACTIVE';
  active_session_id?: string | null;
}

export interface TodayScheduleData {
  date_str: string;
  time_str: string;
  day_name: string;
  active_session?: {
    id: string;
    class_id: string;
    course_code: string;
    course_name: string;
    section: string;
    room: string;
    start_time: string;
  } | null;
  classes: TodayScheduleItem[];
}

export interface HeatmapStudentRow {
  studentId: string;
  name: string;
  intervals: {
    time: string;
    status: 'present' | 'away' | 'prolonged' | 'untracked';
    value: number; // 0-100 attendance intensity
  }[];
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  studentName?: string;
  studentId?: string;
  message: string;
  type: 'present' | 'away' | 'prolonged' | 'unknown' | 'system' | 'session_ended';
  badgeText?: string;
  iconType?: string;
}

export interface ClassSession {
  id: string;
  classId?: string;
  date: string;
  courseCode: string;
  courseName: string;
  section: string;
  room: string;
  instructor: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalEnrolled: number;
  studentsPresent: number;
  temporarilyAway: number;
  prolongedAbsence: number;
  notDetected?: number;
  unregisteredDetected: number;
  averagePresence: number;
  flaggedStudents: number;
  status: 'active' | 'completed' | 'scheduled';
}

export interface ClassAnalytics {
  class_id: string;
  name: string;
  course_code: string;
  section: string;
  room: string;
  total_enrolled: number;
  total_sessions: number;
  average_attendance_rate: number;
  average_presence_percentage: number;
  average_away_minutes: number;
  prolonged_absence_count: number;
  top_attendees: {
    id: string;
    roll_number: string;
    name: string;
    avatar: string;
    present_sessions: number;
    total_sessions: number;
    attendance_rate: number;
    presence_percentage: number;
  }[];
  low_attendees: {
    id: string;
    roll_number: string;
    name: string;
    avatar: string;
    present_sessions: number;
    total_sessions: number;
    attendance_rate: number;
    presence_percentage: number;
  }[];
  session_trends: {
    session_id: string;
    date: string;
    present_count: number;
    total_enrolled: number;
    average_presence: number;
  }[];
}

export interface SystemSettings {
  cameraSource: 'webcam' | 'usb' | 'ip';
  selectedDeviceId: string;
  ipStreamUrl: string;
  recognitionConfidenceThreshold: number; // e.g. 85%
  temporaryAbsenceThresholdMinutes: number; // default 5 mins
  prolongedAbsenceThresholdMinutes: number; // default 10 mins
  classDurationMinutes: number; // default 60 mins
  autoSnapshotOnAbsence: boolean;
  alertSoundEnabled: boolean;
  notifyFacultyOnProlonged: boolean;
  highPrecisionMode: boolean;
  fastApiSyncUrl: string;
}
