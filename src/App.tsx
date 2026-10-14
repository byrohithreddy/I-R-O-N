import React, { useState, useEffect } from 'react';
import { Github, ExternalLink } from 'lucide-react';
import { User, Drive } from './types';
import { ironStorage } from './services/storage';
import { api } from './services/api';
import { Header } from './components/layout/Header';
import iconSrc from './icon.svg';
import { LoginModal } from './components/auth/LoginModal';
import { PublicHome } from './components/public/PublicHome';
import { AboutIron } from './components/public/AboutIron';
import { TpoDashboard } from './components/tpo/TpoDashboard';
import { TpoDrives } from './components/tpo/TpoDrives';
import { TpoStudentMaster } from './components/tpo/TpoStudentMaster';
import { TpoPlacedStudents } from './components/tpo/TpoPlacedStudents';
import { TpoDriveAnalytics } from './components/tpo/TpoDriveAnalytics';
import { TpoDataExpiry } from './components/tpo/TpoDataExpiry';
import { TpoSecurity } from './components/tpo/TpoSecurity';
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
    // Initial sync on mount
    ironStorage.syncWithBackend().catch(() => {});

    // Periodic background sync interval (25s) with conditional 304 ETag caching
    const syncInterval = setInterval(() => {
      ironStorage.syncWithBackend().catch(() => {});
    }, 25000);

    // Fast sync upon tab visibility or window focus
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        ironStorage.syncWithBackend().catch(() => {});
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // Subscribe to state updates when mutations occur
    const unsubscribe = ironStorage.subscribe(() => {
      setRefreshTick((prev) => prev + 1);
    });

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      unsubscribe();
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
    // M7 Fix: Purge session token and user identity completely
    api.auth.logout();
    setCurrentUser(null);
    sessionStorage.removeItem('iron_active_user');
    sessionStorage.removeItem('iron_auth_token');
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
    <div className="app-frame min-h-screen flex flex-col font-sans text-zinc-950">
      {/* Universal Top Bar */}
      <Header
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main
        className={`app-main flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${
          currentUser ? 'app-admin' : 'app-public'
        }`}
      >
        {/* ABOUT VIEW (Available to all users) */}
        {currentView === 'about' && <AboutIron />}

        {/* PUBLIC VIEWS */}
        {!currentUser && currentView !== 'about' && (
          <PublicHome
            onOpenLogin={() => setIsLoginOpen(true)}
            onRefresh={handleRefresh}
          />
        )}

        {/* TPO ADMIN VIEWS */}
        {currentUser && currentUser.role === 'TPO' && currentView !== 'about' && (
          <>
            {(currentView === 'tpo-dashboard' || currentView === 'tpo-home') && (
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
            {currentView === 'tpo-security' && (
              <TpoSecurity onLogout={handleLogout} />
            )}
          </>
        )}

        {/* COORDINATOR VIEWS */}
        {currentUser && currentUser.role === 'COORDINATOR' && currentView !== 'about' && (
          <CoordinatorView currentUser={currentUser} onRefresh={handleRefresh} refreshTick={refreshTick} />
        )}

        {/* COMPANY HR VIEWS */}
        {currentUser && currentUser.role === 'HR' && currentView !== 'about' && (
          <HrEvaluationView currentUser={currentUser} onRefresh={handleRefresh} refreshTick={refreshTick} />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="app-footer border-t border-zinc-200 bg-white py-6 text-xs text-zinc-500">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={iconSrc} alt="IRON Logo" className="h-4 w-4" />
            <span className="font-bold tracking-tight text-zinc-950">IRON</span>
            <span>·</span>
            <span>Integrated Recruitment Operations Navigator</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://github.com/byrohithreddy/I-R-O-N"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-zinc-700 hover:text-emerald-900 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>System Architecture</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
            <span>·</span>
            <button
              onClick={() => handleNavigate('about')}
              className="hover:text-zinc-900 transition-colors"
            >
              About IRON
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
