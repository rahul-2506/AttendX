import {
  Student,
  ClassSession,
  SystemSettings,
  ActivityEvent,
  HeatmapStudentRow,
  DetectedFace,
  ClassCourse,
  TodayScheduleData,
  ClassAnalytics
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[ApiService] Request to ${endpoint} failed:`, err);
      throw err;
    }
  }

  // --- Today's Timetable / Schedule ---
  async getTodaySchedule(): Promise<TodayScheduleData> {
    try {
      return await this.request<TodayScheduleData>('/sessions/today');
    } catch {
      return {
        date_str: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        time_str: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        day_name: 'Today',
        classes: []
      };
    }
  }

  // --- Classes Management ---
  async getClasses(): Promise<ClassCourse[]> {
    try {
      return await this.request<ClassCourse[]>('/classes');
    } catch {
      return [];
    }
  }

  async getClass(id: string): Promise<ClassCourse | null> {
    try {
      return await this.request<ClassCourse>(`/classes/${id}`);
    } catch {
      return null;
    }
  }

  async createClass(payload: { name: string; course_code: string; section: string; room: string; color?: string }): Promise<ClassCourse> {
    return await this.request<ClassCourse>('/classes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateClass(id: string, payload: Partial<ClassCourse>): Promise<ClassCourse> {
    return await this.request<ClassCourse>(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteClass(id: string): Promise<boolean> {
    try {
      await this.request(`/classes/${id}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  // --- Class Students & Enrollment ---
  async getClassStudents(classId: string): Promise<Student[]> {
    try {
      const data = await this.request<any[]>(`/classes/${classId}/students`);
      return data.map(s => ({
        id: s.id,
        rollNumber: s.roll_number,
        name: s.name,
        avatar: s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        email: s.email || `${s.roll_number.toLowerCase()}@cs.edu`,
        status: (s.stats?.present_sessions > 0 ? 'present' : 'not_detected') as any,
        presencePercentage: s.stats?.average_presence || 0,
        presentMinutes: 0,
        awayMinutes: 0,
        lastSeen: s.stats?.total_sessions > 0 ? 'Enrolled' : 'Not Seen',
        confidence: 96,
        enrolledDate: s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : 'Enrolled',
        department: s.department,
        batch: s.batch,
        faceRegistered: s.face_registered,
        avatarBgColor: s.avatar_bg_color || '#ea5d38'
      }));
    } catch {
      return [];
    }
  }

  async enrollStudentInClass(classId: string, payload: {
    roll_number: string;
    name: string;
    department?: string;
    batch?: string;
    email?: string;
    avatar?: string;
    avatar_bg_color?: string;
    face_sample_base64?: string;
  }): Promise<any> {
    return await this.request(`/classes/${classId}/students`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async importStudentsCsv(classId: string, students: Array<{ student_id: string; name: string; department?: string; batch?: string; email?: string }>): Promise<any> {
    return await this.request(`/classes/${classId}/students/import`, {
      method: 'POST',
      body: JSON.stringify({ students })
    });
  }

  async unenrollStudent(classId: string, studentId: string): Promise<boolean> {
    try {
      await this.request(`/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  // --- Class Sessions & Analytics ---
  async startClassSession(classId: string): Promise<any> {
    return await this.request(`/classes/${classId}/sessions/start`, {
      method: 'POST'
    });
  }

  async getClassSessions(classId: string): Promise<any[]> {
    try {
      return await this.request<any[]>(`/classes/${classId}/sessions`);
    } catch {
      return [];
    }
  }

  async getClassAnalytics(classId: string): Promise<ClassAnalytics | null> {
    try {
      return await this.request<ClassAnalytics>(`/classes/${classId}/analytics`);
    } catch {
      return null;
    }
  }

  // --- Global Students ---
  async getStudents(): Promise<Student[]> {
    try {
      const data = await this.request<any[]>('/students');
      return data.map(s => ({
        id: s.id,
        rollNumber: s.roll_number,
        name: s.name,
        avatar: s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        email: s.email,
        status: 'not_detected',
        presencePercentage: 0,
        presentMinutes: 0,
        awayMinutes: 0,
        lastSeen: 'Enrolled',
        confidence: 96,
        enrolledDate: 'Today',
        department: s.department,
        batch: s.batch,
        faceRegistered: s.face_registered,
        avatarBgColor: s.avatar_bg_color || '#ea5d38'
      }));
    } catch {
      return [];
    }
  }

  async deleteStudent(id: string): Promise<boolean> {
    try {
      await this.request(`/students/${id}`, { method: 'DELETE' });
      return true;
    } catch {
      return true;
    }
  }

  // --- Sessions ---
  async getCurrentSession(): Promise<ClassSession> {
    return await this.request<ClassSession>('/sessions/current');
  }

  async listSessions(classId?: string): Promise<any[]> {
    try {
      const endpoint = classId ? `/sessions?class_id=${classId}` : '/sessions';
      return await this.request<any[]>(endpoint);
    } catch {
      return [];
    }
  }

  async endSession(sessionId: string): Promise<boolean> {
    try {
      await this.request(`/sessions/${sessionId}/end`, { method: 'POST' });
      return true;
    } catch {
      return true;
    }
  }

  // --- Live Attendance ---
  async getLiveAttendance(): Promise<Student[]> {
    try {
      const records = await this.request<Student[]>('/attendance/live');
      return records || [];
    } catch {
      return [];
    }
  }

  async getPresenceHeatmap(): Promise<HeatmapStudentRow[]> {
    try {
      return await this.request<HeatmapStudentRow[]>('/attendance/heatmap');
    } catch {
      return [];
    }
  }

  async getAttendanceEvents(): Promise<ActivityEvent[]> {
    try {
      return await this.request<ActivityEvent[]>('/attendance/events');
    } catch {
      return [];
    }
  }

  async overrideStatus(recordOrStudentId: string, newStatus: string, reason?: string): Promise<boolean> {
    try {
      await this.request(`/attendance/${recordOrStudentId}/override`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus, reason }),
      });
      return true;
    } catch {
      return true;
    }
  }

  // --- Settings ---
  async getSettings(): Promise<SystemSettings> {
    try {
      const data = await this.request<any>('/settings');
      return {
        cameraSource: data.camera_source,
        selectedDeviceId: data.selected_device_id,
        ipStreamUrl: data.ip_stream_url,
        recognitionConfidenceThreshold: Number(data.recognition_confidence_threshold) || 85,
        temporaryAbsenceThresholdMinutes: Number(data.temporary_absence_threshold_minutes) || 5,
        prolongedAbsenceThresholdMinutes: Number(data.prolonged_absence_threshold_minutes) || 10,
        classDurationMinutes: Number(data.class_duration_minutes) || 60,
        autoSnapshotOnAbsence: data.auto_snapshot_on_absence === 'true' || data.auto_snapshot_on_absence === true,
        alertSoundEnabled: data.alert_sound_enabled === 'true' || data.alert_sound_enabled === true,
        notifyFacultyOnProlonged: data.notify_faculty_on_prolonged === 'true' || data.notify_faculty_on_prolonged === true,
        highPrecisionMode: data.high_precision_mode === 'true' || data.high_precision_mode === true,
        fastApiSyncUrl: data.fastapi_sync_url || 'http://localhost:8000/api'
      };
    } catch {
      return {
        cameraSource: 'webcam',
        selectedDeviceId: 'integrated-webcam-01',
        ipStreamUrl: '',
        recognitionConfidenceThreshold: 85,
        temporaryAbsenceThresholdMinutes: 5,
        prolongedAbsenceThresholdMinutes: 10,
        classDurationMinutes: 60,
        autoSnapshotOnAbsence: true,
        alertSoundEnabled: false,
        notifyFacultyOnProlonged: true,
        highPrecisionMode: true,
        fastApiSyncUrl: 'http://localhost:8000/api'
      };
    }
  }

  async updateSettings(settingsData: SystemSettings): Promise<SystemSettings> {
    try {
      await this.request<any>('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          camera_source: settingsData.cameraSource,
          selected_device_id: settingsData.selectedDeviceId,
          ip_stream_url: settingsData.ipStreamUrl,
          recognition_confidence_threshold: String(settingsData.recognitionConfidenceThreshold),
          temporary_absence_threshold_minutes: String(settingsData.temporaryAbsenceThresholdMinutes),
          prolonged_absence_threshold_minutes: String(settingsData.prolongedAbsenceThresholdMinutes),
          class_duration_minutes: String(settingsData.classDurationMinutes),
          auto_snapshot_on_absence: String(settingsData.autoSnapshotOnAbsence),
          alert_sound_enabled: String(settingsData.alertSoundEnabled),
          notify_faculty_on_prolonged: String(settingsData.notifyFacultyOnProlonged),
          high_precision_mode: String(settingsData.highPrecisionMode),
          fastapi_sync_url: settingsData.fastApiSyncUrl
        }),
      });
      return settingsData;
    } catch {
      return settingsData;
    }
  }

  // --- Camera ---
  async getCameraStatus(): Promise<any> {
    try {
      return await this.request('/camera/status');
    } catch {
      return { source: 'browser', connected: true, resolution: '1080p', fps: 30 };
    }
  }

  async processFrame(frameBase64: string, sessionId?: string): Promise<{ detections: DetectedFace[] }> {
    try {
      return await this.request('/camera/process-frame', {
        method: 'POST',
        body: JSON.stringify({ frame_base64: frameBase64, session_id: sessionId }),
      });
    } catch {
      return { detections: [] };
    }
  }

  async captureSnapshot(): Promise<string> {
    try {
      const res = await this.request<any>('/camera/snapshot', { method: 'POST' });
      return res.timestamp || new Date().toLocaleTimeString();
    } catch {
      return new Date().toLocaleTimeString();
    }
  }

  // --- Analytics ---
  async getAnalyticsOverview(classId?: string): Promise<any> {
    try {
      const endpoint = classId ? `/analytics/overview?class_id=${classId}` : '/analytics/overview';
      return await this.request(endpoint);
    } catch {
      return {
        overallAttendance: 0.0,
        overallAttendanceDelta: '+0.0%',
        avgPresenceDurationMinutes: 0.0,
        totalClassDurationMinutes: 60,
        avgQuorumPercentage: 0.0,
        flaggedProlongedCount: 0,
        totalEnrolled: 0
      };
    }
  }

  async getAnalyticsTrends(classId?: string): Promise<any> {
    try {
      const endpoint = classId ? `/analytics/trends?class_id=${classId}` : '/analytics/trends';
      return await this.request(endpoint);
    } catch {
      return {
        weeklyAttendance: [],
        statusDistribution: [],
        departmentBreakdown: []
      };
    }
  }

  // --- Reports & Diagnostics ---
  async getVisionDiagnostics(): Promise<any> {
    try {
      return await this.request('/debug/vision');
    } catch {
      return null;
    }
  }

  async getLiveLogs(limit: number = 100): Promise<any[]> {
    try {
      return await this.request<any[]>(`/debug/logs?limit=${limit}`);
    } catch {
      return [];
    }
  }

  getDownloadLogUrl(): string {
    return `${API_BASE_URL}/debug/logs/download`;
  }

  getExportCsvUrl(sessionId: string): string {
    return `${API_BASE_URL}/reports/session/${sessionId}/csv`;
  }
}

export const apiService = new ApiService();
