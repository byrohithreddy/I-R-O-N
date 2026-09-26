import React from 'react';
import { Shield, Database, Users, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import iconSrc from '../../icon.svg';

export const AboutIron: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2">
          <img src={iconSrc} alt="IRON Logo" className="w-6 h-6" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">About IRON</h1>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Integrated Recruitment Operations Navigator — Digital Campus Placement Infrastructure
        </p>
      </div>

      {/* Purpose & Philosophy */}
      <section className="space-y-3 text-xs leading-relaxed text-zinc-700">
        <h2 className="text-sm font-bold text-zinc-950">Core System Architecture</h2>
        <p>
          IRON replaces fragmented paper-based recruitment drives and spreadsheet confusion with a single
          centralized digital workflow. The system enforces institutional business rules at the database
          and application layer rather than relying on manual coordinator checks.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold text-zinc-950">
              <Database className="w-4 h-4 text-zinc-800" />
              <span>Strict Data Separation</span>
            </div>
            <p className="text-zinc-600">
              The <strong>Student Master Database</strong> is permanent college property. In contrast, individual
              recruitment drive data (applications, rounds, batch assignments, HR evaluations) has a strict
              <strong> 6-month retention cycle</strong>. Expired drives are backed up as full ZIP archives and deleted,
              while the Student Master DB remains untouched.
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold text-zinc-950">
              <Users className="w-4 h-4 text-zinc-800" />
              <span>Zero-Login Student Access</span>
            </div>
            <p className="text-zinc-600">
              Students never create accounts. Applying to drives requires only their institutional roll number.
              Authoritative CGPA, branch, and backlog details are auto-verified in real time, preventing fraudulent
              self-reported credentials.
            </p>
          </div>
        </div>
      </section>

      {/* Authoritative Rules Reference */}
      <section className="space-y-4 text-xs">
        <h2 className="text-sm font-bold text-zinc-950">Key Business Rules Implemented in IRON</h2>

        <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-200">
          <div className="p-3.5 space-y-1">
            <div className="font-semibold text-zinc-900">Rule 10 & 11 · Application Deadline Cutoff</div>
            <p className="text-zinc-600">
              For a drive occurring on date <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">D</code>, applications
              strictly close at <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">00:00</code> on that date. Late
              submissions are blocked automatically.
            </p>
          </div>

          <div className="p-3.5 space-y-1">
            <div className="font-semibold text-zinc-900">Rule 12 & 15 · Database-Level Uniqueness</div>
            <p className="text-zinc-600">
              A student can apply only once per drive (<code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">UNIQUE(drive_id, student_id)</code>)
              and can be assigned to only one batch per round (<code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">UNIQUE(round_id, student_id)</code>).
              Multiple coordinators working simultaneously cannot double-assign candidates.
            </p>
          </div>

          <div className="p-3.5 space-y-1">
            <div className="font-semibold text-zinc-900">Rule 17 & 18 · HOLD is NOT Rejection</div>
            <p className="text-zinc-600">
              In non-final rounds, HR can designate candidates as <strong>HOLD</strong>. Held candidates are not eliminated;
              they carry forward into the next fresh round candidate pool as pending evaluations.
            </p>
          </div>

          <div className="p-3.5 space-y-1">
            <div className="font-semibold text-zinc-900">Rule 22 & 40 · Strict Final-Round Logic</div>
            <p className="text-zinc-600">
              In the designated Final Round, the <strong>HOLD option is completely disabled</strong>. HR can only SELECT.
              Selected final-round candidates automatically create permanent college placement records.
            </p>
          </div>

          <div className="p-3.5 space-y-1">
            <div className="font-semibold text-zinc-900">Rule 21 · Batch Freezing & Immutability</div>
            <p className="text-zinc-600">
              Once an HR evaluator submits a batch, it enters a frozen, read-only state. No further coordinator or HR edits
              are allowed, guaranteeing an audit trail.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
