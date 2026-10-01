import {
  Student,
  Drive,
  DriveRound,
  DriveCredentials,
  Application,
  RoundCandidate,
  Batch,
  BatchStudent,
  Evaluation,
  RoundResult,
  Placement,
  DriveArchive,
  User,
} from '../types';
import JSZip from 'jszip';
import { api } from './api';
import { calculateIstApplicationDeadline } from '../utils/date';

const STORAGE_KEYS = {
  USERS: 'iron_users_v1',
  DRIVES: 'iron_drives_v1',
  ROUNDS: 'iron_rounds_v1',
  APPLICATIONS: 'iron_applications_v1',
  CANDIDATES: 'iron_candidates_v1',
  BATCHES: 'iron_batches_v1',
  BATCH_STUDENTS: 'iron_batch_students_v1',
  EVALUATIONS: 'iron_evaluations_v1',
  ROUND_RESULTS: 'iron_round_results_v1',
  PLACEMENTS: 'iron_placements_v1',
  ARCHIVES: 'iron_archives_v1',
};

// Student Master DB is backend-authoritative. Students are loaded from /api/sync and are never seeded in the browser.

// Seed Drives with realistic schedules and rounds
const INITIAL_DRIVES: Drive[] = [
  {
    id: 'drv_google',
    companyName: 'Google Cloud',
    jobRole: 'Associate Cloud Engineer',
    package: '₹18.5 LPA',
    jobDescription: 'Build scalable cloud computing infrastructure and distributed backend microservices. Working directly with global enterprise architectures and high-throughput systems.',
    eligibilityCriteria: 'Minimum 7.5 CGPA throughout academics. Zero active backlogs. Circuit branches (CSE, CSIT, ECE) eligible.',
    minimumCgpa: 7.5,
    backlogRule: 0,
    eligibleBranches: ['CSE', 'CSIT', 'ECE'],
    driveDate: '2026-10-15',
    driveTime: '09:00',
    location: 'Main Auditorium & CS Labs',
    applicationDeadline: '2026-10-15T00:00:00Z',
    status: 'ONGOING',
    retentionExpiresAt: '2027-04-15T00:00:00Z',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    credentials: {
      coordinatorUsername: 'coord_google',
      coordinatorPassword: 'coord2026@google',
      hrUsername: 'hr_google',
      hrPassword: 'hr2026@google',
    },
  },
  {
    id: 'drv_tcs',
    companyName: 'TCS Digital',
    jobRole: 'Systems Engineer Specialist',
    package: '₹7.5 LPA',
    jobDescription: 'High-growth technology engineering track for next-gen digital enterprise solutions, AI integration, and cloud modernization.',
    eligibilityCriteria: 'Minimum 7.0 CGPA. Maximum 1 active backlog permitted. Open to all engineering branches.',
    minimumCgpa: 7.0,
    backlogRule: 1,
    eligibleBranches: ['CSE', 'CSIT', 'ECE', 'EEE', 'MECH'],
    driveDate: '2026-10-02',
    driveTime: '10:00',
    location: 'Placement Block Room 302',
    applicationDeadline: '2026-10-02T00:00:00Z',
    status: 'ONGOING',
    retentionExpiresAt: '2027-04-02T00:00:00Z',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-22T14:00:00Z',
    credentials: {
      coordinatorUsername: 'coord_tcs',
      coordinatorPassword: 'coord2026@tcs',
      hrUsername: 'hr_tcs',
      hrPassword: 'hr2026@tcs',
    },
  },
  {
    id: 'drv_microsoft',
    companyName: 'Microsoft',
    jobRole: 'Software Development Engineer I',
    package: '₹22.0 LPA',
    jobDescription: 'Software engineer role in core platform teams. Deep problem-solving skills, algorithms, distributed storage systems, and developer tooling.',
    eligibilityCriteria: 'Minimum 8.0 CGPA with no standing backlogs. CSE and CSIT branches strictly eligible.',
    minimumCgpa: 8.0,
    backlogRule: 0,
    eligibleBranches: ['CSE', 'CSIT'],
    driveDate: '2026-10-28',
    driveTime: '08:30',
    location: 'Virtual + Campus Center',
    applicationDeadline: '2026-10-28T00:00:00Z',
    status: 'UPCOMING',
    retentionExpiresAt: '2027-04-28T00:00:00Z',
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-09-15T09:00:00Z',
    credentials: {
      coordinatorUsername: 'coord_msft',
      coordinatorPassword: 'coord2026@msft',
      hrUsername: 'hr_msft',
      hrPassword: 'hr2026@msft',
    },
  },
  {
    id: 'drv_accenture',
    companyName: 'Accenture',
    jobRole: 'Associate Software Engineer',
    package: '₹4.5 LPA',
    jobDescription: 'Full-stack application development, quality engineering, enterprise cloud migration, and client service management.',
    eligibilityCriteria: 'Minimum 6.5 CGPA. Up to 1 backlog permitted. All disciplines eligible.',
    minimumCgpa: 6.5,
    backlogRule: 1,
    eligibleBranches: ['CSE', 'CSIT', 'ECE', 'EEE', 'MECH'],
    driveDate: '2026-03-20',
    driveTime: '09:00',
    location: 'Online Examination Halls',
    applicationDeadline: '2026-03-20T00:00:00Z',
    status: 'COMPLETED',
    retentionExpiresAt: '2026-09-20T00:00:00Z', // Expired or expiring!
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-03-25T16:00:00Z',
    credentials: {
      coordinatorUsername: 'coord_accenture',
      coordinatorPassword: 'coord2026@acc',
      hrUsername: 'hr_accenture',
      hrPassword: 'hr2026@acc',
    },
  },
];

// Seed Rounds for Google Cloud
const INITIAL_ROUNDS: DriveRound[] = [
  // Google Rounds
  {
    id: 'rnd_g_1',
    driveId: 'drv_google',
    roundNumber: 1,
    roundName: 'Round 1: Online Coding & Aptitude',
    roundType: 'Coding',
    description: '90-minute online coding test covering Data Structures, Algorithms, and System Aptitude.',
    status: 'COMPLETED',
    isFinalRound: false,
  },
  {
    id: 'rnd_g_2',
    driveId: 'drv_google',
    roundNumber: 2,
    roundName: 'Round 2: Technical Interview',
    roundType: 'Technical',
    description: '1-on-1 live coding and technical problem solving with Senior Cloud Architects.',
    status: 'ONGOING',
    isFinalRound: false,
  },
  {
    id: 'rnd_g_3',
    driveId: 'drv_google',
    roundNumber: 3,
    roundName: 'Round 3: Leadership & HR Interview',
    roundType: 'HR',
    description: 'Googleyness, behavioral alignment, cultural fit, and offer discussion.',
    status: 'UPCOMING',
    isFinalRound: true,
  },

  // TCS Rounds
  {
    id: 'rnd_tcs_1',
    driveId: 'drv_tcs',
    roundNumber: 1,
    roundName: 'Round 1: TCS NQT Online Test',
    roundType: 'Aptitude',
    description: 'National Qualifier Test covering Numerical, Reasoning, and Advanced Coding.',
    status: 'COMPLETED',
    isFinalRound: false,
  },
  {
    id: 'rnd_tcs_2',
    driveId: 'drv_tcs',
    roundNumber: 2,
    roundName: 'Round 2: Technical & Managerial',
    roundType: 'Technical',
    description: 'In-depth assessment of engineering projects, core subjects, and analytical competence.',
    status: 'COMPLETED',
    isFinalRound: false,
  },
  {
    id: 'rnd_tcs_3',
    driveId: 'drv_tcs',
    roundNumber: 3,
    roundName: 'Round 3: Final HR Interview',
    roundType: 'HR',
    description: 'Final Round selection. Note: Rule 22 strictly forbids HOLD. Only SELECT or No Action.',
    status: 'ONGOING',
    isFinalRound: true,
  },

  // Microsoft Rounds
  {
    id: 'rnd_msft_1',
    driveId: 'drv_microsoft',
    roundNumber: 1,
    roundName: 'Round 1: Codility Online Assessment',
    roundType: 'Coding',
    description: '3 algorithmic problems on Codility platform with test-case scoring.',
    status: 'UPCOMING',
    isFinalRound: false,
  },
  {
    id: 'rnd_msft_2',
    driveId: 'drv_microsoft',
    roundNumber: 2,
    roundName: 'Round 2: Virtual Technical Round',
    roundType: 'Technical',
    description: 'System design, tree/graph traversal, and clean coding standards.',
    status: 'UPCOMING',
    isFinalRound: false,
  },
  {
    id: 'rnd_msft_3',
    driveId: 'drv_microsoft',
    roundNumber: 3,
    roundName: 'Round 3: AA / Hiring Manager Interview',
    roundType: 'HR',
    description: 'As-Appropriate interview assessing long-term engineering potential and cultural alignment.',
    status: 'UPCOMING',
    isFinalRound: true,
  },

  // Accenture Rounds (Completed historical drive)
  {
    id: 'rnd_acc_1',
    driveId: 'drv_accenture',
    roundNumber: 1,
    roundName: 'Round 1: Cognitive Assessment',
    roundType: 'Aptitude',
    description: 'Cognitive and technical assessment.',
    status: 'COMPLETED',
    isFinalRound: false,
  },
  {
    id: 'rnd_acc_2',
    driveId: 'drv_accenture',
    roundNumber: 2,
    roundName: 'Round 2: Technical & HR Interview',
    roundType: 'HR',
    description: 'Final interview and placement selection.',
    status: 'COMPLETED',
    isFinalRound: true,
  },
];

// Seed Applications
const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'app_g_01',
    driveId: 'drv_google',
    studentId: 'std_01', // Rohith
    applicationEmail: 'rohith.varma@college.edu',
    applicationPhone: '+91 98480 12345',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-10T11:00:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_g_02',
    driveId: 'drv_google',
    studentId: 'std_02', // Ananya
    applicationEmail: 'ananya.s@college.edu',
    applicationPhone: '+91 98480 23456',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-10T12:30:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_g_03',
    driveId: 'drv_google',
    studentId: 'std_03', // Rahul
    applicationEmail: 'rahul.n@college.edu',
    applicationPhone: '+91 98480 34567',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-11T09:15:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_g_04',
    driveId: 'drv_google',
    studentId: 'std_04', // Sai Teja
    applicationEmail: 'saiteja.r@college.edu',
    applicationPhone: '+91 98480 45678',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-11T10:00:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_g_07',
    driveId: 'drv_google',
    studentId: 'std_07', // Meera
    applicationEmail: 'meera.iyer@college.edu',
    applicationPhone: '+91 98480 78901',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-12T14:20:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_g_09',
    driveId: 'drv_google',
    studentId: 'std_09', // Deepika
    applicationEmail: 'deepika.sen@college.edu',
    applicationPhone: '+91 98480 90123',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-12T15:00:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_g_10',
    driveId: 'drv_google',
    studentId: 'std_10', // Aditya
    applicationEmail: 'aditya.k@college.edu',
    applicationPhone: '+91 98480 01234',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-13T09:40:00Z',
    status: 'IN_PROGRESS',
  },

  // TCS Applications
  {
    id: 'app_tcs_01',
    driveId: 'drv_tcs',
    studentId: 'std_01',
    applicationEmail: 'rohith.varma@college.edu',
    applicationPhone: '+91 98480 12345',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-06T10:00:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_tcs_03',
    driveId: 'drv_tcs',
    studentId: 'std_03',
    applicationEmail: 'rahul.n@college.edu',
    applicationPhone: '+91 98480 34567',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-06T10:30:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_tcs_04',
    driveId: 'drv_tcs',
    studentId: 'std_04',
    applicationEmail: 'saiteja.r@college.edu',
    applicationPhone: '+91 98480 45678',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-06T11:00:00Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'app_tcs_05',
    driveId: 'drv_tcs',
    studentId: 'std_05', // Pooja (1 backlog, eligible for TCS!)
    applicationEmail: 'pooja.h@college.edu',
    applicationPhone: '+91 98480 56789',
    eligibilityStatus: 'ELIGIBLE',
    eligibilityOverride: false,
    appliedAt: '2026-09-06T11:30:00Z',
    status: 'IN_PROGRESS',
  },
];

// Seed Candidates for Google Round 2 (Technical Interview)
const INITIAL_CANDIDATES: RoundCandidate[] = [
  // Google Round 2 Candidates (progressed from Round 1)
  {
    id: 'cand_g2_01',
    driveId: 'drv_google',
    roundId: 'rnd_g_2',
    studentId: 'std_01',
    applicationId: 'app_g_01',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_g_1',
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'cand_g2_02',
    driveId: 'drv_google',
    roundId: 'rnd_g_2',
    studentId: 'std_02',
    applicationId: 'app_g_02',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_g_1',
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'cand_g2_03',
    driveId: 'drv_google',
    roundId: 'rnd_g_2',
    studentId: 'std_03',
    applicationId: 'app_g_03',
    entryStatus: 'HOLD', // Carried over as HOLD candidate from Round 1!
    sourceRoundId: 'rnd_g_1',
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'cand_g2_04',
    driveId: 'drv_google',
    roundId: 'rnd_g_2',
    studentId: 'std_04',
    applicationId: 'app_g_04',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_g_1',
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'cand_g2_07',
    driveId: 'drv_google',
    roundId: 'rnd_g_2',
    studentId: 'std_07',
    applicationId: 'app_g_07',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_g_1',
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'cand_g2_09',
    driveId: 'drv_google',
    roundId: 'rnd_g_2',
    studentId: 'std_09',
    applicationId: 'app_g_09',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_g_1',
    createdAt: '2026-09-20T10:00:00Z',
  },

  // TCS Round 3 (Final HR) Candidates
  {
    id: 'cand_tcs3_01',
    driveId: 'drv_tcs',
    roundId: 'rnd_tcs_3',
    studentId: 'std_01',
    applicationId: 'app_tcs_01',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_tcs_2',
    createdAt: '2026-09-22T14:00:00Z',
  },
  {
    id: 'cand_tcs3_03',
    driveId: 'drv_tcs',
    roundId: 'rnd_tcs_3',
    studentId: 'std_03',
    applicationId: 'app_tcs_03',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_tcs_2',
    createdAt: '2026-09-22T14:00:00Z',
  },
  {
    id: 'cand_tcs3_04',
    driveId: 'drv_tcs',
    roundId: 'rnd_tcs_3',
    studentId: 'std_04',
    applicationId: 'app_tcs_04',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_tcs_2',
    createdAt: '2026-09-22T14:00:00Z',
  },
  {
    id: 'cand_tcs3_05',
    driveId: 'drv_tcs',
    roundId: 'rnd_tcs_3',
    studentId: 'std_05',
    applicationId: 'app_tcs_05',
    entryStatus: 'ACTIVE',
    sourceRoundId: 'rnd_tcs_2',
    createdAt: '2026-09-22T14:00:00Z',
  },
];

// Seed Batches
const INITIAL_BATCHES: Batch[] = [
  // Google Round 2 Batches
  {
    id: 'btch_g2_1',
    roundId: 'rnd_g_2',
    driveId: 'drv_google',
    batchName: 'Batch 1 - Systems & Algorithms',
    capacityType: 'LIMITED',
    capacity: 3,
    status: 'OPEN',
    createdBy: 'coord_google',
    createdAt: '2026-09-21T09:00:00Z',
  },
  {
    id: 'btch_g2_2',
    roundId: 'rnd_g_2',
    driveId: 'drv_google',
    batchName: 'Batch 2 - Cloud Architecture',
    capacityType: 'UNLIMITED',
    capacity: null,
    status: 'OPEN',
    createdBy: 'coord_google',
    createdAt: '2026-09-21T09:30:00Z',
  },

  // TCS Round 3 Batches (Final Round demo)
  {
    id: 'btch_tcs3_1',
    roundId: 'rnd_tcs_3',
    driveId: 'drv_tcs',
    batchName: 'Final Batch A - HR Panel 1',
    capacityType: 'LIMITED',
    capacity: 10,
    status: 'OPEN',
    createdBy: 'coord_tcs',
    createdAt: '2026-09-23T08:30:00Z',
  },
];

// Seed Batch Students
const INITIAL_BATCH_STUDENTS: BatchStudent[] = [
  // Google Batch 1 has Rohith and Ananya
  {
    id: 'bs_g2_1',
    batchId: 'btch_g2_1',
    roundId: 'rnd_g_2',
    studentId: 'std_01',
    roundCandidateId: 'cand_g2_01',
    addedBy: 'coord_google',
    addedAt: '2026-09-21T09:10:00Z',
  },
  {
    id: 'bs_g2_2',
    batchId: 'btch_g2_1',
    roundId: 'rnd_g_2',
    studentId: 'std_02',
    roundCandidateId: 'cand_g2_02',
    addedBy: 'coord_google',
    addedAt: '2026-09-21T09:12:00Z',
  },

  // TCS Final Batch A has Rohith, Rahul, Sai Teja
  {
    id: 'bs_tcs_1',
    batchId: 'btch_tcs3_1',
    roundId: 'rnd_tcs_3',
    studentId: 'std_01',
    roundCandidateId: 'cand_tcs3_01',
    addedBy: 'coord_tcs',
    addedAt: '2026-09-23T09:00:00Z',
  },
  {
    id: 'bs_tcs_2',
    batchId: 'btch_tcs3_1',
    roundId: 'rnd_tcs_3',
    studentId: 'std_03',
    roundCandidateId: 'cand_tcs3_03',
    addedBy: 'coord_tcs',
    addedAt: '2026-09-23T09:05:00Z',
  },
  {
    id: 'bs_tcs_3',
    batchId: 'btch_tcs3_1',
    roundId: 'rnd_tcs_3',
    studentId: 'std_04',
    roundCandidateId: 'cand_tcs3_04',
    addedBy: 'coord_tcs',
    addedAt: '2026-09-23T09:10:00Z',
  },
];

// Initial Placements
const INITIAL_PLACEMENTS: Placement[] = [
  {
    id: 'plc_01',
    studentId: 'std_07', // Meera Iyer
    driveId: 'drv_accenture',
    companyName: 'Accenture',
    jobRole: 'Associate Software Engineer',
    package: '₹4.5 LPA',
    finalRoundId: 'rnd_acc_2',
    selectedAt: '2026-03-24T15:00:00Z',
    createdAt: '2026-03-24T15:00:00Z',
  },
  {
    id: 'plc_02',
    studentId: 'std_08', // Karthik Subramanian
    driveId: 'drv_accenture',
    companyName: 'Accenture',
    jobRole: 'Associate Software Engineer',
    package: '₹4.5 LPA',
    finalRoundId: 'rnd_acc_2',
    selectedAt: '2026-03-24T15:00:00Z',
    createdAt: '2026-03-24T15:00:00Z',
  },
];

// Helper functions for LocalStorage persistence & Real-Time Cloudflare D1 Backend Sync
class IronStorage {
  private isSyncing = false;
  private syncListeners: Set<() => void> = new Set();
  private lastSyncFingerprint = '';
  private memoryCache: Map<string, any> = new Map();
  private studentsCache: Student[] = [];

  private get<T>(key: string, defaultValue: T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }
    try {
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : defaultValue;
      this.memoryCache.set(key, parsed);
      return parsed;
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    this.memoryCache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key}:`, e);
    }
  }

  private pendingDriveUpdates = new Map<string, { data: Drive; timestamp: number }>();

  public clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  public subscribe(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  public notifyListeners(): void {
    this.syncListeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error notifying sync listener:', err);
      }
    });
  }

  public async syncWithBackend(): Promise<boolean> {
    if (this.isSyncing) return false;
    this.isSyncing = true;
    try {
      const data = await api.sync.getFullState();
      if (data) {
        // Fast & comprehensive fingerprint to detect any entity changes, additions, or updates
        const currentFingerprint = JSON.stringify({
          stSummary: `${data.students?.length}:${data.students?.[0]?.updatedAt || ''}:${data.students?.[data.students.length - 1]?.updatedAt || ''}:${data.students?.[0]?.cgpa || ''}`,
          drSummary: data.drives?.map((d) => `${d.id}:${d.status}:${d.updatedAt || ''}:${d.applicationDeadline || ''}`).join(','),
          rdSummary: data.rounds?.map((r) => `${r.id}:${r.status}:${r.isFinalRound}`).join(','),
          apSummary: data.applications?.map((a) => `${a.id}:${a.eligibilityStatus}:${a.status}`).join(','),
          cdSummary: `${data.candidates?.length}:${data.candidates?.map((c) => `${c.id}:${c.entryStatus}`).join(',')}`,
          btSummary: data.batches?.map((b) => `${b.id}:${b.status}:${b.capacity}`).join(','),
          bsSummary: `${data.batchStudents?.length}:${data.batchStudents?.map((bs) => `${bs.batchId}:${bs.studentId}`).join(',')}`,
          evSummary: `${data.evaluations?.length}:${data.evaluations?.map((e) => `${e.batchId}:${e.studentId}:${e.action}`).join(',')}`,
          rrSummary: `${data.roundResults?.length}:${data.roundResults?.map((r) => `${r.roundId}:${r.studentId}:${r.result}`).join(',')}`,
          plSummary: data.placements?.length,
        });

        if (currentFingerprint === this.lastSyncFingerprint) {
          return false;
        }
        this.lastSyncFingerprint = currentFingerprint;

        if (Array.isArray(data.students)) {
          // D1 is authoritative, including the valid empty state.
          this.studentsCache = data.students;
          this.notifyListeners();
        }
        if (Array.isArray(data.drives)) {
          // Merge drives while preserving recent local optimistic updates
          const mergedDrives = data.drives.map((d) => {
            const pending = this.pendingDriveUpdates.get(d.id);
            if (pending && Date.now() - pending.timestamp < 15000) {
              return { ...d, ...pending.data };
            }
            return d;
          });
          this.set(STORAGE_KEYS.DRIVES, mergedDrives);
        }
        if (Array.isArray(data.rounds)) {
          // Deduplicate rounds by (driveId, roundNumber) as authoritative defense-in-depth
          const uniqueRoundsMap = new Map<string, DriveRound>();
          for (const r of data.rounds) {
            const key = `${r.driveId}_${r.roundNumber}`;
            if (!uniqueRoundsMap.has(key)) {
              uniqueRoundsMap.set(key, r);
            }
          }
          this.set(STORAGE_KEYS.ROUNDS, Array.from(uniqueRoundsMap.values()));
        }
        if (Array.isArray(data.applications)) {
          this.set(STORAGE_KEYS.APPLICATIONS, data.applications);
        }
        if (Array.isArray(data.candidates)) {
          this.set(STORAGE_KEYS.CANDIDATES, data.candidates);
        }
        if (Array.isArray(data.batches)) {
          this.set(STORAGE_KEYS.BATCHES, data.batches);
        }
        if (Array.isArray(data.batchStudents)) {
          this.set(STORAGE_KEYS.BATCH_STUDENTS, data.batchStudents);
        }
        if (Array.isArray(data.evaluations)) {
          this.set(STORAGE_KEYS.EVALUATIONS, data.evaluations);
        }
        if (Array.isArray(data.roundResults)) {
          this.set(STORAGE_KEYS.ROUND_RESULTS, data.roundResults);
        }
        if (Array.isArray(data.placements)) {
          this.set(STORAGE_KEYS.PLACEMENTS, data.placements);
        }
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Backend sync warning (offline or fallback):', err);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  constructor() {
    this.init();
    // Background sync on load
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.syncWithBackend().catch(() => {});
      }, 50);
    }
  }

  public init(forceReset = false): void {
    // Student Master DB is authoritative in the backend. Never seed or restore
    // student records from browser storage, including stale data from older builds.
    this.memoryCache.delete('iron_students_v1');
    try {
      localStorage.removeItem('iron_students_v1');
    } catch {}

    // Keep the existing local/demo initialization for non-student entities.
    // Backend sync will replace these with the authoritative server state.
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.DRIVES)) {
      this.set(STORAGE_KEYS.DRIVES, INITIAL_DRIVES);
      this.set(STORAGE_KEYS.ROUNDS, INITIAL_ROUNDS);
      this.set(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
      this.set(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
      this.set(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
      this.set(STORAGE_KEYS.BATCH_STUDENTS, INITIAL_BATCH_STUDENTS);
      this.set(STORAGE_KEYS.EVALUATIONS, []);
      this.set(STORAGE_KEYS.ROUND_RESULTS, []);
      this.set(STORAGE_KEYS.PLACEMENTS, INITIAL_PLACEMENTS);
      this.set(STORAGE_KEYS.ARCHIVES, []);
    }
  }

  // --- STUDENTS (Student Master DB) ---
  public getStudents(): Student[] {
    return this.studentsCache;
  }

  public getStudentCount(): number {
    return this.studentsCache.length;
  }

  public getStudentById(id: string): Student | undefined {
    return this.studentsCache.find((s) => s.id === id);
  }

  public getStudentByRollNumber(rollNumber: string): Student | undefined {
    const cleanRoll = rollNumber.trim().toUpperCase();
    return this.studentsCache.find(
      (s) => s.rollNumber.trim().toUpperCase() === cleanRoll
    );
  }

  public saveStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Student {
    const students = this.studentsCache;
    const now = new Date().toISOString();
    const cleanRoll = studentData.rollNumber.trim().toUpperCase();

    const existingWithRoll = students.find(
      (s) => s.rollNumber.toUpperCase() === cleanRoll && s.id !== id
    );
    if (existingWithRoll) {
      throw new Error(`Roll number ${cleanRoll} is already registered in Student Master DB.`);
    }

    if (id) {
      const idx = students.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Student not found.');
      const updated: Student = {
        ...students[idx],
        ...studentData,
        rollNumber: cleanRoll,
        updatedAt: now,
      };
      this.studentsCache = students.map((s, i) => (i === idx ? updated : s));
      this.notifyListeners();
      api.students.update(id, updated)
        .then(() => this.syncWithBackend())
        .catch(console.warn);
      return updated;
    }

    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rollNumber: cleanRoll,
      createdAt: now,
      updatedAt: now,
    };
    this.studentsCache = [newStudent, ...students];
    this.notifyListeners();
    api.students.create(newStudent)
      .then(() => this.syncWithBackend())
      .catch(console.warn);
    return newStudent;
  }

  public deleteStudent(id: string): void {
    this.studentsCache = this.studentsCache.filter((s) => s.id !== id);
    this.notifyListeners();
    api.students.delete(id)
      .then(() => this.syncWithBackend())
      .catch(console.warn);
  }

  // --- DRIVES ---
  public getDriveCredentials(driveOrId: Drive | string): DriveCredentials {
    const drive = typeof driveOrId === 'string' ? this.getDriveById(driveOrId) : driveOrId;
    if (drive?.credentials?.coordinatorUsername && drive?.credentials?.coordinatorPassword) {
      return drive.credentials;
    }
    const companySlug = (drive?.companyName || 'drive')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return {
      coordinatorUsername: `coord_${companySlug}`,
      coordinatorPassword: `coord2026@${companySlug}`,
      hrUsername: `hr_${companySlug}`,
      hrPassword: `hr2026@${companySlug}`,
    };
  }

  public getDrives(): Drive[] {
    const raw = this.get<Drive[]>(STORAGE_KEYS.DRIVES, INITIAL_DRIVES);
    return raw.map((d) => {
      const companySlug = (d.companyName || 'drive')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const credentials: DriveCredentials = {
        coordinatorUsername: d.credentials?.coordinatorUsername || `coord_${companySlug}`,
        coordinatorPassword: d.credentials?.coordinatorPassword || `coord2026@${companySlug}`,
        hrUsername: d.credentials?.hrUsername || `hr_${companySlug}`,
        hrPassword: d.credentials?.hrPassword || `hr2026@${companySlug}`,
      };
      return { ...d, credentials };
    });
  }

  public getDriveById(id: string): Drive | undefined {
    const drive = this.getDrives().find((d) => d.id === id);
    if (!drive) return undefined;
    return {
      ...drive,
      credentials: this.getDriveCredentials(drive),
    };
  }

  public saveDrive(
    driveData: Partial<Drive>,
    id?: string,
    customRounds?: Array<Omit<DriveRound, 'id' | 'driveId'>>
  ): Drive {
    const drives = this.getDrives();
    const now = new Date().toISOString();

    // Calculate deadline as driveDate 00:00:00 (Rule 10 & 13)
    const driveDate = driveData.driveDate || new Date().toISOString().split('T')[0];
    const applicationDeadline = calculateIstApplicationDeadline(driveDate);

    // Retention expires 6 months after drive date (Rule 30)
    const driveDateObj = new Date(driveDate);
    const retentionDate = new Date(driveDateObj);
    retentionDate.setMonth(retentionDate.getMonth() + 6);
    const retentionExpiresAt = retentionDate.toISOString();

    if (id) {
      const idx = drives.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error('Drive not found.');
      const updated: Drive = {
        ...drives[idx],
        ...driveData,
        applicationDeadline,
        retentionExpiresAt,
        updatedAt: now,
      };
      drives[idx] = updated;
      this.pendingDriveUpdates.set(id, { data: updated, timestamp: Date.now() });
      this.set(STORAGE_KEYS.DRIVES, drives);
      this.notifyListeners();
      return updated;
    } else {
      const companySlug = (driveData.companyName || 'drive')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const newDrive: Drive = {
        id: `drv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        companyName: driveData.companyName || 'Untitled Company',
        jobRole: driveData.jobRole || 'Graduate Engineer Trainee',
        package: driveData.package || '₹6.0 LPA',
        jobDescription: driveData.jobDescription || '',
        eligibilityCriteria: driveData.eligibilityCriteria || '',
        minimumCgpa: driveData.minimumCgpa ?? 7.0,
        backlogRule: driveData.backlogRule ?? 0,
        eligibleBranches: driveData.eligibleBranches || ['CSE', 'CSIT', 'ECE'],
        driveDate,
        driveTime: driveData.driveTime || '09:00',
        location: driveData.location || 'Campus Auditorium',
        applicationDeadline,
        status: driveData.status || 'UPCOMING',
        retentionExpiresAt,
        createdAt: now,
        updatedAt: now,
        credentials: {
          coordinatorUsername: `coord_${companySlug}`,
          coordinatorPassword: `coord2026@${companySlug}`,
          hrUsername: `hr_${companySlug}`,
          hrPassword: `hr2026@${companySlug}`,
        },
      };
      drives.unshift(newDrive);
      this.pendingDriveUpdates.set(newDrive.id, { data: newDrive, timestamp: Date.now() });
      this.set(STORAGE_KEYS.DRIVES, drives);

      // Save custom rounds locally with syncToBackend = false (Rule: single authoritative drive+rounds backend path)
      if (customRounds && customRounds.length > 0) {
        customRounds.forEach((r, idx) => {
          this.saveRound({
            id: `rnd_${newDrive.id}_${idx + 1}`,
            ...r,
            driveId: newDrive.id,
            roundNumber: idx + 1,
            status: r.status || 'UPCOMING',
          }, undefined, false);
        });
      } else {
        // Default 3 rounds
        this.saveRound({
          id: `rnd_${newDrive.id}_1`,
          driveId: newDrive.id,
          roundNumber: 1,
          roundName: 'Round 1: Screening & Aptitude',
          roundType: 'Aptitude',
          description: 'First screening assessment.',
          status: 'UPCOMING',
          isFinalRound: false,
        }, undefined, false);

        this.saveRound({
          id: `rnd_${newDrive.id}_2`,
          driveId: newDrive.id,
          roundNumber: 2,
          roundName: 'Round 2: Technical Interview',
          roundType: 'Technical',
          description: 'Technical evaluation round.',
          status: 'UPCOMING',
          isFinalRound: false,
        }, undefined, false);

        this.saveRound({
          id: `rnd_${newDrive.id}_3`,
          driveId: newDrive.id,
          roundNumber: 3,
          roundName: 'Round 3: Final HR Interview',
          roundType: 'HR',
          description: 'Final round for placement selection.',
          status: 'UPCOMING',
          isFinalRound: true,
        }, undefined, false);
      }

      this.notifyListeners();
      return newDrive;
    }
  }

  public async saveDriveAsync(
    driveData: Partial<Drive>,
    id?: string,
    customRounds?: Array<Omit<DriveRound, 'id' | 'driveId'>>
  ): Promise<Drive> {
    const saved = this.saveDrive(driveData, id, customRounds);
    try {
      if (id) {
        await api.drives.update(id, saved);
        this.pendingDriveUpdates.delete(id);
        await this.syncWithBackend().catch(() => {});
      } else {
        const roundsToSend = customRounds && customRounds.length > 0
          ? customRounds.map((r, idx) => ({
              id: `rnd_${saved.id}_${idx + 1}`,
              roundNumber: idx + 1,
              roundName: r.roundName,
              roundType: r.roundType || 'Technical',
              description: r.description || '',
              status: r.status || 'UPCOMING',
              isFinalRound: Boolean(r.isFinalRound),
            }))
          : [
              { id: `rnd_${saved.id}_1`, roundNumber: 1, roundName: 'Round 1: Screening & Aptitude', roundType: 'Aptitude' as const, isFinalRound: false },
              { id: `rnd_${saved.id}_2`, roundNumber: 2, roundName: 'Round 2: Technical Interview', roundType: 'Technical' as const, isFinalRound: false },
              { id: `rnd_${saved.id}_3`, roundNumber: 3, roundName: 'Round 3: Final HR Interview', roundType: 'HR' as const, isFinalRound: true },
            ];

        await api.drives.create({
          ...saved,
          rounds: roundsToSend,
        });
        this.pendingDriveUpdates.delete(saved.id);
        await this.syncWithBackend().catch(() => {});
      }
    } catch (e) {
      console.warn('Async drive backend sync error:', e);
    }
    return saved;
  }

  // --- ROUNDS ---
  public getRounds(driveId?: string): DriveRound[] {
    const rounds = this.get<DriveRound[]>(STORAGE_KEYS.ROUNDS, INITIAL_ROUNDS);
    if (driveId) {
      return rounds
        .filter((r) => r.driveId === driveId)
        .sort((a, b) => a.roundNumber - b.roundNumber);
    }
    return rounds;
  }

  public getRoundById(id: string): DriveRound | undefined {
    return this.getRounds().find((r) => r.id === id);
  }

  public saveRound(roundData: Partial<DriveRound>, id?: string, syncToBackend: boolean = true): DriveRound {
    const rounds = this.getRounds();
    if (id) {
      const idx = rounds.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Round not found.');
      const updated = { ...rounds[idx], ...roundData };
      rounds[idx] = updated;
      this.set(STORAGE_KEYS.ROUNDS, rounds);
      this.notifyListeners();
      return updated;
    } else {
      const newRound: DriveRound = {
        id: roundData.id || `rnd_${roundData.driveId || 'rnd'}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        driveId: roundData.driveId!,
        roundNumber: roundData.roundNumber || rounds.filter((r) => r.driveId === roundData.driveId).length + 1,
        roundName: roundData.roundName || 'Round',
        roundType: roundData.roundType || 'Aptitude',
        description: roundData.description || '',
        status: roundData.status || 'UPCOMING',
        isFinalRound: roundData.isFinalRound || false,
      };

      // Ensure no duplicate (driveId, roundNumber) exists locally
      const existingIdx = rounds.findIndex(
        (r) => r.driveId === newRound.driveId && r.roundNumber === newRound.roundNumber
      );
      if (existingIdx >= 0) {
        rounds[existingIdx] = newRound;
      } else {
        rounds.push(newRound);
      }

      this.set(STORAGE_KEYS.ROUNDS, rounds);
      this.notifyListeners();

      if (syncToBackend) {
        api.rounds.create(newRound).catch(console.warn);
      }
      return newRound;
    }
  }

  public deleteRound(id: string): void {
    const rounds = this.getRounds().filter((r) => r.id !== id);
    this.set(STORAGE_KEYS.ROUNDS, rounds);
    this.notifyListeners();
    api.rounds.delete(id).then(() => this.syncWithBackend()).catch(console.warn);
  }

  // --- ELIGIBILITY & APPLICATIONS ---
  public checkEligibility(
    student: Student,
    drive: Drive
  ): { isEligible: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // CGPA Check
    if (student.cgpa < drive.minimumCgpa) {
      reasons.push(
        `CGPA (${student.cgpa.toFixed(2)}) is below the minimum required (${drive.minimumCgpa.toFixed(2)})`
      );
    }

    // Backlog Check (Rule: 'NOT_APPLICABLE' or -1 means no backlog restriction)
    const isBacklogRestricted =
      drive.backlogRule !== 'NOT_APPLICABLE' &&
      drive.backlogRule !== 'Not applicable' &&
      drive.backlogRule !== -1 &&
      drive.backlogRule !== null &&
      drive.backlogRule !== undefined;

    if (isBacklogRestricted && student.backlogCount > Number(drive.backlogRule)) {
      reasons.push(
        `Active backlogs (${student.backlogCount}) exceeds maximum allowed (${drive.backlogRule})`
      );
    }

    // Branch Check
    const normalizedStudentBranch = student.branch.trim().toUpperCase();
    const branchAllowed = drive.eligibleBranches.some(
      (b) => b.trim().toUpperCase() === normalizedStudentBranch
    );
    if (!branchAllowed) {
      reasons.push(
        `Branch (${student.branch}) is not in eligible branches list: ${drive.eligibleBranches.join(', ')}`
      );
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
    };
  }

  public getApplications(driveId?: string): Application[] {
    const apps = this.get<Application[]>(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    if (driveId) {
      return apps.filter((a) => a.driveId === driveId);
    }
    return apps;
  }

  public applyToDrive(
    driveId: string,
    rollNumber: string,
    email: string,
    phone: string
  ): Application {
    const drive = this.getDriveById(driveId);
    if (!drive) throw new Error('Drive not found.');

    // 1. Deadline Check (Rule 10 & 11)
    const now = new Date();
    const deadline = new Date(drive.applicationDeadline);
    if (now >= deadline) {
      throw new Error(
        `Applications for this drive closed on ${drive.driveDate} at 00:00. No further applications can be accepted.`
      );
    }

    // 2. Student lookup in Student Master DB (Rule 4 & 15)
    const student = this.getStudentByRollNumber(rollNumber);
    if (!student) {
      throw new Error(
        `Roll number ${rollNumber} was not found in the College Student Master Database. Contact the TPO office.`
      );
    }

    // 3. Duplicate Application Check (Rule 12 & 18)
    const existingApps = this.getApplications(driveId);
    const alreadyApplied = existingApps.some((a) => a.studentId === student.id);
    if (alreadyApplied) {
      throw new Error(`You have already submitted an application for ${drive.companyName}. Duplicate applications are prohibited.`);
    }

    // 4. Eligibility Check (Rule 8)
    const eligibility = this.checkEligibility(student, drive);
    if (!eligibility.isEligible) {
      throw new Error(`Application rejected: ${eligibility.reasons.join('. ')}`);
    }

    // 5. Create Application
    const newApp: Application = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      driveId,
      studentId: student.id,
      applicationEmail: email.trim(),
      applicationPhone: phone.trim(),
      eligibilityStatus: 'ELIGIBLE',
      eligibilityOverride: false,
      appliedAt: new Date().toISOString(),
      status: 'APPLIED',
    };

    const allApps = this.getApplications();
    allApps.unshift(newApp);
    this.set(STORAGE_KEYS.APPLICATIONS, allApps);

    // 6. Automatically add to Round 1 Candidates pool
    const rounds = this.getRounds(driveId);
    if (rounds.length > 0) {
      const round1 = rounds[0];
      const candidates = this.getCandidates();
      const newCand: RoundCandidate = {
        id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        driveId,
        roundId: round1.id,
        studentId: student.id,
        applicationId: newApp.id,
        entryStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      candidates.push(newCand);
      this.set(STORAGE_KEYS.CANDIDATES, candidates);
    }

    this.notifyListeners();
    // Persist to backend D1 & trigger sync
    api.applications.apply({
      driveId,
      rollNumber,
      email,
      phone,
    }).then(() => this.syncWithBackend()).catch(console.warn);

    return newApp;
  }

  /**
   * High-Concurrency Authoritative Application Submission:
   * Directly awaits backend D1 atomic batch processing. Only updates local state upon verified HTTP 201 response.
   */
  public async applyToDriveAsync(
    driveId: string,
    rollNumber: string,
    email: string,
    phone: string
  ): Promise<Application> {
    const cleanRoll = rollNumber.trim().toUpperCase();

    // 1. Authoritative D1 Batch application execution
    const res = await api.applications.apply({
      driveId,
      rollNumber: cleanRoll,
      email: email.trim(),
      phone: phone.trim(),
    });

    if (!res || !res.applicationId) {
      throw new Error('Application submission was rejected by the placement server.');
    }

    // 2. Locate or resolve the student record
    let student = this.getStudentByRollNumber(cleanRoll);
    if (!student && res.student) {
      const studentData = res.student as any;
      const newStudent: Student = {
        id: studentData.id,
        rollNumber: studentData.rollNumber,
        fullName: studentData.fullName,
        email: email.trim(),
        phone: phone.trim(),
        college: studentData.college || 'Institute of Engineering & Technology',
        branch: studentData.branch || 'CSE',
        department: studentData.department || (studentData.branch === 'CSE' ? 'Computer Science & Engineering' : 'Engineering'),
        academicYear: studentData.academicYear || '2023-2027',
        cgpa: studentData.cgpa !== undefined ? Number(studentData.cgpa) : 7.0,
        backlogCount: studentData.backlogCount ?? studentData.activeBacklogs ?? 0,
        historyOfBacklogs: studentData.historyOfBacklogs || 0,
        gender: studentData.gender || 'Other',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      student = newStudent;
      this.studentsCache = [newStudent, ...this.studentsCache];
      this.notifyListeners();
    }

    const studentId = student?.id || res.student?.id || `std_${cleanRoll}`;

    // 3. Construct authoritative Application object verified by D1
    const newApp: Application = {
      id: res.applicationId,
      driveId,
      studentId,
      applicationEmail: email.trim(),
      applicationPhone: phone.trim(),
      eligibilityStatus: res.eligibilityStatus || 'ELIGIBLE',
      eligibilityOverride: false,
      appliedAt: new Date().toISOString(),
      status: 'APPLIED',
    };

    // Update local applications cache with server-verified ID
    const allApps = this.getApplications();
    const existingIdx = allApps.findIndex(
      (a) => a.id === newApp.id || (a.driveId === driveId && a.studentId === studentId)
    );
    if (existingIdx >= 0) {
      allApps[existingIdx] = newApp;
    } else {
      allApps.unshift(newApp);
    }
    this.set(STORAGE_KEYS.APPLICATIONS, allApps);

    // 4. Enroll into Round 1 Candidates if eligible
    if (res.eligibilityStatus === 'ELIGIBLE') {
      const rounds = this.getRounds(driveId);
      if (rounds.length > 0) {
        const round1 = rounds[0];
        const candidates = this.getCandidates();
        const candExists = candidates.some((c) => c.roundId === round1.id && c.studentId === studentId);
        if (!candExists) {
          const newCand: RoundCandidate = {
            id: `cand_${round1.id}_${studentId}`,
            driveId,
            roundId: round1.id,
            studentId,
            applicationId: newApp.id,
            entryStatus: 'ACTIVE',
            createdAt: new Date().toISOString(),
          };
          candidates.push(newCand);
          this.set(STORAGE_KEYS.CANDIDATES, candidates);
        }
      }
    }

    this.notifyListeners();
    return newApp;
  }

  public overrideEligibility(applicationId: string, reason: string): Application {
    const apps = this.getApplications();
    const idx = apps.findIndex((a) => a.id === applicationId);
    if (idx === -1) throw new Error('Application not found.');

    const updated: Application = {
      ...apps[idx],
      eligibilityStatus: 'OVERRIDDEN',
      eligibilityOverride: true,
      overrideReason: reason,
      overrideAt: new Date().toISOString(),
    };
    apps[idx] = updated;
    this.set(STORAGE_KEYS.APPLICATIONS, apps);
    this.notifyListeners();
    api.applications.override(applicationId, reason).then(() => this.syncWithBackend()).catch(console.warn);
    return updated;
  }

  // --- CANDIDATES & ROUND PROGRESSION ---
  public getCandidates(roundId?: string): RoundCandidate[] {
    const cands = this.get<RoundCandidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    if (roundId) {
      return cands.filter((c) => c.roundId === roundId);
    }
    return cands;
  }

  // --- BATCHES ---
  public getBatches(roundId?: string): Batch[] {
    const batches = this.get<Batch[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    if (roundId) {
      return batches.filter((b) => b.roundId === roundId);
    }
    return batches;
  }

  public getBatchById(id: string): Batch | undefined {
    return this.getBatches().find((b) => b.id === id);
  }

  public createBatch(
    roundId: string,
    driveId: string,
    batchName: string,
    capacityType: 'LIMITED' | 'UNLIMITED',
    capacity: number | null,
    createdBy: string
  ): Batch {
    if (capacityType === 'LIMITED' && (!capacity || capacity <= 0)) {
      throw new Error('Limited batches must have a capacity greater than 0.');
    }

    const newBatch: Batch = {
      id: `btch_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      roundId,
      driveId,
      batchName: batchName.trim(),
      capacityType,
      capacity: capacityType === 'LIMITED' ? capacity : null,
      status: 'OPEN',
      createdBy,
      createdAt: new Date().toISOString(),
    };

    const batches = this.getBatches();
    batches.push(newBatch);
    this.set(STORAGE_KEYS.BATCHES, batches);
    this.notifyListeners();

    // Persist to backend D1 / SQLite
    api.batches.create({
      roundId,
      driveId,
      batchName: newBatch.batchName,
      capacityType,
      capacity: newBatch.capacity,
    }).catch((e) => console.warn('Backend batch create warning:', e));

    return newBatch;
  }

  public deleteBatch(batchId: string): void {
    const batch = this.getBatchById(batchId);
    if (!batch) throw new Error('Batch not found.');
    if (batch.status === 'SUBMITTED') {
      throw new Error('Submitted/frozen batches cannot be deleted.');
    }

    // Remove batch students safely
    const allBatchStudents = this.getBatchStudents().filter((bs) => bs.batchId !== batchId);
    this.set(STORAGE_KEYS.BATCH_STUDENTS, allBatchStudents);

    // Remove evaluations for this batch
    const evals = this.getEvaluations().filter((e) => e.batchId !== batchId);
    this.set(STORAGE_KEYS.EVALUATIONS, evals);

    // Remove batch
    const batches = this.getBatches().filter((b) => b.id !== batchId);
    this.set(STORAGE_KEYS.BATCHES, batches);
    this.notifyListeners();

    // Persist to backend D1 / SQLite
    api.batches.delete(batchId).catch((e) => console.warn('Backend batch delete warning:', e));
  }

  // --- BATCH STUDENTS ---
  public getBatchStudents(batchId?: string): BatchStudent[] {
    const items = this.get<BatchStudent[]>(STORAGE_KEYS.BATCH_STUDENTS, INITIAL_BATCH_STUDENTS);
    if (batchId) {
      return items.filter((bs) => bs.batchId === batchId);
    }
    return items;
  }

  public addStudentsToBatch(
    batchId: string,
    roundId: string,
    studentIds: string[],
    addedBy: string
  ): { addedCount: number; errors: string[] } {
    const batch = this.getBatchById(batchId);
    if (!batch) throw new Error('Batch not found.');
    if (batch.status === 'SUBMITTED') {
      throw new Error('Cannot add students to a submitted and frozen batch.');
    }

    const allBatchStudents = this.getBatchStudents();
    const currentBatchStudents = allBatchStudents.filter((bs) => bs.batchId === batchId);
    const roundCandidates = this.getCandidates(roundId);

    // Rule 29: Student Batch Uniqueness constraint -> UNIQUE(round_id, student_id)
    const assignedInRoundStudentIds = new Set(
      allBatchStudents.filter((bs) => bs.roundId === roundId).map((bs) => bs.studentId)
    );

    const errors: string[] = [];
    const newItems: BatchStudent[] = [];
    const successfullyAddedIds: string[] = [];

    for (const studentId of studentIds) {
      const student = this.getStudentById(studentId);
      const studentName = student ? `${student.fullName} (${student.rollNumber})` : studentId;

      // 1. Verify candidate belongs to round
      const candidate = roundCandidates.find((c) => c.studentId === studentId);
      if (!candidate) {
        errors.push(`${studentName} is not an active candidate in this round.`);
        continue;
      }

      // 2. Check if student already assigned to ANY batch in this round
      if (assignedInRoundStudentIds.has(studentId)) {
        errors.push(`${studentName} is already assigned to a batch in this round (Rule 15: One batch per student).`);
        continue;
      }

      // 3. Check capacity limit
      if (batch.capacityType === 'LIMITED' && batch.capacity !== null) {
        if (currentBatchStudents.length + newItems.length >= batch.capacity) {
          errors.push(`Batch capacity (${batch.capacity}) reached. Could not add remaining students.`);
          break;
        }
      }

      const item: BatchStudent = {
        id: `bs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        batchId,
        roundId,
        studentId,
        roundCandidateId: candidate.id,
        addedBy,
        addedAt: new Date().toISOString(),
      };
      newItems.push(item);
      successfullyAddedIds.push(studentId);
      assignedInRoundStudentIds.add(studentId);
    }

    if (newItems.length > 0) {
      allBatchStudents.push(...newItems);
      this.set(STORAGE_KEYS.BATCH_STUDENTS, allBatchStudents);
      this.notifyListeners();

      // Persist to backend D1 / SQLite
      api.batches.assignStudents(batchId, successfullyAddedIds).catch((e) =>
        console.warn('Backend assignStudents warning:', e)
      );
    }

    return { addedCount: newItems.length, errors };
  }

  public removeStudentFromBatch(batchId: string, studentId: string): void {
    const batch = this.getBatchById(batchId);
    if (!batch) throw new Error('Batch not found.');
    if (batch.status === 'SUBMITTED') {
      throw new Error('Cannot modify a submitted/frozen batch.');
    }

    const items = this.getBatchStudents().filter(
      (bs) => !(bs.batchId === batchId && bs.studentId === studentId)
    );
    this.set(STORAGE_KEYS.BATCH_STUDENTS, items);
    this.notifyListeners();

    // Persist to backend D1 / SQLite
    api.batches.removeStudent(batchId, studentId).catch((e) =>
      console.warn('Backend removeStudent warning:', e)
    );
  }

  // --- HR EVALUATIONS & BATCH SUBMISSION ---
  public getEvaluations(batchId?: string): Evaluation[] {
    const evals = this.get<Evaluation[]>(STORAGE_KEYS.EVALUATIONS, []);
    if (batchId) {
      return evals.filter((e) => e.batchId === batchId);
    }
    return evals;
  }

  public saveEvaluation(
    batchId: string,
    batchStudentId: string,
    studentId: string,
    action: 'SELECT' | 'HOLD' | 'NONE',
    allowSubmittedEdit: boolean = true
  ): Evaluation {
    const batch = this.getBatchById(batchId);
    if (!batch) throw new Error('Batch not found.');
    if (batch.status === 'SUBMITTED' && !allowSubmittedEdit) {
      throw new Error('Batch is frozen and read-only. Evaluations cannot be edited.');
    }

    const round = this.getRoundById(batch.roundId);
    if (round?.isFinalRound && action === 'HOLD') {
      throw new Error('Rule 22: HOLD is not permitted in the Final Round.');
    }

    const evals = this.getEvaluations();
    const existingIdx = evals.findIndex(
      (e) => e.batchStudentId === batchStudentId || (e.batchId === batchId && e.studentId === studentId)
    );

    const now = new Date().toISOString();
    let updated: Evaluation;

    if (existingIdx !== -1) {
      updated = { ...evals[existingIdx], action, evaluatedAt: now };
      evals[existingIdx] = updated;
    } else {
      updated = {
        id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        batchId,
        batchStudentId,
        studentId,
        action,
        evaluatedAt: now,
      };
      evals.push(updated);
    }

    this.set(STORAGE_KEYS.EVALUATIONS, evals);
    this.notifyListeners();

    // Persist to backend D1 / SQLite
    api.evaluations.evaluate({
      batchId,
      roundId: batch.roundId,
      studentId,
      action: action === 'NONE' ? 'REJECT' : action,
    }).catch((e) => console.warn('Backend evaluate warning:', e));

    return updated;
  }

  public async saveEvaluationAsync(
    batchId: string,
    batchStudentId: string,
    studentId: string,
    action: 'SELECT' | 'HOLD' | 'NONE',
    allowSubmittedEdit: boolean = true
  ): Promise<Evaluation> {
    const batch = this.getBatchById(batchId);
    if (!batch) throw new Error('Batch not found.');
    if (batch.status === 'SUBMITTED' && !allowSubmittedEdit) {
      throw new Error('Batch is frozen and read-only. Evaluations cannot be edited.');
    }

    const round = this.getRoundById(batch.roundId);
    if (round?.isFinalRound && action === 'HOLD') {
      throw new Error('Rule 22: HOLD is not permitted in the Final Round.');
    }

    const evals = this.getEvaluations();
    const prevEvals = JSON.parse(JSON.stringify(evals));
    const existingIdx = evals.findIndex(
      (e) => e.batchStudentId === batchStudentId || (e.batchId === batchId && e.studentId === studentId)
    );

    const now = new Date().toISOString();
    let updated: Evaluation;

    if (existingIdx !== -1) {
      updated = { ...evals[existingIdx], action, evaluatedAt: now };
      evals[existingIdx] = updated;
    } else {
      updated = {
        id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        batchId,
        batchStudentId,
        studentId,
        action,
        evaluatedAt: now,
      };
      evals.push(updated);
    }

    this.set(STORAGE_KEYS.EVALUATIONS, evals);
    this.notifyListeners();

    try {
      await api.evaluations.evaluate({
        batchId,
        roundId: batch.roundId,
        studentId,
        action: action === 'NONE' ? 'REJECT' : action,
      });
    } catch (err: any) {
      // Rollback on server error
      this.set(STORAGE_KEYS.EVALUATIONS, prevEvals);
      this.notifyListeners();
      throw new Error(`Server rejection: ${err.message || err}`);
    }

    return updated;
  }

  public submitBatch(
    batchId: string,
    submittedBy: string,
    allowResubmit: boolean = true,
    persist: boolean = true
  ): {
    selectedCount: number;
    holdCount: number;
    rejectedCount: number;
    placedCount: number;
  } {
    const batch = this.getBatchById(batchId);
    if (!batch) throw new Error('Batch not found.');
    if (batch.status === 'SUBMITTED' && !allowResubmit) {
      throw new Error('This batch has already been submitted.');
    }

    const round = this.getRoundById(batch.roundId);
    if (!round) throw new Error('Round not found.');

    const drive = this.getDriveById(batch.driveId);
    if (!drive) throw new Error('Drive not found.');

    const batchStudents = this.getBatchStudents(batchId);
    const evals = this.getEvaluations(batchId);
    const evalMap = new Map(evals.map((e) => [e.studentId, e.action]));

    const rounds = this.getRounds(batch.driveId);
    const nextRound = rounds.find((r) => r.roundNumber === round.roundNumber + 1);

    const batchStudentIds = new Set(batchStudents.map((bs) => bs.studentId));

    // Remove existing roundResults for this batch so re-submission doesn't duplicate
    const roundResults = this.getRoundResults().filter((rr) => rr.batchId !== batchId);

    // If re-evaluating, clear candidates or placements previously generated from this batch
    let candidates = this.getCandidates();
    let placements = this.getPlacements();

    if (round.isFinalRound) {
      placements = placements.filter(
        (p) => !(p.driveId === batch.driveId && batchStudentIds.has(p.studentId))
      );
    } else if (nextRound) {
      candidates = candidates.filter(
        (c) => !(c.roundId === nextRound.id && batchStudentIds.has(c.studentId) && c.sourceRoundId === batch.roundId)
      );
    }

    const applications = this.getApplications(batch.driveId);
    const students = this.getStudents();
    const studentMap = new Map(students.map((s) => [s.id, s]));

    let selectedCount = 0;
    let holdCount = 0;
    let rejectedCount = 0;
    let placedCount = 0;

    const now = new Date().toISOString();

    for (const bs of batchStudents) {
      const action = evalMap.get(bs.studentId) || 'NONE';
      const app = applications.find((a) => a.studentId === bs.studentId);
      const student = studentMap.get(bs.studentId);

      if (round.isFinalRound) {
        // Final Round Business Logic (Rule 22, 23, 24, 25)
        if (action === 'SELECT') {
          selectedCount++;
          placedCount++;

          // 1. Record Final Round Result: SELECTED
          roundResults.push({
            id: `rr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            driveId: batch.driveId,
            roundId: batch.roundId,
            studentId: bs.studentId,
            batchId,
            result: 'SELECTED',
            createdAt: now,
          });

          // 2. Automatic Placement Record Creation (Rule 25)
          placements.push({
            id: `plc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            studentId: bs.studentId,
            driveId: batch.driveId,
            companyName: drive.companyName,
            jobRole: drive.jobRole,
            package: drive.package,
            finalRoundId: batch.roundId,
            selectedAt: now,
            createdAt: now,
            rollNumber: student?.rollNumber,
            studentName: student?.fullName,
            branch: student?.branch,
          });

          // 3. Update Application Status to PLACED
          if (app) {
            app.status = 'PLACED';
          }
        } else {
          // No selection / deselected -> REJECTED (Rule 24)
          rejectedCount++;
          roundResults.push({
            id: `rr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            driveId: batch.driveId,
            roundId: batch.roundId,
            studentId: bs.studentId,
            batchId,
            result: 'REJECTED',
            createdAt: now,
          });
          if (app) {
            app.status = 'REJECTED';
          }
        }
      } else {
        // Non-Final Round Business Logic (Rule 16, 17, 18, 19, 20)
        if (action === 'SELECT') {
          selectedCount++;
          roundResults.push({
            id: `rr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            driveId: batch.driveId,
            roundId: batch.roundId,
            studentId: bs.studentId,
            batchId,
            result: 'SELECTED',
            createdAt: now,
          });

          // Advance to next round as ACTIVE candidate
          if (nextRound) {
            const alreadyInNext = candidates.some(
              (c) => c.roundId === nextRound.id && c.studentId === bs.studentId
            );
            if (!alreadyInNext) {
              candidates.push({
                id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                driveId: batch.driveId,
                roundId: nextRound.id,
                studentId: bs.studentId,
                applicationId: app?.id || '',
                entryStatus: 'ACTIVE',
                sourceRoundId: batch.roundId,
                createdAt: now,
              });
            } else {
              // Update status to ACTIVE if previously HOLD
              const cIdx = candidates.findIndex(
                (c) => c.roundId === nextRound.id && c.studentId === bs.studentId
              );
              if (cIdx !== -1) {
                candidates[cIdx].entryStatus = 'ACTIVE';
              }
            }
          }
          if (app && app.status !== 'PLACED') {
            app.status = 'ACTIVE';
          }
        } else if (action === 'HOLD') {
          // HOLD IS NOT REJECTION (Rule 17, 18)
          holdCount++;
          roundResults.push({
            id: `rr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            driveId: batch.driveId,
            roundId: batch.roundId,
            studentId: bs.studentId,
            batchId,
            result: 'HOLD',
            createdAt: now,
          });

          if (nextRound) {
            const alreadyInNext = candidates.some(
              (c) => c.roundId === nextRound.id && c.studentId === bs.studentId
            );
            if (!alreadyInNext) {
              candidates.push({
                id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                driveId: batch.driveId,
                roundId: nextRound.id,
                studentId: bs.studentId,
                applicationId: app?.id || '',
                entryStatus: 'HOLD',
                sourceRoundId: batch.roundId,
                createdAt: now,
              });
            } else {
              const cIdx = candidates.findIndex(
                (c) => c.roundId === nextRound.id && c.studentId === bs.studentId
              );
              if (cIdx !== -1) {
                candidates[cIdx].entryStatus = 'HOLD';
              }
            }
          }
          if (app && app.status !== 'PLACED') {
            app.status = 'ACTIVE';
          }
        } else {
          // No Action / Deselected -> Automatically REJECTED (Rule 20)
          rejectedCount++;
          roundResults.push({
            id: `rr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            driveId: batch.driveId,
            roundId: batch.roundId,
            studentId: bs.studentId,
            batchId,
            result: 'REJECTED',
            createdAt: now,
          });
          if (app && app.status !== 'PLACED') {
            app.status = 'REJECTED';
          }
        }
      }
    }

    // Freeze batch
    const allBatches = this.getBatches();
    const bIdx = allBatches.findIndex((b) => b.id === batchId);
    if (bIdx !== -1) {
      allBatches[bIdx].status = 'SUBMITTED';
      allBatches[bIdx].submittedAt = now;
      allBatches[bIdx].submittedBy = submittedBy;
    }

    this.set(STORAGE_KEYS.BATCHES, allBatches);
    this.set(STORAGE_KEYS.ROUND_RESULTS, roundResults);
    this.set(STORAGE_KEYS.CANDIDATES, candidates);
    this.set(STORAGE_KEYS.PLACEMENTS, placements);
    this.set(STORAGE_KEYS.APPLICATIONS, applications);
    this.notifyListeners();

    // Persist to backend D1 / SQLite if requested
    if (persist) {
      api.evaluations.submitBatch(batchId).catch((e) =>
        console.warn('Backend submitBatch warning:', e)
      );
    }

    return { selectedCount, holdCount, rejectedCount, placedCount };
  }

  public async submitBatchAsync(
    batchId: string,
    submittedBy: string,
    allowResubmit: boolean = true
  ): Promise<{
    selectedCount: number;
    holdCount: number;
    rejectedCount: number;
    placedCount: number;
  }> {
    // 1. Process local updates without duplicate fire-and-forget
    const localResult = this.submitBatch(batchId, submittedBy, allowResubmit, false);

    // 2. Process authoritative backend submission
    try {
      const backendRes = await api.evaluations.submitBatch(batchId);
      // Synchronize full state from backend to ensure identical data structures across clients
      await this.syncWithBackend();
      return {
        selectedCount: backendRes.selectedCount ?? localResult.selectedCount,
        holdCount: backendRes.holdCount ?? localResult.holdCount,
        rejectedCount: backendRes.rejectedCount ?? localResult.rejectedCount,
        placedCount: backendRes.placedCount ?? localResult.placedCount,
      };
    } catch (err: any) {
      console.warn('Backend submitBatch warning (fallback to local state):', err);
      return localResult;
    }
  }

  // --- ROUND RESULTS ---
  public getRoundResults(roundId?: string): RoundResult[] {
    const results = this.get<RoundResult[]>(STORAGE_KEYS.ROUND_RESULTS, []);
    if (roundId) {
      return results.filter((r) => r.roundId === roundId);
    }
    return results;
  }

  // --- PLACEMENTS ---
  public getPlacements(driveId?: string): Placement[] {
    const list = this.get<Placement[]>(STORAGE_KEYS.PLACEMENTS, INITIAL_PLACEMENTS);
    if (driveId) {
      return list.filter((p) => p.driveId === driveId);
    }
    return list;
  }

  // --- 6-MONTH ARCHIVE & SAFE DRIVE DELETION ---
  public async generateDriveArchive(driveId: string): Promise<{ zipBlob: Blob; fileName: string }> {
    const drive = this.getDriveById(driveId);
    if (!drive) throw new Error('Drive not found.');

    const applications = this.getApplications(driveId);
    const rounds = this.getRounds(driveId);
    const candidates = this.getCandidates().filter((c) => c.driveId === driveId);
    const batches = this.getBatches().filter((b) => b.driveId === driveId);
    const batchStudents = this.getBatchStudents().filter((bs) =>
      batches.some((b) => b.id === bs.batchId)
    );
    const placements = this.getPlacements(driveId);
    const students = this.getStudents();
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const zip = new JSZip();

    // 1. README.txt
    const readmeContent = `IRON DRIVE ARCHIVE
----------------------------------------
Company: ${drive.companyName}
Job Role: ${drive.jobRole}
Drive Date: ${drive.driveDate}
Generated At: ${new Date().toISOString()}

SUMMARY STATISTICS:
- Total Applications: ${applications.length}
- Total Rounds: ${rounds.length}
- Total Batches Formed: ${batches.length}
- Placed Candidates: ${placements.length}

Retained as permanent backup in accordance with IRON 6-Month Data Retention Policy.
`;
    zip.file('README.txt', readmeContent);

    // 2. Drive Details CSV
    const driveDetailsCsv = [
      'Field,Value',
      `Drive ID,"${drive.id}"`,
      `Company Name,"${drive.companyName}"`,
      `Job Role,"${drive.jobRole}"`,
      `Package,"${drive.package}"`,
      `Drive Date,"${drive.driveDate}"`,
      `Drive Time,"${drive.driveTime}"`,
      `Location,"${drive.location}"`,
      `Minimum CGPA,"${drive.minimumCgpa}"`,
      `Max Backlogs,"${drive.backlogRule}"`,
      `Eligible Branches,"${drive.eligibleBranches.join('; ')}"`,
      `Retention Expiry,"${drive.retentionExpiresAt}"`,
      `Status,"${drive.status}"`,
    ].join('\n');
    zip.file('drive_details.csv', driveDetailsCsv);

    // 3. Applications CSV
    const appsHeaders = ['Roll Number,Student Name,Branch,CGPA,Backlogs,Applied At,Eligibility Status,Final Status'];
    const appRows = applications.map((a) => {
      const s = studentMap.get(a.studentId);
      return `"${s?.rollNumber || ''}","${s?.fullName || ''}","${s?.branch || ''}",${s?.cgpa || ''},${s?.backlogCount || 0},"${a.appliedAt}","${a.eligibilityStatus}","${a.status}"`;
    });
    zip.file('applications.csv', [appsHeaders, ...appRows].join('\n'));

    // 4. Final Placed Students CSV
    const placedHeaders = ['Roll Number,Student Name,Branch,Department,Company,Role,Package,Selected At'];
    const placedRows = placements.map((p) => {
      const s = studentMap.get(p.studentId);
      return `"${s?.rollNumber || ''}","${s?.fullName || ''}","${s?.branch || ''}","${s?.department || ''}","${p.companyName}","${p.jobRole}","${p.package}","${p.selectedAt}"`;
    });
    zip.file('final_placed_students.csv', [placedHeaders, ...placedRows].join('\n'));

    // 5. Rounds & Batches CSV
    const rbHeaders = ['Round Number,Round Name,Batch Name,Student Roll,Student Name,Batch Status'];
    const rbRows: string[] = [];
    rounds.forEach((r) => {
      const rBatches = batches.filter((b) => b.roundId === r.id);
      rBatches.forEach((b) => {
        const bsList = batchStudents.filter((bs) => bs.batchId === b.id);
        bsList.forEach((bs) => {
          const s = studentMap.get(bs.studentId);
          rbRows.push(
            `"${r.roundNumber}","${r.roundName}","${b.batchName}","${s?.rollNumber || ''}","${s?.fullName || ''}","${b.status}"`
          );
        });
      });
    });
    zip.file('rounds_and_batches.csv', [rbHeaders, ...rbRows].join('\n'));

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const cleanCompany = drive.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanCompany}_Drive_Archive_${drive.driveDate}.zip`;

    return { zipBlob, fileName };
  }

  public confirmArchiveAndDeleteDrive(driveId: string): void {
    const drive = this.getDriveById(driveId);
    if (!drive) throw new Error('Drive not found.');

    // 1. Delete drive-specific applications
    const apps = this.getApplications().filter((a) => a.driveId !== driveId);
    this.set(STORAGE_KEYS.APPLICATIONS, apps);

    // 2. Delete drive-specific rounds
    const rounds = this.getRounds().filter((r) => r.driveId !== driveId);
    this.set(STORAGE_KEYS.ROUNDS, rounds);

    // 3. Delete drive candidates
    const cands = this.getCandidates().filter((c) => c.driveId !== driveId);
    this.set(STORAGE_KEYS.CANDIDATES, cands);

    // 4. Delete drive batches & batch students
    const batches = this.getBatches().filter((b) => b.driveId !== driveId);
    this.set(STORAGE_KEYS.BATCHES, batches);

    const remainingBatchIds = new Set(batches.map((b) => b.id));
    const batchStudents = this.getBatchStudents().filter((bs) => remainingBatchIds.has(bs.batchId));
    this.set(STORAGE_KEYS.BATCH_STUDENTS, batchStudents);

    // 5. Delete drive round results
    const results = this.getRoundResults().filter((rr) => rr.driveId !== driveId);
    this.set(STORAGE_KEYS.ROUND_RESULTS, results);

    // 6. Delete drive record itself
    const drives = this.getDrives().filter((d) => d.id !== driveId);
    this.set(STORAGE_KEYS.DRIVES, drives);
    this.notifyListeners();
    api.drives.purge(driveId).then(() => this.syncWithBackend()).catch(console.warn);

    // NOTE: CRITICAL BUSINESS RULE 32:
    // Permanent Student Master DB remains untouched!
    // Historical minimal placement record remains for college records.
  }
}

export const ironStorage = new IronStorage();
