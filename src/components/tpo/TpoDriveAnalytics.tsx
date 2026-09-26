import React, { useState } from 'react';
import { Drive, DriveRound, Application, RoundCandidate, Placement, Student } from '../../types';
import { ironStorage } from '../../services/storage';
import { ArrowLeft, ArrowDown, Users, CheckCircle2, XCircle, Clock, Award } from 'lucide-react';

interface TpoDriveAnalyticsProps {
  initialDriveId?: string;
  onBack: () => void;
}

export const TpoDriveAnalytics: React.FC<TpoDriveAnalyticsProps> = ({
  initialDriveId,
  onBack,
}) => {
  const drives = ironStorage.getDrives();
  const [selectedDriveId, setSelectedDriveId] = useState<string>(
    initialDriveId || (drives.length > 0 ? drives[0].id : '')
  );

  const drive = drives.find((d) => d.id === selectedDriveId);
  const students = ironStorage.getStudents();
  const studentMap = new Map(students.map((s) => [s.id, s]));

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

  // Branch breakdown of applicants
  const branchCounts: Record<string, { applied: number; placed: number }> = {};
  applications.forEach((a) => {
    const s = studentMap.get(a.studentId);
    const b = s?.branch || 'Other';
    if (!branchCounts[b]) branchCounts[b] = { applied: 0, placed: 0 };
    branchCounts[b].applied++;
  });
  placements.forEach((p) => {
    const s = studentMap.get(p.studentId);
    const b = s?.branch || 'Other';
    if (!branchCounts[b]) branchCounts[b] = { applied: 0, placed: 0 };
    branchCounts[b].placed++;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
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
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">Drive Funnel & Analytics</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Round-by-round progression metrics, candidate conversion, and departmental participation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="text-zinc-500 font-medium">Select Drive:</span>
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-zinc-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.companyName} ({d.jobRole})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Level Metric Cards (Per Section 55) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg">
          <span className="text-zinc-500 text-xs block">Applications</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {applications.length}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5 font-mono">
            {eligibleCount} eligible verified
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg">
          <span className="text-zinc-500 text-xs block">Rounds Executed</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {rounds.length}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            {rounds.filter((r) => r.status === 'COMPLETED').length} completed
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg">
          <span className="text-zinc-500 text-xs block">Final Selected</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {finalPlacedCount}
          </span>
          <span className="text-[11px] text-emerald-800 block mt-0.5">
            Automatic placement confirmed
          </span>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200 rounded-lg">
          <span className="text-zinc-500 text-xs block">Conversion Rate</span>
          <span className="text-2xl font-bold font-mono text-zinc-950 tabular-nums">
            {placementRate}%
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            Of total applicants placed
          </span>
        </div>
      </div>

      {/* Round Progression Funnel (Per Section 51) */}
      <div className="p-5 border border-zinc-200 bg-white rounded-lg space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-950">Recruitment Funnel Progression</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Attrition and stage-wise candidate throughput across evaluation checkpoints.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {/* Stage 0: Applications */}
          <div className="flex items-center gap-4 text-xs">
            <div className="w-36 font-semibold text-zinc-900 truncate">Total Applications</div>
            <div className="flex-1 bg-zinc-100 rounded h-7 overflow-hidden relative">
              <div
                className="bg-zinc-800 h-full rounded transition-all duration-300"
                style={{ width: '100%' }}
              />
              <span className="absolute inset-y-0 right-3 flex items-center font-mono font-bold text-white text-xs tabular-nums">
                {applications.length}
              </span>
            </div>
          </div>

          <div className="flex justify-center -my-1 text-zinc-400">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Each Round Stage */}
          {rounds.map((rnd, idx) => {
            const roundCandidates = candidates.filter((c) => c.roundId === rnd.id);
            const activeCount = roundCandidates.filter((c) => c.entryStatus === 'ACTIVE').length;
            const holdCount = roundCandidates.filter((c) => c.entryStatus === 'HOLD').length;
            const maxBase = applications.length || 1;
            const widthPct = Math.min(100, Math.max(8, (roundCandidates.length / maxBase) * 100));

            return (
              <React.Fragment key={rnd.id}>
                <div className="flex items-center gap-4 text-xs">
                  <div className="w-36">
                    <div className="font-semibold text-zinc-900 truncate">{rnd.roundName}</div>
                    <div className="text-[10px] text-zinc-400">{rnd.roundType}</div>
                  </div>
                  <div className="flex-1 bg-zinc-100 rounded h-7 overflow-hidden relative">
                    <div
                      className="bg-zinc-700 h-full rounded transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center gap-2 text-white font-mono text-xs tabular-nums font-semibold">
                      <span>{roundCandidates.length} Candidates</span>
                      {holdCount > 0 && (
                        <span className="text-[10px] text-amber-300 font-normal">
                          ({holdCount} carried over on HOLD)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {idx < rounds.length - 1 && (
                  <div className="flex justify-center -my-1 text-zinc-400">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          <div className="flex justify-center -my-1 text-zinc-400">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Final Placements Stage */}
          <div className="flex items-center gap-4 text-xs">
            <div className="w-36 font-semibold text-emerald-950 truncate">Final Placed Offers</div>
            <div className="flex-1 bg-zinc-100 rounded h-7 overflow-hidden relative">
              <div
                className="bg-emerald-600 h-full rounded transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(6, (finalPlacedCount / (applications.length || 1)) * 100))}%`,
                }}
              />
              <span className="absolute inset-y-0 left-3 flex items-center font-mono font-bold text-white text-xs tabular-nums">
                {finalPlacedCount} Placed Students
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Breakdown (Per Section 50) */}
      <div className="p-5 border border-zinc-200 bg-white rounded-lg space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-950">Branch-Wise Applications & Placements</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Participation and selection distribution by student engineering department.
          </p>
        </div>

        <div className="border border-zinc-200 rounded overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3">Applied</th>
                <th className="py-2.5 px-3">Placed</th>
                <th className="py-2.5 px-3">Selection Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {Object.keys(branchCounts).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-zinc-400">
                    No departmental data recorded yet.
                  </td>
                </tr>
              ) : (
                Object.entries(branchCounts).map(([branch, stats]) => {
                  const rate = stats.applied > 0 ? ((stats.placed / stats.applied) * 100).toFixed(1) : '0';
                  return (
                    <tr key={branch} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3 font-semibold text-zinc-900">{branch}</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-700">{stats.applied}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{stats.placed}</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-600">{rate}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
