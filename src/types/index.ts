// === Enums ===
export type TemplateType = 'internal' | 'external';
export type MeetingMode = 'internal' | 'external_first_time' | 'external_repeat';
export type MeetingType = 'investor' | 'partner' | 'customer' | 'internal' | 'other';
export type PrepStatus = 'pending' | 'generating' | 'ready' | 'failed';
export type NoteType = 'pre_meeting' | 'post_meeting' | 'general';
export type DataQuality = 'rich' | 'moderate' | 'thin';
export type MaterialType = 'attachment' | 'doc_link' | 'deck' | 'other';

export interface ContactProfileSchema {
  name: string;
  headline: string;
  current_role: string;
  current_company: string;
  location: string;
  about_summary: string;
  work_history: { role: string; company: string; duration: string; description_summary: string }[];
  education: { institution: string; degree: string; field: string; years: string }[];
  key_skills: string[];
  recent_activity_themes: string[];
  company_context: string;
  notable_mentions: string[];
  profile_brief: string;
  data_quality: DataQuality;
}

export interface MaterialLink {
  description: string;
  type: MaterialType;
  url?: string;
  date?: string;
}

export interface ParticipantContext {
  email: string;
  name: string;
  isExternal: boolean;
  isNewContact: boolean;
  profile?: ContactProfileSchema;
}

export interface GmailThreadContext {
  participantEmail: string;
  summary: string;
  materials: MaterialLink[];
  lastTouchpoint: { date: Date; summary: string } | null;
}

export interface FathomMeetingNote {
  meetingDate: Date;
  summary: string;
  actionItems: string[];
  decisions: string[];
}

export interface AssembledContext {
  meeting: {
    title: string;
    startTime: Date;
    endTime: Date;
    description?: string;
    conferenceLink?: string;
  };
  participants: ParticipantContext[];
  meetingMode: MeetingMode;
  gmailContext: GmailThreadContext[];
  fathomContext: FathomMeetingNote[];
  manualNotes: { content: string; type: string; createdAt: Date }[];
  dataGaps: string[];
}

export interface PrepPack {
  meetingInfo: {
    title: string;
    time: string;
    participants: { name: string; role?: string; org?: string }[];
    inferredType: string;
    objective?: string;
  };
  participantProfiles?: {
    name: string;
    currentRole: string;
    company: string;
    background: string;
    highlights: string[];
    recentThemes: string[];
  }[];
  companyContext?: {
    name: string;
    description: string;
    stage?: string;
    size?: string;
    recentNews: string[];
  }[];
  priorInteractionSummary: string;
  lastTouchpoint: { date: string; summary: string } | null;
  materialsExchanged: { description: string; type: string; date?: string; link?: string }[];
  openLoops: { item: string; context: string; lastMentioned?: string }[];
  commitments: { commitment: string; by: 'us' | 'them'; status: 'pending' | 'delivered'; context?: string }[];
  talkingPoints: string[];
  nextStepChecklist: string[];
  dataGaps?: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  conferenceLink?: string;
  attendees: { email: string; name?: string; responseStatus?: string }[];
}
