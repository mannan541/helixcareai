export type Role = 'admin' | 'therapist' | 'parent';

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  title?: string | null;
  mobileNumber?: string | null;
  showMobileToParents?: boolean;
  approvedAt?: string | null;
  disabledAt?: string | null;
  childIds?: string[];
  childNames?: string[];
};

export type Child = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  referredBy?: string | null;
  createdAt: string;
  updatedAt: string;
  childCode?: string;
  gender?: string;
  profilePhoto?: string;
  diagnosisType?: string;
  autismLevel?: string;
  diagnosisDate?: string;
  primaryLanguage?: string;
  communicationType?: string;
  iqLevel?: string;
  developmentalAge?: string;
  sensorySensitivity?: string;
  behavioralNotes?: string;
  medicalConditions?: string;
  medications?: string;
  allergies?: string;
  therapyStartDate?: string;
  therapyStatus?: string;
  assignedTherapistId?: string;
  assignedTherapistIds?: string[];
  sessionsPerWeek?: number;
  communicationScore?: number;
  socialScore?: number;
  behavioralScore?: number;
  cognitiveScore?: number;
  motorSkillScore?: number;
  status?: string;
};

export type SessionUserRef = {
  id: string;
  fullName: string;
  email: string;
  title?: string | null;
  mobileNumber?: string;
};

export type Session = {
  id: string;
  childId: string;
  createdBy: string;
  therapistId?: string;
  sessionDate: string;
  durationMinutes: number | null;
  notesText: string | null;
  structuredMetrics: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  appointmentId?: string;
  createdByUser?: SessionUserRef;
  therapistUser?: SessionUserRef;
  updatedByUser?: SessionUserRef;
};

export type SessionComment = {
  id: string;
  sessionId: string;
  userId: string;
  comment: string;
  rating: number | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type SessionMetric = {
  id: string;
  sessionDate: string;
  durationMinutes: number | null;
  structuredMetrics: Record<string, unknown>;
};

export type AppointmentStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

/** Appointment rows come back snake_case from the API. */
export type Appointment = {
  id: string;
  child_id: string;
  therapist_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  _child_first_name?: string;
  _child_last_name?: string;
  _therapist_full_name?: string;
  _therapist_email?: string;
  _therapist_title?: string | null;
  session_id?: string | null;
  session_logged_by_name?: string | null;
};

export type ClinicSlot = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  slot_type: 'available' | 'blocked';
  day_of_week: number[] | null;
  is_active: boolean;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
};

export type ChildReport = {
  child: {
    id: string;
    fullName: string;
    childCode: string | null;
    diagnosis: string | null;
    therapyStatus: string | null;
    scores: {
      communication: number | null;
      social: number | null;
      behavioral: number | null;
      cognitive: number | null;
      motor: number | null;
    };
  };
  period: { from: string; to: string };
  attendance: {
    scheduled: number;
    completed: number;
    cancelled: number;
    missed: number;
    attendanceRate: number | null;
  };
  performance: {
    totalSessions: number;
    totalMinutes: number;
    avgEngagement: number | null;
    avgFocus: number | null;
    avgCommunication: number | null;
    trend: {
      engagementChange: number | null;
      focusChange: number | null;
      communicationChange: number | null;
    };
  };
  progress: {
    snapshots: Array<{
      loggedAt: string;
      communication: number | null;
      social: number | null;
      behavioral: number | null;
      cognitive: number | null;
    }>;
  };
  sessions: Array<{
    id: string;
    date: string;
    durationMinutes: number | null;
    therapyTitle: string | null;
    engagement: number | null;
    focus: number | null;
    communication: number | null;
    notesPreview: string | null;
  }>;
  appointments: Array<{
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    therapistName: string | null;
    hasSession: boolean;
  }>;
};
