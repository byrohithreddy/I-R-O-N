import React, { useState, useMemo } from 'react';
import { Drive, DriveRound, Application, RoundCandidate, Placement, Student } from '../../types';
import { ironStorage } from '../../services/storage';
import {
  ArrowLeft,
  ArrowDown,
  CheckCircle2,
  Download,
  Database,
  Search,
  X,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  GraduationCap,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { exportSelectedStudentsToExcel } from '../../services/excelExport';

interface TpoDriveAnalyticsProps {
  initialDriveId?: string;
  onBack: () => void;
}

const BRANCH_COLORS: Record<string, string> = {
  CSE: '#2563eb', // Blue
  'CSE-DS': '#0891b2', // Cyan
  'CSE AIML': '#7c3aed', // Violet
  'CSE-CS': '#4f46e5', // Indigo
  CSIT: '#0284c7', // Sky
  ECE: '#d97706', // Amber
  EEE: '#ea580c', // Orange
  MECH: '#dc2626', // Red
  CIVIL: '#059669', // Emerald
  AERO: '#0d9488', // Teal
  MBA: '#db2777', // Pink
  Other: '#71717a', // Zinc
};

export const TpoDriveAnalytics: React.FC<TpoDriveAnalyticsProps> = ({
  initialDriveId,
  onBack,
}) => {
  const drives = ironStorage.getDrives();
  const [selectedDriveId, setSelectedDriveId] = useState<string>(
    initialDriveId || (drives.length > 0 ? drives[0].id : '')
  );
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // View Master Data Explorer Modal state
  const [showAllDataModal, setShowAllDataModal] = useState<boolean>(false);
  const [dataSearchQuery, setDataSearchQuery] = useState<string>('');
  const [dataBranchFilter, setDataBranchFilter] = useState<string>('ALL');
  const [dataStatusFilter, setDataStatusFilter] = useState<string>('ALL');
  const [dataCurrentPage, setDataCurrentPage] = useState<number>(1);
  const dataPageSize = 15;

  // Chart interactivity states
  const [branchChartMetric, setBranchChartMetric] = useState<'applied' | 'placed'>('applied');
  const [hoveredBranchSlice, setHoveredBranchSlice] = useState<number | null>(null);
  const [hoveredStatusSlice, setHoveredStatusSlice] = useState<number | null>(null);

  const drive = drives.find((d) => d.id === selectedDriveId);
  const students = ironStorage.getStudents();
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  if (!drive) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500">
        No drive selected for analytics.
      </div>
    );
  }

  const applications: Application[] = ironStorage.getApplications(drive.id);
  const rounds: DriveRound[] = ironStorage.getRounds(drive.id);
  const candidates: RoundCandidate[] = ironStorage.getCandidates().filter((c) => c.driveId === drive.id);
  const placements: Placement[] = ironStorage.getPlacements(drive.id);
  const results = ironStorage.getRoundResults().filter((r) => r.driveId === drive.id);

  const eligibleCount = applications.filter(
    (a) => a.eligibilityStatus === 'ELIGIBLE' || a.eligibilityStatus === 'OVERRIDDEN'
  ).length;
  const finalPlacedCount = placements.length;
  const placementRate =
    applications.length > 0 ? ((finalPlacedCount / applications.length) * 100).toFixed(1) : '0';

  // Average CGPA of placed candidates
  const placedCgpas = placements
    .map((p) => studentMap.get(p.studentId)?.cgpa)
    .filter((cgpa): cgpa is number => typeof cgpa === 'number' && !isNaN(cgpa));
  const avgPlacedCgpa =
    placedCgpas.length > 0
      ? (placedCgpas.reduce((a, b) => a + b, 0) / placedCgpas.length).toFixed(2)
      : 'N/A';

  // In-flight active candidates in rounds (not final placed)
  const placedStudentIds = new Set(placements.map((p) => p.studentId));
  const activeCandidateIds = new Set(
    candidates
      .filter((c) => c.entryStatus === 'ACTIVE' && !placedStudentIds.has(c.studentId))
      .map((c) => c.studentId)
  );
  const inFlightCount = activeCandidateIds.size;

  const holdCandidateIds = new Set(
    candidates
      .filter((c) => c.entryStatus === 'HOLD' && !placedStudentIds.has(c.studentId))
      .map((c) => c.studentId)
  );
  const holdCountTotal = holdCandidateIds.size;

  // Strict CSV downloader: only Serial number, Full name, Branch, Mobile number, email address
  const downloadCsv = (
    filename: string,
    rows: { fullName: string; branch: string; phone: string; email: string }[]
  ) => {
    const headers = ['Serial Number', 'Full Name', 'Branch', 'Mobile Number', 'Email Address'];

    const escapeCell = (val: string | number | undefined | null) => {
      const str = val === undefined || val === null ? '' : String(val).trim();
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = rows.map((r, idx) => [
      idx + 1,
      r.fullName,
      r.branch,
      r.phone,
      r.email,
    ]);

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...csvRows.map((row) => row.map(escapeCell).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTotalApplicationsCsv = () => {
    if (applications.length === 0) {
      setExportFeedback('No applications found to export for this drive.');
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }

    const rows = applications.map((app) => {
      const s = studentMap.get(app.studentId);
      return {
        fullName: s?.fullName || 'Student',
        branch: s?.branch || '',
        phone: app.applicationPhone || s?.phone || '',
        email: app.applicationEmail || s?.email || '',
      };
    });

    const companySlug = (drive.companyName || 'drive').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${companySlug}_Total_Applications.csv`;
    downloadCsv(filename, rows);
    setExportFeedback(`Downloaded ${filename} (${rows.length} applications).`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const getSelectedAndHoldStudentsForRound = (round: DriveRound, index: number) => {
    const studentIdSet = new Set<string>();

    // 1. From round results for this round (result === 'SELECTED' or 'HOLD')
    results
      .filter((r) => r.roundId === round.id && (r.result === 'SELECTED' || r.result === 'HOLD'))
      .forEach((r) => studentIdSet.add(r.studentId));

    // 2. From evaluations in batches of this round (action === 'SELECT' or 'HOLD')
    const roundBatches = ironStorage.getBatches(round.id);
    const roundBatchIds = new Set(roundBatches.map((b) => b.id));
    const allEvals = ironStorage.getEvaluations();
    allEvals
      .filter((e) => roundBatchIds.has(e.batchId) && (e.action === 'SELECT' || e.action === 'HOLD'))
      .forEach((e) => studentIdSet.add(e.studentId));

    // 3. From candidates promoted to the next round with sourceRoundId matching this round
    candidates
      .filter(
        (c) =>
          c.sourceRoundId === round.id &&
          (c.entryStatus === 'ACTIVE' || c.entryStatus === 'HOLD' || !c.entryStatus)
      )
      .forEach((c) => studentIdSet.add(c.studentId));

    // 4. From candidates in next round if sourceRoundId wasn't explicitly logged
    const nextRound = rounds[index + 1];
    if (nextRound) {
      candidates
        .filter((c) => c.roundId === nextRound.id)
        .forEach((c) => studentIdSet.add(c.studentId));
    }

    // 5. If this is the final round, include placed students
    if (round.isFinalRound || index === rounds.length - 1) {
      placements
        .filter((p) => p.driveId === drive.id && (!p.finalRoundId || p.finalRoundId === round.id))
        .forEach((p) => studentIdSet.add(p.studentId));
    }

    const studentRows: { fullName: string; branch: string; phone: string; email: string }[] = [];
    studentIdSet.forEach((sid) => {
      const s = studentMap.get(sid);
      const app = applications.find((a) => a.studentId === sid);
      const plc = placements.find((p) => p.studentId === sid);

      studentRows.push({
        fullName: s?.fullName || plc?.studentName || 'Student',
        branch: s?.branch || plc?.branch || '',
        phone: app?.applicationPhone || s?.phone || '',
        email: app?.applicationEmail || s?.email || '',
      });
    });

    return studentRows;
  };

  const handleDownloadRoundSelectedCsv = (round: DriveRound, index: number) => {
    const rows = getSelectedAndHoldStudentsForRound(round, index);
    if (rows.length === 0) {
      setExportFeedback(`No selected or promoted candidates found yet for ${round.roundName}.`);
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }

    const companySlug = (drive.companyName || 'drive').replace(/[^a-zA-Z0-9_-]/g, '_');
    const roundSlug = (round.roundName || `Round_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${companySlug}_${roundSlug}_Selected_Promoted_Students.csv`;
    downloadCsv(filename, rows);
    setExportFeedback(`Downloaded ${filename} (${rows.length} students).`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const handleDownloadFinalPlacedCsv = () => {
    if (placements.length === 0) {
      setExportFeedback('No final placed offers recorded yet for this drive.');
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }

    const rows = placements.map((p) => {
      const s = studentMap.get(p.studentId);
      const app = applications.find((a) => a.studentId === p.studentId);
      return {
        fullName: p.studentName || s?.fullName || 'Student',
        branch: p.branch || s?.branch || '',
        phone: app?.applicationPhone || s?.phone || '',
        email: app?.applicationEmail || s?.email || '',
      };
    });

    const companySlug = (drive.companyName || 'drive').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${companySlug}_Final_Placed_Students.csv`;
    downloadCsv(filename, rows);
    setExportFeedback(`Downloaded ${filename} (${rows.length} students).`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const handleExportSelected = () => {
    if (placements.length === 0) {
      setExportFeedback('No selected/placed candidates recorded yet for this drive.');
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }
    exportSelectedStudentsToExcel({
      drive,
      placements,
      students,
      rounds,
    });
    setExportFeedback(`Exported ${placements.length} selected students to Excel.`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  // Branch stats
  const branchCounts: Record<string, { applied: number; eligible: number; placed: number }> = {};
  applications.forEach((a) => {
    const s = studentMap.get(a.studentId);
    const b = s?.branch || 'Other';
    if (!branchCounts[b]) branchCounts[b] = { applied: 0, eligible: 0, placed: 0 };
    branchCounts[b].applied++;
    if (a.eligibilityStatus === 'ELIGIBLE' || a.eligibilityStatus === 'OVERRIDDEN') {
      branchCounts[b].eligible++;
    }
  });
  placements.forEach((p) => {
    const s = studentMap.get(p.studentId);
    const b = s?.branch || p.branch || 'Other';
    if (!branchCounts[b]) branchCounts[b] = { applied: 0, eligible: 0, placed: 0 };
    branchCounts[b].placed++;
  });

  // Top placing department
  let topBranch = 'None';
  let topBranchCount = 0;
  Object.entries(branchCounts).forEach(([b, stats]) => {
    if (stats.placed > topBranchCount) {
      topBranchCount = stats.placed;
      topBranch = b;
    }
  });

  // CGPA Distribution ranges
  const cgpaBuckets = [
    { label: '≥ 9.0', min: 9.0, max: 10.0, applied: 0, placed: 0 },
    { label: '8.0 – 8.9', min: 8.0, max: 8.99, applied: 0, placed: 0 },
    { label: '7.0 – 7.9', min: 7.0, max: 7.99, applied: 0, placed: 0 },
    { label: '6.0 – 6.9', min: 6.0, max: 6.99, applied: 0, placed: 0 },
    { label: '< 6.0', min: 0.0, max: 5.99, applied: 0, placed: 0 },
  ];

  applications.forEach((app) => {
    const s = studentMap.get(app.studentId);
    const cgpa = s?.cgpa ?? 0;
    const bucket = cgpaBuckets.find((b) => cgpa >= b.min && cgpa <= b.max);
    if (bucket) bucket.applied++;
  });

  placements.forEach((p) => {
    const s = studentMap.get(p.studentId);
    const cgpa = s?.cgpa ?? 0;
    const bucket = cgpaBuckets.find((b) => cgpa >= b.min && cgpa <= b.max);
    if (bucket) bucket.placed++;
  });

  // Master Data records prepared for "See All Data" modal
  const allDataRecords = useMemo(() => {
    return applications.map((app, idx) => {
      const s = studentMap.get(app.studentId);
      const isPlaced = placedStudentIds.has(app.studentId);
      const isHold = holdCandidateIds.has(app.studentId);
      const isActiveInFlight = activeCandidateIds.has(app.studentId);

      let stageLabel = 'Registered';
      if (isPlaced) stageLabel = 'Placed / Offer Made';
      else if (isHold) stageLabel = 'On HOLD';
      else if (isActiveInFlight) stageLabel = 'In-Flight Candidate';
      else if (app.eligibilityStatus === 'NOT_ELIGIBLE') stageLabel = 'Ineligible';
      else stageLabel = 'Eliminated';

      return {
        serialNumber: idx + 1,
        studentId: app.studentId,
        rollNumber: s?.rollNumber || 'N/A',
        fullName: s?.fullName || 'Student',
        branch: s?.branch || 'N/A',
        mobileNumber: app.applicationPhone || s?.phone || 'N/A',
        emailAddress: app.applicationEmail || s?.email || 'N/A',
        cgpa: s?.cgpa ?? 0,
        activeBacklogs: s?.activeBacklogs ?? s?.backlogCount ?? 0,
        eligibilityStatus: app.eligibilityStatus,
        stageLabel,
        isPlaced,
        isHold,
        isActiveInFlight,
      };
    });
  }, [applications, studentMap, placedStudentIds, holdCandidateIds, activeCandidateIds]);

  // Filtered dataset for Master Data Explorer Modal
  const filteredDataRecords = useMemo(() => {
    return allDataRecords.filter((rec) => {
      const q = dataSearchQuery.trim().toLowerCase();
      if (q) {
        const matchesQ =
          rec.fullName.toLowerCase().includes(q) ||
          rec.rollNumber.toLowerCase().includes(q) ||
          rec.emailAddress.toLowerCase().includes(q) ||
          rec.mobileNumber.toLowerCase().includes(q) ||
          rec.branch.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      if (dataBranchFilter !== 'ALL' && rec.branch !== dataBranchFilter) {
        return false;
      }

      if (dataStatusFilter === 'PLACED' && !rec.isPlaced) return false;
      if (dataStatusFilter === 'HOLD' && !rec.isHold) return false;
      if (dataStatusFilter === 'IN_FLIGHT' && !rec.isActiveInFlight) return false;
      if (dataStatusFilter === 'ELIGIBLE' && rec.eligibilityStatus !== 'ELIGIBLE' && rec.eligibilityStatus !== 'OVERRIDDEN') return false;
      if (dataStatusFilter === 'NOT_ELIGIBLE' && rec.eligibilityStatus !== 'NOT_ELIGIBLE') return false;

      return true;
    });
  }, [allDataRecords, dataSearchQuery, dataBranchFilter, dataStatusFilter]);

  const totalDataPages = Math.ceil(filteredDataRecords.length / dataPageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (dataCurrentPage - 1) * dataPageSize;
    return filteredDataRecords.slice(start, start + dataPageSize);
  }, [filteredDataRecords, dataCurrentPage, dataPageSize]);

  const handleExportFilteredDataCsv = () => {
    if (filteredDataRecords.length === 0) {
      setExportFeedback('No records in current filter to export.');
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }
    const rows = filteredDataRecords.map((r) => ({
      fullName: r.fullName,
      branch: r.branch,
      phone: r.mobileNumber,
      email: r.emailAddress,
    }));
    const companySlug = (drive.companyName || 'drive').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${companySlug}_Master_Dataset.csv`;
    downloadCsv(filename, rows);
    setExportFeedback(`Downloaded ${filename} (${rows.length} records).`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  // Prepare Pie / Donut Chart Data for Department Distribution
  const branchPieData = useMemo(() => {
    return Object.entries(branchCounts)
      .map(([branch, stats]) => ({
        label: branch,
        value: branchChartMetric === 'applied' ? stats.applied : stats.placed,
        color: BRANCH_COLORS[branch] || BRANCH_COLORS.Other,
      }))
      .filter((item) => item.value > 0);
  }, [branchCounts, branchChartMetric]);

  const branchPieTotal = useMemo(() => {
    return branchPieData.reduce((acc, item) => acc + item.value, 0);
  }, [branchPieData]);

  // Prepare Pie / Donut Chart Data for Funnel Health
  const eliminatedCount = Math.max(
    0,
    applications.length - finalPlacedCount - inFlightCount - holdCountTotal
  );
  const healthPieData = useMemo(() => {
    return [
      { label: 'Placed Offers', value: finalPlacedCount, color: '#10b981' }, // Emerald
      { label: 'Active In-Flight', value: inFlightCount, color: '#0284c7' }, // Sky
      { label: 'On HOLD', value: holdCountTotal, color: '#f59e0b' }, // Amber
      { label: 'Eliminated / Ineligible', value: eliminatedCount, color: '#71717a' }, // Zinc
    ].filter((item) => item.value > 0);
  }, [finalPlacedCount, inFlightCount, holdCountTotal, eliminatedCount]);

  const healthPieTotal = useMemo(() => {
    return healthPieData.reduce((acc, item) => acc + item.value, 0);
  }, [healthPieData]);

  // Helper to construct SVG Donut Paths cleanly
  const renderDonutSlices = (
    slices: { label: string; value: number; color: string }[],
    total: number,
    hoveredIndex: number | null,
    onHover: (idx: number | null) => void
  ) => {
    if (total === 0 || slices.length === 0) {
      return (
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="28"
        />
      );
    }

    const cx = 100;
    const cy = 100;
    const outerR = 78;
    const innerR = 52;
    let accumulatedAngle = -Math.PI / 2;

    return slices.map((slice, idx) => {
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + sliceAngle;
      accumulatedAngle = endAngle;

      const isHovered = hoveredIndex === idx;
      const isDimmed = hoveredIndex !== null && !isHovered;

      if (sliceAngle >= 2 * Math.PI - 0.001) {
        return (
          <path
            key={slice.label}
            d={`
              M ${cx - outerR} ${cy}
              A ${outerR} ${outerR} 0 1 0 ${cx + outerR} ${cy}
              A ${outerR} ${outerR} 0 1 0 ${cx - outerR} ${cy}
              M ${cx - innerR} ${cy}
              A ${innerR} ${innerR} 0 1 1 ${cx + innerR} ${cy}
              A ${innerR} ${innerR} 0 1 1 ${cx - innerR} ${cy}
              Z
            `}
            fill={slice.color}
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={() => onHover(idx)}
            onMouseLeave={() => onHover(null)}
          />
        );
      }

      const x1 = cx + outerR * Math.cos(startAngle);
      const y1 = cy + outerR * Math.sin(startAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);
      const x3 = cx + innerR * Math.cos(endAngle);
      const y3 = cy + innerR * Math.sin(endAngle);
      const x4 = cx + innerR * Math.cos(startAngle);
      const y4 = cy + innerR * Math.sin(startAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const pathData = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      return (
        <path
          key={slice.label}
          d={pathData}
          fill={slice.color}
          className={`transition-all duration-200 cursor-pointer ${
            isDimmed ? 'opacity-40' : 'opacity-100'
          }`}
          style={{
            transformOrigin: '100px 100px',
            transform: isHovered ? 'scale(1.03)' : 'scale(1)',
          }}
          onMouseEnter={() => onHover(idx)}
          onMouseLeave={() => onHover(null)}
        />
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100 transition-colors"
            title="Back to Drives"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                {drive.companyName}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold border border-zinc-200">
                {drive.jobRole}
              </span>
              <span className="text-xs font-mono text-emerald-700 font-semibold">
                {drive.package}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Executive Drive Analytics & Funnel Intelligence Dashboard.
            </p>
          </div>
        </div>

        {/* Action Controls & Drive Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 font-medium">Switch Drive:</span>
            <select
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-2xs"
            >
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.companyName} ({d.jobRole})
                </option>
              ))}
            </select>
          </div>

          {/* Primary "See All Data" Master Explorer Button */}
          <button
            type="button"
            onClick={() => {
              setShowAllDataModal(true);
              setDataCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            title="View and search complete dataset ledger"
          >
            <Database className="w-3.5 h-3.5 text-zinc-300" />
            <span>See All Data ({applications.length})</span>
          </button>

          {/* Excel Export Placed Offers */}
          <button
            type="button"
            onClick={handleExportSelected}
            disabled={placements.length === 0}
            className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-zinc-50 disabled:bg-zinc-50 disabled:text-zinc-400 text-zinc-800 border border-zinc-300 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Download final selected / placed candidates list in Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Export Selected ({placements.length})</span>
          </button>
        </div>
      </div>

      {/* Export Toast / Notification */}
      {exportFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{exportFeedback}</span>
        </div>
      )}

      {/* KPI Metric Strip (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs">
          <span className="text-zinc-500 text-xs block">Registered Applicants</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {applications.length}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5 font-mono">
            {eligibleCount} verified eligible
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs">
          <span className="text-zinc-500 text-xs block">Conversion Rate</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {placementRate}%
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            Total applicants placed
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs">
          <span className="text-zinc-500 text-xs block">Final Placed Offers</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {finalPlacedCount}
          </span>
          <span className="text-[11px] text-emerald-800 block mt-0.5">
            Placement confirmed
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs">
          <span className="text-zinc-500 text-xs block">Rounds Executed</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {rounds.length}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            {rounds.filter((r) => r.status === 'COMPLETED').length} finalized
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs">
          <span className="text-zinc-500 text-xs block">Placed Avg CGPA</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {avgPlacedCgpa}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            Academic caliber
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs">
          <span className="text-zinc-500 text-xs block">Top Branch</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 truncate block">
            {topBranch}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            {topBranchCount} offers achieved
          </span>
        </div>
      </div>

      {/* Visualizations Section: Interactive Pie/Donut Charts & CGPA Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Interactive Donut Chart - Department Distribution */}
        <div className="lg:col-span-6 p-5 border border-zinc-200 bg-white rounded-lg space-y-4 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-zinc-950 font-bold text-sm">
                <PieChartIcon className="w-4 h-4 text-zinc-700" />
                <span>Department Distribution</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Proportional breakdown of engineering branches.
              </p>
            </div>

            {/* Segmented Switcher: Applied vs Placed */}
            <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setBranchChartMetric('applied')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  branchChartMetric === 'applied'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Applicants
              </button>
              <button
                type="button"
                onClick={() => setBranchChartMetric('placed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  branchChartMetric === 'placed'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Placed
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            {/* SVG Donut Graphic */}
            <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform">
                {renderDonutSlices(
                  branchPieData,
                  branchPieTotal,
                  hoveredBranchSlice,
                  setHoveredBranchSlice
                )}
              </svg>

              {/* Center Metrics Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                {hoveredBranchSlice !== null && branchPieData[hoveredBranchSlice] ? (
                  <>
                    <span className="text-[11px] font-semibold text-zinc-500 truncate max-w-[90px]">
                      {branchPieData[hoveredBranchSlice].label}
                    </span>
                    <span className="text-lg font-bold font-mono text-zinc-900 leading-tight">
                      {branchPieData[hoveredBranchSlice].value}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {(
                        (branchPieData[hoveredBranchSlice].value / Math.max(1, branchPieTotal)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold font-mono text-zinc-900 leading-tight">
                      {branchPieTotal}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Total {branchChartMetric === 'applied' ? 'Applied' : 'Offers'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Legend List */}
            <div className="flex-1 w-full max-h-48 overflow-y-auto pr-1 space-y-1.5 text-xs">
              {branchPieData.length === 0 ? (
                <div className="text-xs text-zinc-400 py-6 text-center">
                  No records to display for this metric.
                </div>
              ) : (
                branchPieData.map((slice, idx) => {
                  const pct = ((slice.value / Math.max(1, branchPieTotal)) * 100).toFixed(1);
                  const isHovered = hoveredBranchSlice === idx;
                  return (
                    <div
                      key={slice.label}
                      onMouseEnter={() => setHoveredBranchSlice(idx)}
                      onMouseLeave={() => setHoveredBranchSlice(null)}
                      className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                        isHovered ? 'bg-zinc-100 font-semibold' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="text-zinc-800 truncate">{slice.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-zinc-600 shrink-0">
                        <span>{slice.value}</span>
                        <span className="text-zinc-400 text-[11px] w-11 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Interactive Donut Chart - Funnel Health & Attrition */}
        <div className="lg:col-span-6 p-5 border border-zinc-200 bg-white rounded-lg space-y-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-1.5 text-zinc-950 font-bold text-sm">
              <Layers className="w-4 h-4 text-zinc-700" />
              <span>Pipeline Status & Throughput</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Live status categorization of all registered applicants.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            {/* SVG Donut Graphic */}
            <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform">
                {renderDonutSlices(
                  healthPieData,
                  healthPieTotal,
                  hoveredStatusSlice,
                  setHoveredStatusSlice
                )}
              </svg>

              {/* Center Metrics Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                {hoveredStatusSlice !== null && healthPieData[hoveredStatusSlice] ? (
                  <>
                    <span className="text-[11px] font-semibold text-zinc-500 truncate max-w-[90px]">
                      {healthPieData[hoveredStatusSlice].label}
                    </span>
                    <span className="text-lg font-bold font-mono text-zinc-900 leading-tight">
                      {healthPieData[hoveredStatusSlice].value}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {(
                        (healthPieData[hoveredStatusSlice].value / Math.max(1, healthPieTotal)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold font-mono text-zinc-900 leading-tight">
                      {healthPieTotal}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Total Pipeline
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status Legend List */}
            <div className="flex-1 w-full space-y-2 text-xs">
              {healthPieData.map((slice, idx) => {
                const pct = ((slice.value / Math.max(1, healthPieTotal)) * 100).toFixed(1);
                const isHovered = hoveredStatusSlice === idx;
                return (
                  <div
                    key={slice.label}
                    onMouseEnter={() => setHoveredStatusSlice(idx)}
                    onMouseLeave={() => setHoveredStatusSlice(null)}
                    className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors ${
                      isHovered ? 'bg-zinc-100 font-semibold' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-zinc-800">{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-zinc-600">
                      <span className="font-semibold">{slice.value}</span>
                      <span className="text-zinc-400 text-[11px] w-12 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recruitment Funnel Progression with Stage-by-Stage CSV Download Buttons */}
      <div className="p-5 border border-zinc-200 bg-white rounded-lg space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-zinc-950 font-bold text-sm">
              <TrendingUp className="w-4 h-4 text-zinc-700" />
              <span>Recruitment Funnel Progression & Candidate Exports</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Stage-wise candidate attrition with direct CSV candidate roster downloads.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAllDataModal(true);
              setDataCurrentPage(1);
            }}
            className="self-start sm:self-auto text-xs text-zinc-700 hover:text-zinc-950 font-medium underline underline-offset-2 flex items-center gap-1"
          >
            <span>Open Data Explorer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {/* Stage 0: Total Applications */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
            <div className="w-40 shrink-0">
              <div className="font-semibold text-zinc-900 truncate">Total Applications</div>
              <div className="text-[10px] text-zinc-400">All Registered Students</div>
            </div>

            <div className="flex-1 bg-zinc-100 rounded-md h-8 overflow-hidden relative border border-zinc-200/50">
              <div
                className="bg-zinc-800 h-full rounded transition-all duration-300"
                style={{ width: '100%' }}
              />
              <div className="absolute inset-y-0 left-3 flex items-center gap-2 text-white font-mono text-xs tabular-nums font-semibold">
                <span>{applications.length} Applicants (100%)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTotalApplicationsCsv}
              disabled={applications.length === 0}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:text-zinc-950 disabled:text-zinc-400 bg-white hover:bg-zinc-50 disabled:bg-zinc-100 border border-zinc-300 disabled:border-zinc-200 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Download total registered applications as CSV (5 fields)"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600" />
              <span>Download CSV ({applications.length})</span>
            </button>
          </div>

          <div className="flex justify-center -my-1 text-zinc-300">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Each Evaluation Round Stage */}
          {rounds.map((rnd, idx) => {
            const roundCandidates = candidates.filter((c) => c.roundId === rnd.id);
            const holdCount = roundCandidates.filter((c) => c.entryStatus === 'HOLD').length;
            const maxBase = applications.length || 1;
            const widthPct = Math.min(100, Math.max(8, (roundCandidates.length / maxBase) * 100));
            const selectedStudents = getSelectedAndHoldStudentsForRound(rnd, idx);

            return (
              <React.Fragment key={rnd.id}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
                  <div className="w-40 shrink-0">
                    <div className="font-semibold text-zinc-900 truncate">{rnd.roundName}</div>
                    <div className="text-[10px] text-zinc-500">
                      {rnd.roundType} · {rnd.status}
                    </div>
                  </div>

                  <div className="flex-1 bg-zinc-100 rounded-md h-8 overflow-hidden relative border border-zinc-200/50">
                    <div
                      className="bg-zinc-700 h-full rounded transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center gap-2 text-white font-mono text-xs tabular-nums font-semibold">
                      <span>
                        {roundCandidates.length} Candidates (
                        {((roundCandidates.length / maxBase) * 100).toFixed(0)}%)
                      </span>
                      {holdCount > 0 && (
                        <span className="text-[10px] text-amber-300 font-normal">
                          ({holdCount} on HOLD)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadRoundSelectedCsv(rnd, idx)}
                    disabled={selectedStudents.length === 0}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 disabled:text-zinc-400 bg-white hover:bg-emerald-50/50 disabled:bg-zinc-100 border border-emerald-300 disabled:border-zinc-200 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs"
                    title={`Download candidates selected / on HOLD in ${rnd.roundName} as CSV (5 fields)`}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download CSV ({selectedStudents.length})</span>
                  </button>
                </div>

                {idx < rounds.length - 1 && (
                  <div className="flex justify-center -my-1 text-zinc-300">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          <div className="flex justify-center -my-1 text-zinc-300">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Final Placements Stage */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
            <div className="w-40 shrink-0">
              <div className="font-semibold text-emerald-950 truncate">Final Placed Offers</div>
              <div className="text-[10px] text-emerald-700 font-medium">Hired & Confirmed</div>
            </div>

            <div className="flex-1 bg-zinc-100 rounded-md h-8 overflow-hidden relative border border-emerald-200/50">
              <div
                className="bg-emerald-600 h-full rounded transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(6, (finalPlacedCount / (applications.length || 1)) * 100)
                  )}%`,
                }}
              />
              <div className="absolute inset-y-0 left-3 flex items-center gap-2 text-white font-mono text-xs tabular-nums font-bold">
                <span>
                  {finalPlacedCount} Offers ({placementRate}%)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadFinalPlacedCsv}
              disabled={finalPlacedCount === 0}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 disabled:text-zinc-400 bg-white hover:bg-emerald-50/50 disabled:bg-zinc-100 border border-emerald-300 disabled:border-zinc-200 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Download final placed candidates as CSV (5 fields)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download CSV ({finalPlacedCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: CGPA Spread & Department Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CGPA Distribution Bar Chart */}
        <div className="lg:col-span-5 p-5 border border-zinc-200 bg-white rounded-lg space-y-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-1.5 text-zinc-950 font-bold text-sm">
              <GraduationCap className="w-4 h-4 text-zinc-700" />
              <span>Academic Performance (CGPA Distribution)</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Candidate qualification spread across GPA brackets.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {cgpaBuckets.map((bucket) => {
              const maxApplied = Math.max(...cgpaBuckets.map((b) => b.applied), 1);
              const appliedWidth = Math.max(4, (bucket.applied / maxApplied) * 100);
              const placedRate =
                bucket.applied > 0 ? ((bucket.placed / bucket.applied) * 100).toFixed(0) : '0';

              return (
                <div key={bucket.label} className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-zinc-700">
                    <span className="font-semibold text-zinc-900">{bucket.label} CGPA</span>
                    <span className="font-mono text-zinc-500 text-[11px]">
                      {bucket.applied} applied · <strong className="text-emerald-700 font-bold">{bucket.placed} placed</strong> ({placedRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden flex">
                    <div
                      className="bg-zinc-800 h-full rounded-l-full"
                      style={{ width: `${appliedWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Conversion Table */}
        <div className="lg:col-span-7 p-5 border border-zinc-200 bg-white rounded-lg space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-zinc-950 font-bold text-sm">
                <BarChart3 className="w-4 h-4 text-zinc-700" />
                <span>Department Performance Matrix</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Stage-wise qualification and final conversion by branch.
              </p>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Applied</th>
                  <th className="py-2.5 px-3">Eligible</th>
                  <th className="py-2.5 px-3">Placed</th>
                  <th className="py-2.5 px-3">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {Object.keys(branchCounts).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-zinc-400">
                      No departmental data recorded yet.
                    </td>
                  </tr>
                ) : (
                  Object.entries(branchCounts).map(([branch, stats]) => {
                    const rate =
                      stats.applied > 0 ? ((stats.placed / stats.applied) * 100).toFixed(1) : '0';
                    return (
                      <tr key={branch} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3 font-semibold text-zinc-900 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: BRANCH_COLORS[branch] || BRANCH_COLORS.Other }}
                          />
                          <span>{branch}</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-zinc-700">{stats.applied}</td>
                        <td className="py-2 px-3 font-mono text-zinc-600">{stats.eligible}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">{stats.placed}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-zinc-900">
                          <div className="flex items-center gap-2">
                            <span>{rate}%</span>
                            <div className="w-12 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, Number(rate))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MASTER DATA EXPLORER MODAL */}
      {showAllDataModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white border border-zinc-300 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between gap-4 bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 text-white rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950">
                    Drive Master Dataset — {drive.companyName}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Complete applicant roster with contact details, academic scores, and live status.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportFilteredDataCsv}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Export filtered records in CSV (5 fields)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV ({filteredDataRecords.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAllDataModal(false)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-3 sm:p-4 border-b border-zinc-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dataSearchQuery}
                    onChange={(e) => {
                      setDataSearchQuery(e.target.value);
                      setDataCurrentPage(1);
                    }}
                    placeholder="Search name, roll, mobile, email..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                  {dataSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDataSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Branch Filter */}
                <select
                  value={dataBranchFilter}
                  onChange={(e) => {
                    setDataBranchFilter(e.target.value);
                    setDataCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="ALL">All Branches</option>
                  {Object.keys(branchCounts).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Segmented Buttons */}
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg text-xs overflow-x-auto max-w-full">
                {[
                  { id: 'ALL', label: `All (${allDataRecords.length})` },
                  { id: 'PLACED', label: `Placed (${finalPlacedCount})` },
                  { id: 'IN_FLIGHT', label: `In-Flight (${inFlightCount})` },
                  { id: 'HOLD', label: `HOLD (${holdCountTotal})` },
                  { id: 'ELIGIBLE', label: `Eligible (${eligibleCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setDataStatusFilter(tab.id);
                      setDataCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                      dataStatusFilter === tab.id
                        ? 'bg-white text-zinc-950 font-bold shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3">Mobile Number</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">CGPA</th>
                    <th className="py-2.5 px-3">Funnel Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400 font-sans">
                        No candidates match the specified filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((rec) => (
                      <tr key={rec.studentId} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                          {rec.serialNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 font-mono">
                          {rec.rollNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium font-sans text-zinc-900">
                          {rec.fullName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-sans font-semibold text-zinc-700">
                            {rec.branch}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600">{rec.mobileNumber}</td>
                        <td className="py-2.5 px-3 text-zinc-600 font-sans">{rec.emailAddress}</td>
                        <td className="py-2.5 px-3 text-zinc-800 font-bold">{rec.cgpa.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-sans">
                          {rec.isPlaced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                              Placed Offer
                            </span>
                          ) : rec.isHold ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                              On HOLD
                            </span>
                          ) : rec.isActiveInFlight ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-800 text-[11px] font-semibold border border-sky-200">
                              In-Flight
                            </span>
                          ) : rec.eligibilityStatus === 'NOT_ELIGIBLE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[11px] border border-zinc-200">
                              Ineligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[11px]">
                              Eliminated
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer & Pagination */}
            <div className="p-3 sm:p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-600">
              <span className="font-mono">
                Showing{' '}
                <strong className="text-zinc-900 font-bold">
                  {filteredDataRecords.length === 0
                    ? 0
                    : (dataCurrentPage - 1) * dataPageSize + 1}
                  –
                  {Math.min(dataCurrentPage * dataPageSize, filteredDataRecords.length)}
                </strong>{' '}
                of <strong className="text-zinc-900">{filteredDataRecords.length}</strong> records
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDataCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={dataCurrentPage <= 1}
                  className="px-2.5 py-1 text-xs border border-zinc-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="font-mono px-1">
                  {dataCurrentPage} / {totalDataPages}
                </span>
                <button
                  type="button"
                  onClick={() => setDataCurrentPage((p) => Math.min(totalDataPages, p + 1))}
                  disabled={dataCurrentPage >= totalDataPages}
                  className="px-2.5 py-1 text-xs border border-zinc-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
