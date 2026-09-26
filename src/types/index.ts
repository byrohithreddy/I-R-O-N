export type UserRole = 'TPO' | 'COORDINATOR' | 'HR' | 'STUDENT';

export interface User {
  id: string;
  username: string;
  role: 'TPO' | 'COORDINATOR' | 'HR';
  driveId?: string;
  companyName?: string;
  isActive: boolean;
}

export interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  department: string;
  academicYear: string;
  cgpa: number;
  backlogCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DriveStatus = 'DRAFT' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface DriveCredentials {
  coordinatorUsername: string;
  coordinatorPassword: string;
  hrUsername: string;
  hrPassword: string;
}

export interface Drive {
  id: string;
  companyName: string;
  jobRole: string;
  package: string;
  jobDescription: string;
  eligibilityCriteria: string;
  minimumCgpa: number;
  backlogRule: number | string; // Maximum allowed backlogs (e.g., 0, 1, or 'NOT_APPLICABLE')
  eligibleBranches: string[];
  driveDate: string; // YYYY-MM-DD
  driveTime: string; // HH:mm
  location: string;
  applicationDeadline: string; // ISO string calculated as driveDate 00:00:00
  status: DriveStatus;
  retentionExpiresAt: string; // 6 months from completion or driveDate
  createdAt: string;
  updatedAt: string;
  credentials: DriveCredentials;
}

export type RoundType = 'Aptitude' | 'Coding' | 'Technical' | 'Group Discussion' | 'HR' | 'Other';
export type RoundStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface DriveRound {
  id: string;
  driveId: string;
  roundNumber: number;
  roundName: string;
  roundType: RoundType;
  description: string;
  status: RoundStatus;
  isFinalRound: boolean;
}

export type EligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'OVERRIDDEN';
export type ApplicationStatus = 'APPLIED' | 'IN_PROGRESS' | 'REJECTED' | 'FINAL_SELECTED' | 'PLACED';

export interface Application {
  id: string;
  driveId: string;
  studentId: string;
  applicationEmail: string;
  applicationPhone: string;
  eligibilityStatus: EligibilityStatus;
  eligibilityOverride: boolean;
  overrideReason?: string;
  overrideAt?: string;
  appliedAt: string;
  status: ApplicationStatus;
}

export interface RoundCandidate {
  id: string;
  driveId: string;
  roundId: string;
  studentId: string;
  applicationId: string;
  entryStatus: 'ACTIVE' | 'HOLD';
  sourceRoundId?: string;
  createdAt: string;
}

export type BatchCapacityType = 'LIMITED' | 'UNLIMITED';
export type BatchStatus = 'OPEN' | 'SUBMITTED';

export interface Batch {
  id: string;
  roundId: string;
  driveId: string;
  batchName: string;
  capacityType: BatchCapacityType;
  capacity: number | null;
  status: BatchStatus;
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
  submittedBy?: string;
}

export interface BatchStudent {
  id: string;
  batchId: string;
  roundId: string;
  studentId: string;
  roundCandidateId: string;
  addedBy: string;
  addedAt: string;
}

export type EvaluationAction = 'SELECT' | 'HOLD' | 'NONE';

export interface Evaluation {
  id: string;
  batchId: string;
  batchStudentId: string;
  studentId: string;
  action: EvaluationAction;
  evaluatedAt?: string;
}

export type RoundResultType = 'SELECTED' | 'HOLD' | 'REJECTED';

export interface RoundResult {
  id: string;
  driveId: string;
  roundId: string;
  studentId: string;
  batchId: string;
  result: RoundResultType;
  createdAt: string;
}

export interface Placement {
  id: string;
  studentId: string;
  driveId: string;
  companyName: string;
  jobRole: string;
  package: string;
  finalRoundId: string;
  selectedAt: string;
  createdAt: string;
}

export type ArchiveStatus = 'NOT_STARTED' | 'GENERATED' | 'DOWNLOADED' | 'CONFIRMED';

export interface DriveArchive {
  id: string;
  driveId: string;
  archiveStatus: ArchiveStatus;
  generatedAt?: string;
  downloadedAt?: string;
  confirmedAt?: string;
  manifest?: {
    applicationsCount: number;
    roundsCount: number;
    batchesCount: number;
    evaluationsCount: number;
    finalSelectedCount: number;
  };
}
