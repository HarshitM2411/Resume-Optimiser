export interface ContactSchema {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

export interface WorkExperienceEntry {
  company: string;
  title: string;
  duration: string;
  location: string | null;
  bullets: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string | null;
  graduation_year: string | null;
}

export interface SkillsSchema {
  languages: string[];
  frameworks: string[];
  tools: string[];
  other: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  tech_stack: string[];
  url: string | null;
}

export interface ResumeSchema {
  contact: ContactSchema;
  summary: string | null;
  work_experience: WorkExperienceEntry[];
  education: EducationEntry[];
  skills: SkillsSchema;
  projects: ProjectEntry[];
  achievements: string[];
  certifications: string[];
}

export type Seniority = "junior" | "mid" | "senior" | "lead" | "executive";
export type Tone = "technical" | "managerial" | "hybrid";

export interface JDAnalysisSchema {
  role_title: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  keywords: string[];
  seniority: Seniority;
  tone: Tone;
  responsibilities: string[];
}

export interface DiffItem {
  section: string;
  before: unknown;
  after: unknown;
}

export interface PendingEditResponse {
  proposed_resume_json: ResumeSchema;
  diff: DiffItem[];
}

export interface VersionEntry {
  resumeJson: ResumeSchema;
  label: string;
  timestamp: string;
}

export interface PendingEdit {
  proposedResumeJson: ResumeSchema;
  diff: DiffItem[];
}

export type PendingEditKind = "tailor" | "section";

export interface AppState {
  resumeJson: ResumeSchema | null;
  versionStack: VersionEntry[];
  pendingEdit: PendingEdit | null;
  pendingEditKind: PendingEditKind | null;
}

export interface ParseResponse {
  resume_json: ResumeSchema;
}

export interface JdSourceRequest {
  jd_text?: string;
  jd_url?: string;
}

export interface TailorRequest extends JdSourceRequest {
  resume_json: ResumeSchema;
}

export interface EditRequest {
  resume_json: ResumeSchema;
  section: string;
  action: string;
  instruction: string;
  index?: number;
  identifier?: string;
  entry_index?: number;
  bullet_index?: number;
}

export interface PdfRequest {
  resume_json: ResumeSchema;
}

export class APIError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = "APIError";
  }
}
