import React, { useState } from 'react';
import { Drive } from '../../types';
import { ironStorage } from '../../services/storage';
import { DriveCard } from './DriveCard';
import { StudentApplyModal } from './StudentApplyModal';
import { DriveDetailsModal } from './DriveDetailsModal';
import { Search, Briefcase, Calendar, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import iconSrc from '../../icon.svg';

interface PublicHomeProps {
  onOpenLogin: () => void;
  onRefresh: () => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({ onOpenLogin, onRefresh }) => {
  const drives = ironStorage.getDrives();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');

  // Modals state
  const [selectedDriveForDetails, setSelectedDriveForDetails] = useState<Drive | null>(null);
  const [selectedDriveForApply, setSelectedDriveForApply] = useState<Drive | null>(null);

  const filteredDrives = drives.filter((d) => {
    if (d.status === 'DRAFT') return false; // Public does not see draft drives
    const matchesSearch =
      d.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.jobRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section (Anti-slop: Natural typography, no purple gradients, crisp editorial clarity) */}
      <section className="py-10 border-b border-zinc-200">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <img src={iconSrc} alt="IRON Logo" className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 text-balance">
            Integrated Recruitment Operations Navigator
          </h1>
          <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">
            Centralized digital recruitment workflow for upcoming campus drives. Verify your eligibility,
            submit instant applications using your college roll number, and track round selections.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Zero-paperwork rounds</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-900" />
              <span>Real-time eligibility engine</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>Permanent Master DB</span>
            </span>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by company, role, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 self-start sm:self-auto border border-zinc-200 p-1 rounded bg-zinc-50 text-xs">
          {(['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                statusFilter === st
                  ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {st === 'ALL' ? 'All Drives' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Drives Grid */}
      {filteredDrives.length === 0 ? (
        <div className="py-16 text-center text-xs text-zinc-500 border border-dashed border-zinc-300 rounded-lg">
          No recruitment drives match your current filter. Check back soon for upcoming campus drives.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrives.map((drive) => (
            <DriveCard
              key={drive.id}
              drive={drive}
              onApply={(d) => setSelectedDriveForApply(d)}
              onViewDetails={(d) => setSelectedDriveForDetails(d)}
            />
          ))}
        </div>
      )}

      {/* Recruitment Instructions Card */}
      <section className="p-6 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
        <h2 className="text-sm font-bold text-zinc-950">How Campus Placement Drives Work in IRON</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-600">
          <div>
            <div className="font-semibold text-zinc-900 mb-1">1. Student Master Sourcing</div>
            <p className="leading-relaxed">
              Students do not need to register accounts. Your official CGPA, branch, and backlog counts
              are maintained directly by the TPO in the Student Master DB.
            </p>
          </div>
          <div>
            <div className="font-semibold text-zinc-900 mb-1">2. Instant Application</div>
            <p className="leading-relaxed">
              Enter your roll number before 00:00 on the drive date. The system validates your eligibility
              and immediately enlists you for Round 1 screening.
            </p>
          </div>
          <div>
            <div className="font-semibold text-zinc-900 mb-1">3. Automated Progression</div>
            <p className="leading-relaxed">
              Coordinators form batches; HR records SELECT or HOLD. Candidates selected in the final
              round automatically receive confirmed college placement records.
            </p>
          </div>
        </div>
      </section>

      {/* Modals */}
      <StudentApplyModal
        isOpen={!!selectedDriveForApply}
        onClose={() => setSelectedDriveForApply(null)}
        drive={selectedDriveForApply}
        onApplicationSubmitted={() => {
          onRefresh();
        }}
      />

      <DriveDetailsModal
        isOpen={!!selectedDriveForDetails}
        onClose={() => setSelectedDriveForDetails(null)}
        drive={selectedDriveForDetails}
        onApplyClick={(d) => {
          setSelectedDriveForDetails(null);
          setSelectedDriveForApply(d);
        }}
      />
    </div>
  );
};
