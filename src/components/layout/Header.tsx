import React, { useState } from 'react';
import { User } from '../../types';
import {
  ArrowRight,
  Briefcase,
  BriefcaseBusiness,
  LogOut,
  Menu,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import iconSrc from '../../icon.svg';

interface HeaderProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

interface NavigationItem {
  label: string;
  view: string;
}

const PUBLIC_NAVIGATION: NavigationItem[] = [
  { label: 'Recruitment drives', view: 'public-drives' },
  { label: 'About IRON', view: 'about' },
];

const ROLE_NAVIGATION: Record<User['role'], NavigationItem[]> = {
  TPO: [
    { label: 'Overview', view: 'tpo-dashboard' },
    { label: 'Manage drives', view: 'tpo-drives' },
    { label: 'Student records', view: 'tpo-students' },
    { label: 'Placements', view: 'tpo-placements' },
    { label: 'Data archive', view: 'tpo-expiry' },
    { label: 'Security', view: 'tpo-security' },
  ],
  COORDINATOR: [
    { label: 'Assigned drive', view: 'coordinator-dashboard' },
    { label: 'Batch management', view: 'coordinator-batches' },
  ],
  HR: [{ label: 'Evaluation console', view: 'hr-dashboard' }],
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onOpenLogin,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigation = currentUser ? ROLE_NAVIGATION[currentUser.role] : PUBLIC_NAVIGATION;
  const roleIcon =
    currentUser?.role === 'TPO' ? (
      <ShieldCheck className="h-4 w-4" />
    ) : currentUser?.role === 'COORDINATOR' ? (
      <UserCheck className="h-4 w-4" />
    ) : (
      <Briefcase className="h-4 w-4" />
    );

  const handleNavigate = (view: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  const renderNavigation = (mobile = false) => (
    <nav
      aria-label={currentUser ? `${currentUser.role} navigation` : 'Main navigation'}
      className={mobile ? 'flex flex-col gap-1' : 'flex items-center gap-1 overflow-x-auto'}
    >
      {navigation.map(({ label, view }) => {
        const isActive = currentView === view;
        return (
          <button
            key={view}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => handleNavigate(view)}
            className={`whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 ${
              mobile
                ? `px-3.5 py-3 text-left text-sm ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`
                : `px-3 py-2 text-xs ${
                    isActive
                      ? 'bg-[#1f332b] text-lime-200'
                      : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                  }`
            }`}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <header className="app-header sticky top-0 z-40 w-full text-white">
      <div className="border-b border-white/[0.08] bg-[#14221c]">
        <div className="mx-auto flex h-[62px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => handleNavigate(navigation[0]?.view || 'public-drives')}
            className="group flex items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
            aria-label="IRON home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-lime-300/25 bg-lime-300/15 shadow-xs">
              <img src={iconSrc} alt="IRON Logo" className="h-5 w-5 brightness-0 invert" />
            </span>
            <span className="text-lg font-bold tracking-[-0.04em] text-white">IRON</span>
            <span className="hidden border-l border-white/15 pl-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 sm:inline">
              Placement operations
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <>
                <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 sm:flex">
                  <span className="text-lime-200">{roleIcon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-300">
                    {currentUser.role}
                  </span>
                  <span className="h-3 w-px bg-white/15" />
                  <span className="max-w-[150px] truncate text-xs text-white">
                    {currentUser.companyName || currentUser.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-lime-300 px-3.5 text-xs font-semibold text-[#17231e] transition-colors hover:bg-lime-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#14221c]"
              >
                <span>Staff & HR login</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-white/[0.08] bg-[#192820]">
        <div className="mx-auto hidden max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 md:flex lg:px-8">
          {renderNavigation()}
          {currentUser ? (
            <div className="flex shrink-0 items-center gap-2 py-2 text-[10px] text-zinc-500">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-lime-300/80" />
              Secure workspace
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2 py-2 text-[10px] text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 text-lime-300/80" />
              Student access · no account needed
            </div>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#17251f] px-4 py-3 shadow-xl md:hidden">
          <div className="mx-auto max-w-[1440px]">
            {currentUser && (
              <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-3 pb-3 pt-1 text-xs">
                <span className="text-lime-200">{roleIcon}</span>
                <span className="font-semibold text-white">{currentUser.role}</span>
                <span className="text-zinc-500">/</span>
                <span className="truncate text-zinc-300">
                  {currentUser.companyName || currentUser.username}
                </span>
              </div>
            )}
            {renderNavigation(true)}
          </div>
        </div>
      )}
    </header>
  );
};
