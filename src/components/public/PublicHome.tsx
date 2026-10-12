import React, { useState } from 'react';
import { Drive } from '../../types';
import { ironStorage } from '../../services/storage';
import { DriveCard } from './DriveCard';
import { StudentApplyModal } from './StudentApplyModal';
import { DriveDetailsModal } from './DriveDetailsModal';
import { BlurText } from '../reactbits/BlurText';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface PublicHomeProps {
  onOpenLogin: () => void;
  onRefresh: () => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({ onOpenLogin, onRefresh }) => {
  const drives = ironStorage.getDrives();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');

  const [selectedDriveForDetails, setSelectedDriveForDetails] = useState<Drive | null>(null);
  const [selectedDriveForApply, setSelectedDriveForApply] = useState<Drive | null>(null);

  const publicDrives = drives.filter((drive) => drive.status !== 'DRAFT');
  const availableDrives = publicDrives.filter(
    (drive) => drive.status === 'UPCOMING' || drive.status === 'ONGOING'
  );
  const companyCount = new Set(availableDrives.map((drive) => drive.companyName)).size;
  const previewDrives = availableDrives.slice(0, 2);

  const filteredDrives = publicDrives.filter((drive) => {
    const matchesSearch =
      drive.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drive.jobRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drive.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || drive.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-10 pb-12">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#111b18] text-white shadow-xl shadow-zinc-950/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgb(255 255 255 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.045) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(90deg, transparent, black 55%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgb(163 230 53 / 0.17), transparent 68%)',
          }}
        />

        <div className="relative grid gap-10 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:px-14 lg:py-16">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.9)]" />
              Campus opportunities, in one place
            </div>

            <BlurText className="max-w-2xl text-[2.7rem] font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-5xl lg:text-[3.75rem]">
              Make your next move count<span className="text-lime-300">.</span>
            </BlurText>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
              Find campus recruitment drives that fit your goals. Check eligibility, explore each role,
              and apply with your college roll number—all through IRON.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#opportunities"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-5 text-sm font-semibold text-[#172015] transition-colors hover:bg-lime-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111b18]"
              >
                Explore opportunities
                <ArrowDown className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-5 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111b18]"
              >
                Placement team login
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-lime-300" />
                Verified eligibility
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-lime-300" />
                Applications in one place
              </span>
            </div>
          </div>

          <SpotlightCard
            delay={0.12}
            className="rounded-2xl border border-white/10 bg-[#1a2822]/90 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Placement board
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-white">Open opportunities</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/20 bg-lime-300/10 px-2.5 py-1 text-[10px] font-medium text-lime-200">
                <Sparkles className="h-3 w-3" />
                Live
              </span>
            </div>

            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3.5">
                <p className="font-mono text-2xl font-semibold tabular-nums text-white">{availableDrives.length}</p>
                <p className="mt-1 text-[10px] text-zinc-400">Open drives</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3.5">
                <p className="font-mono text-2xl font-semibold tabular-nums text-white">{companyCount}</p>
                <p className="mt-1 text-[10px] text-zinc-400">Hiring companies</p>
              </div>
            </div>

            <div className="space-y-2">
              {previewDrives.length > 0 ? (
                previewDrives.map((drive) => (
                  <div
                    key={drive.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#111b18]/70 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{drive.companyName}</p>
                      <p className="mt-0.5 truncate text-[10px] text-zinc-400">{drive.jobRole}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] font-medium text-lime-200">{drive.package}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-center">
                  <p className="text-xs font-medium text-zinc-200">Your next opportunity is on its way.</p>
                  <p className="mt-1 text-[10px] leading-5 text-zinc-400">
                    New campus drives will appear here as soon as they are announced.
                  </p>
                </div>
              )}
            </div>

            <a
              href="#opportunities"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-lime-200 transition-colors hover:text-lime-100"
            >
              View the opportunity board
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </SpotlightCard>
        </div>
      </section>

      <section aria-label="Placement overview" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime-50 text-lime-800">
            <BriefcaseBusiness className="h-4 w-4" />
          </span>
          <div>
            <p className="font-mono text-xl font-semibold tabular-nums text-zinc-950">{availableDrives.length}</p>
            <p className="text-[11px] text-zinc-500">Open campus drives</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-950">Eligibility, upfront</p>
            <p className="text-[11px] text-zinc-500">Know the criteria before you apply</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-950">One place to start</p>
            <p className="text-[11px] text-zinc-500">Browse dates, roles, and application windows</p>
          </div>
        </div>
      </section>

      <section id="opportunities" className="scroll-mt-24 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              The opportunity board
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Find your next role
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500">
              Search campus drives and review the criteria before applying.
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            <span className="font-mono font-semibold tabular-nums text-zinc-900">{filteredDrives.length}</span>{' '}
            {filteredDrives.length === 1 ? 'drive' : 'drives'} shown
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search by company, role, or location</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="search"
              placeholder="Search company, role, or location"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-h-10 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10"
            />
          </label>

          <div
            role="group"
            aria-label="Filter drives by status"
            className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 text-[11px]"
          >
            {(['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
                className={`shrink-0 rounded-md px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/30 ${
                  statusFilter === status
                    ? 'bg-[#17231e] text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                {status === 'ALL' ? 'All drives' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {filteredDrives.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-950">No matching drives</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-zinc-500">
              Try a different search or status filter. Check back soon for new campus opportunities.
            </p>
            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="mt-4 text-xs font-semibold text-emerald-900 underline decoration-emerald-900/30 underline-offset-4 hover:text-emerald-700"
              >
                Clear search and filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDrives.map((drive, index) => (
              <DriveCard
                key={drive.id}
                drive={drive}
                delay={index * 0.05}
                onApply={(selectedDrive) => setSelectedDriveForApply(selectedDrive)}
                onViewDetails={(selectedDrive) => setSelectedDriveForDetails(selectedDrive)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-[#f5f7f3]">
        <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:p-9">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              How it works
            </p>
            <h2 className="mt-2 max-w-sm text-xl font-semibold leading-snug tracking-tight text-zinc-950">
              From finding a drive to tracking your progress.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="border-t border-zinc-300 pt-3">
              <span className="font-mono text-[10px] text-emerald-900">01 / DISCOVER</span>
              <h3 className="mt-2 text-xs font-semibold text-zinc-950">Find a good fit</h3>
              <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">
                Compare roles, drive dates, and eligibility criteria before you apply.
              </p>
            </div>
            <div className="border-t border-zinc-300 pt-3">
              <span className="font-mono text-[10px] text-emerald-900">02 / APPLY</span>
              <h3 className="mt-2 text-xs font-semibold text-zinc-950">Use your roll number</h3>
              <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">
                Apply with your college roll number—no separate student account required.
              </p>
            </div>
            <div className="border-t border-zinc-300 pt-3">
              <span className="font-mono text-[10px] text-emerald-900">03 / PROGRESS</span>
              <h3 className="mt-2 text-xs font-semibold text-zinc-950">Follow each round</h3>
              <p className="mt-1.5 text-[11px] leading-5 text-zinc-600">
                Keep up with your application as coordinators and recruiters update each stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <StudentApplyModal
        isOpen={!!selectedDriveForApply}
        onClose={() => setSelectedDriveForApply(null)}
        drive={selectedDriveForApply}
        onApplicationSubmitted={onRefresh}
      />

      <DriveDetailsModal
        isOpen={!!selectedDriveForDetails}
        onClose={() => setSelectedDriveForDetails(null)}
        drive={selectedDriveForDetails}
        onApplyClick={(drive) => {
          setSelectedDriveForDetails(null);
          setSelectedDriveForApply(drive);
        }}
      />
    </div>
  );
};
