import React, { useState, useEffect } from 'react';
import { User, Drive } from './types';
import { ironStorage } from './services/storage';
import { Header } from './components/layout/Header';
import { LoginModal } from './components/auth/LoginModal';
import { PublicHome } from './components/public/PublicHome';
import { AboutIron } from './components/public/AboutIron';
import { TpoDashboard } from './components/tpo/TpoDashboard';
import { TpoDrives } from './components/tpo/TpoDrives';
import { TpoStudentMaster } from './components/tpo/TpoStudentMaster';
import { TpoPlacedStudents } from './components/tpo/TpoPlacedStudents';
import { TpoDriveAnalytics } from './components/tpo/TpoDriveAnalytics';
import { TpoDataExpiry } from './components/tpo/TpoDataExpiry';
import { CoordinatorView } from './components/coordinator/CoordinatorView';
import { HrEvaluationView } from './components/hr/HrEvaluationView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('iron_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const savedUser = sessionStorage.getItem('iron_active_user');
      if (savedUser) {
        const u: User = JSON.parse(savedUser);
        if (u.role === 'TPO') return 'tpo-dashboard';
        if (u.role === 'COORDINATOR') return 'coordinator-dashboard';
        if (u.role === 'HR') return 'hr-dashboard';
      }
      return 'public-drives';
    } catch {
      return 'public-drives';
    }
  });

  const [selectedAnalyticsDriveId, setSelectedAnalyticsDriveId] = useState<string | undefined>();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleRefresh = () => {
    ironStorage.syncWithBackend().catch(() => {});
    setRefreshTick((prev) => prev + 1);
  };

  // Real-time backend sync & auto-refresh listener (smooth, non-disruptive)
  useEffect(() => {
    // Initial sync
    ironStorage.syncWithBackend().catch(() => {});

    // Subscribe to backend updates only when changes actually occur
    const unsubscribe = ironStorage.subscribe(() => {
      setRefreshTick((prev) => prev + 1);
    });

    // Sync on tab focus or when window becomes visible
    const handleFocus = () => {
      ironStorage.syncWithBackend().catch(() => {});
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Gentle background poll (every 30 seconds) without remounting or resetting UI state
    const interval = setInterval(() => {
      ironStorage.syncWithBackend().catch(() => {});
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('iron_active_user', JSON.stringify(user));
    if (user.role === 'TPO') {
      setCurrentView('tpo-dashboard');
    } else if (user.role === 'COORDINATOR') {
      setCurrentView('coordinator-dashboard');
    } else if (user.role === 'HR') {
      setCurrentView('hr-dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('iron_active_user');
    setCurrentView('public-drives');
  };

  const handleNavigate = (view: string, driveId?: string) => {
    if (view === 'tpo-analytics' && driveId) {
      setSelectedAnalyticsDriveId(driveId);
    }
    setCurrentView(view);
  };

  // Safe drive lookup
  const drives = ironStorage.getDrives();

  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-sans">
      {/* Universal Top Bar */}
      <Header
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* PUBLIC VIEWS */}
        {!currentUser && (
          <>
            {currentView === 'public-drives' && (
              <PublicHome
                onOpenLogin={() => setIsLoginOpen(true)}
                onRefresh={handleRefresh}
              />
            )}
            {currentView === 'about' && <AboutIron />}
          </>
        )}

        {/* TPO ADMIN VIEWS */}
        {currentUser && currentUser.role === 'TPO' && (
          <>
            {currentView === 'tpo-dashboard' && (
              <TpoDashboard
                onNavigate={(v, dId) => handleNavigate(v, dId)}
                onCreateDrive={() => handleNavigate('tpo-drives')}
              />
            )}
            {currentView === 'tpo-drives' && (
              <TpoDrives
                initialDriveId={selectedAnalyticsDriveId}
                onNavigateToAnalytics={(dId) => {
                  setSelectedAnalyticsDriveId(dId);
                  setCurrentView('tpo-analytics');
                }}
                onRefresh={handleRefresh}
              />
            )}
            {currentView === 'tpo-students' && (
              <TpoStudentMaster onRefresh={handleRefresh} />
            )}
            {currentView === 'tpo-placements' && (
              <TpoPlacedStudents onRefresh={handleRefresh} />
            )}
            {currentView === 'tpo-analytics' && (
              <TpoDriveAnalytics
                initialDriveId={selectedAnalyticsDriveId}
                onBack={() => setCurrentView('tpo-drives')}
              />
            )}
            {currentView === 'tpo-expiry' && (
              <TpoDataExpiry onRefresh={handleRefresh} />
            )}
          </>
        )}

        {/* COORDINATOR VIEWS */}
        {currentUser && currentUser.role === 'COORDINATOR' && (
          <CoordinatorView currentUser={currentUser} onRefresh={handleRefresh} />
        )}

        {/* COMPANY HR VIEWS */}
        {currentUser && currentUser.role === 'HR' && (
          <HrEvaluationView currentUser={currentUser} onRefresh={handleRefresh} />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50/60 py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900">IRON</span>
            <span>·</span>
            <span>Integrated Recruitment Operations Navigator</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => handleNavigate('about')}
              className="hover:text-zinc-900 transition-colors"
            >
              System Architecture
            </button>
            <span>·</span>
            <button
              onClick={() => {
                if (window.confirm('Reset local storage demo state to initial seed data?')) {
                  ironStorage.init(true);
                  handleRefresh();
                  alert('Demo database reset to initial pristine state.');
                }
              }}
              className="text-zinc-400 hover:text-rose-600 transition-colors"
              title="Reset Demo Data"
            >
              Reset Seed Data
            </button>
          </div>
        </div>
      </footer>

      {/* Staff Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        drives={drives}
      />
    </div>
  );
}
