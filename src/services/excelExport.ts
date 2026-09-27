import * as XLSX from 'xlsx';
import { Drive, Application, Student, DriveRound, RoundCandidate, Placement, RoundResult } from '../types';

interface ExportApplicationsParams {
  drive: Drive;
  applications: Application[];
  students: Student[];
  rounds: DriveRound[];
  candidates: RoundCandidate[];
  results: RoundResult[];
  placements: Placement[];
}

interface ExportSelectedStudentsParams {
  drive: Drive;
  placements: Placement[];
  students: Student[];
  rounds?: DriveRound[];
}

/**
 * Exports all student applications for a drive into a structured Excel (.xlsx) file.
 */
export function exportApplicationsToExcel({
  drive,
  applications,
  students,
  rounds,
  candidates,
  placements,
}: ExportApplicationsParams) {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const placementStudentIds = new Set(placements.map((p) => p.studentId));

  const rows = applications.map((app, index) => {
    const student = studentMap.get(app.studentId);

    // Determine furthest round reached or status
    const studentCandidates = candidates.filter((c) => c.studentId === app.studentId);
    let currentStage = 'Applied';
    if (placementStudentIds.has(app.studentId)) {
      currentStage = 'Final Selected / Placed';
    } else if (studentCandidates.length > 0) {
      const latestCandidate = studentCandidates[studentCandidates.length - 1];
      const round = rounds.find((r) => r.id === latestCandidate.roundId);
      currentStage = round ? `Round ${round.roundNumber}: ${round.roundName}` : 'In Progress';
    } else if (app.eligibilityStatus === 'NOT_ELIGIBLE') {
      currentStage = 'Ineligible';
    }

    let finalOutcome = 'In Progress';
    if (placementStudentIds.has(app.studentId)) {
      finalOutcome = 'SELECTED / PLACED';
    } else if (app.eligibilityStatus === 'NOT_ELIGIBLE') {
      finalOutcome = 'INELIGIBLE';
    } else if (app.status === 'REJECTED') {
      finalOutcome = 'REJECTED';
    }

    return {
      'Serial Number': index + 1,
      'Roll Number': student?.rollNumber || 'N/A',
      'Student Name': student?.fullName || 'N/A',
      'Email': app.applicationEmail || student?.email || 'N/A',
      'Mobile Number': app.applicationPhone || student?.phone || 'N/A',
      'Department': student?.department || student?.branch || 'N/A',
      'Academic Year': student?.academicYear || 'N/A',
      'CGPA': student?.cgpa ?? 'N/A',
      'Backlogs': student?.backlogCount ?? 0,
      'Eligibility Status': app.eligibilityStatus,
      'Furthest Round Reached': currentStage,
      'Final Outcome': finalOutcome,
      'Company Name': drive.companyName,
      'Job Role': drive.jobRole,
      'Package (CTC)': drive.package,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = [
    { wch: 14 }, // Serial Number
    { wch: 16 }, // Roll Number
    { wch: 24 }, // Student Name
    { wch: 28 }, // Email
    { wch: 16 }, // Mobile Number
    { wch: 18 }, // Department
    { wch: 14 }, // Academic Year
    { wch: 8 },  // CGPA
    { wch: 10 }, // Backlogs
    { wch: 18 }, // Eligibility Status
    { wch: 26 }, // Furthest Round Reached
    { wch: 22 }, // Final Outcome
    { wch: 20 }, // Company Name
    { wch: 20 }, // Job Role
    { wch: 14 }, // Package
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  const safeSheetName = `${drive.companyName.slice(0, 20)} Applications`.replace(/[*?:/[\]\\]/g, '_');
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const cleanCompanyName = drive.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `${cleanCompanyName}_All_Applications_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports all final selected / placed students for a particular drive inside Drive Funnel & Analytics.
 */
export function exportSelectedStudentsToExcel({
  drive,
  placements,
  students,
}: ExportSelectedStudentsParams) {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const rows = placements.map((placement, index) => {
    const student = studentMap.get(placement.studentId);
    return {
      'Serial Number': index + 1,
      'Roll Number': student?.rollNumber || 'N/A',
      'Student Name': student?.fullName || 'N/A',
      'Email': student?.email || 'N/A',
      'Mobile Number': student?.phone || 'N/A',
      'Department': student?.department || student?.branch || 'N/A',
      'Academic Year': student?.academicYear || 'N/A',
      'CGPA': student?.cgpa ?? 'N/A',
      'Company Name': placement.companyName || drive.companyName,
      'Job Role': placement.jobRole || drive.jobRole,
      'Package (CTC)': placement.package || drive.package,
      'Selection Date': placement.selectedAt ? new Date(placement.selectedAt).toLocaleDateString() : new Date().toLocaleDateString(),
      'Status': 'CONFIRMED OFFER',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = [
    { wch: 14 }, // Serial Number
    { wch: 16 }, // Roll Number
    { wch: 24 }, // Student Name
    { wch: 28 }, // Email
    { wch: 16 }, // Mobile Number
    { wch: 18 }, // Department
    { wch: 14 }, // Academic Year
    { wch: 8 },  // CGPA
    { wch: 20 }, // Company Name
    { wch: 20 }, // Job Role
    { wch: 16 }, // Package (CTC)
    { wch: 16 }, // Selection Date
    { wch: 18 }, // Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  const safeSheetName = `${drive.companyName.slice(0, 18)} Selected`.replace(/[*?:/[\]\\]/g, '_');
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const cleanCompanyName = drive.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `${cleanCompanyName}_Selected_Students_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports placed students from the Placement Repository page.
 * Strictly includes: Serial Number, Roll Number, Student Name, Email, Mobile Number, Department.
 */
export function exportAllPlacementsToExcel(
  placements: Placement[],
  students: Student[],
  _drives?: Drive[]
) {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const rows = placements.map((placement, index) => {
    const student = studentMap.get(placement.studentId);

    return {
      'Serial Number': index + 1,
      'Roll Number': student?.rollNumber || 'N/A',
      'Student Name': student?.fullName || 'N/A',
      'Email': student?.email || 'N/A',
      'Mobile Number': student?.phone || 'N/A',
      'Department': student?.department || student?.branch || 'N/A',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const colWidths = [
    { wch: 14 }, // Serial Number
    { wch: 18 }, // Roll Number
    { wch: 26 }, // Student Name
    { wch: 30 }, // Email
    { wch: 18 }, // Mobile Number
    { wch: 20 }, // Department
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Placed Students');

  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Placement_Repository_Students_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
