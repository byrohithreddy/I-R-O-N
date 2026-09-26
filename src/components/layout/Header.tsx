import React, { useState } from 'react';
import { User } from '../../types';
import { ShieldCheck, UserCheck, Briefcase, LogOut, ArrowRight, Menu, X } from 'lucide-react';
import iconSrc from '../../icon.svg';

interface HeaderProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onOpenLogin,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (view: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Single element brand wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavigate(currentUser ? `${currentUser.role.toLowerCase()}-home` : 'public-drives')}
            className="flex items-center gap-2 text-left group"
          >
            <img src={iconSrc} alt="IRON Logo" className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight text-zinc-950">IRON</span>
            <span className="hidden sm:inline text-xs text-zinc-400 font-mono tracking-widest uppercase">
              / Placement Ops
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-600">
          {!currentUser ? (
            <>
              <button
                onClick={() => handleNavigate('public-drives')}
                className={`transition-colors py-1 ${
                  currentView === 'public-drives'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Recruitment Drives
              </button>
              <button
                onClick={() => handleNavigate('about')}
                className={`transition-colors py-1 ${
                  currentView === 'about'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                About IRON
              </button>
            </>
          ) : currentUser.role === 'TPO' ? (
            <>
              <button
                onClick={() => handleNavigate('tpo-dashboard')}
                className={`transition-colors py-1 ${
                  currentView === 'tpo-dashboard'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate('tpo-drives')}
                className={`transition-colors py-1 ${
                  currentView === 'tpo-drives'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Manage Drives
              </button>
              <button
                onClick={() => handleNavigate('tpo-students')}
                className={`transition-colors py-1 ${
                  currentView === 'tpo-students'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Student Master DB
              </button>
              <button
                onClick={() => handleNavigate('tpo-placements')}
                className={`transition-colors py-1 ${
                  currentView === 'tpo-placements'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Placed Students
              </button>
              <button
                onClick={() => handleNavigate('tpo-expiry')}
                className={`transition-colors py-1 ${
                  currentView === 'tpo-expiry'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Data Expiry & Archive
              </button>
            </>
          ) : currentUser.role === 'COORDINATOR' ? (
            <>
              <button
                onClick={() => handleNavigate('coordinator-dashboard')}
                className={`transition-colors py-1 ${
                  currentView === 'coordinator-dashboard'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Assigned Drive
              </button>
              <button
                onClick={() => handleNavigate('coordinator-batches')}
                className={`transition-colors py-1 ${
                  currentView === 'coordinator-batches'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                Batch Management
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleNavigate('hr-dashboard')}
                className={`transition-colors py-1 ${
                  currentView === 'hr-dashboard'
                    ? 'text-zinc-950 font-semibold border-b-2 border-zinc-950'
                    : 'hover:text-zinc-950'
                }`}
              >
                HR Evaluation Console
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Actions & User Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs border border-zinc-200 rounded bg-zinc-50">
                {currentUser.role === 'TPO' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
                ) : currentUser.role === 'COORDINATOR' ? (
                  <UserCheck className="w-3.5 h-3.5 text-zinc-700" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5 text-zinc-700" />
                )}
                <span className="font-semibold text-zinc-900">{currentUser.role}</span>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-600 truncate max-w-[120px]">
                  {currentUser.companyName || currentUser.username}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded border border-zinc-200 transition-colors whitespace-nowrap"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors whitespace-nowrap"
              >
                <span>Staff & HR Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center p-2 text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-3 shadow-lg">
          <nav className="flex flex-col gap-3 text-sm font-medium text-zinc-600">
            {!currentUser ? (
              <>
                <button
                  onClick={() => handleNavigate('public-drives')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'public-drives' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Recruitment Drives
                </button>
                <button
                  onClick={() => handleNavigate('about')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'about' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  About IRON
                </button>
              </>
            ) : currentUser.role === 'TPO' ? (
              <>
                <button
                  onClick={() => handleNavigate('tpo-dashboard')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'tpo-dashboard' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => handleNavigate('tpo-drives')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'tpo-drives' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Manage Drives
                </button>
                <button
                  onClick={() => handleNavigate('tpo-students')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'tpo-students' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Student Master DB
                </button>
                <button
                  onClick={() => handleNavigate('tpo-placements')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'tpo-placements' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Placed Students
                </button>
                <button
                  onClick={() => handleNavigate('tpo-expiry')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'tpo-expiry' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Data Expiry & Archive
                </button>
              </>
            ) : currentUser.role === 'COORDINATOR' ? (
              <>
                <button
                  onClick={() => handleNavigate('coordinator-dashboard')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'coordinator-dashboard' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Assigned Drive
                </button>
                <button
                  onClick={() => handleNavigate('coordinator-batches')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'coordinator-batches' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  Batch Management
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate('hr-dashboard')}
                  className={`text-left px-2 py-1.5 rounded transition-colors ${
                    currentView === 'hr-dashboard' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  HR Evaluation Console
                </button>
              </>
            )}
            
            {/* Mobile User Info (if logged in) */}
            {currentUser && (
              <div className="mt-2 pt-3 border-t border-zinc-200">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {currentUser.role === 'TPO' ? (
                    <ShieldCheck className="w-4 h-4 text-zinc-700" />
                  ) : currentUser.role === 'COORDINATOR' ? (
                    <UserCheck className="w-4 h-4 text-zinc-700" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-zinc-700" />
                  )}
                  <span className="font-semibold text-zinc-900">{currentUser.role}</span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-600 truncate">{currentUser.companyName || currentUser.username}</span>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
