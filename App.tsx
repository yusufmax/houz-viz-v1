import React, { useState, useEffect } from 'react';
import { Hexagon, Layers, GitBranch, HelpCircle, Globe, Zap, Film, Settings, ShieldAlert, Clock, Sparkles } from 'lucide-react';
import LinearEditor from './components/LinearEditor';
import InfinityCanvas from './components/InfinityCanvas';
import VideoEditor from './components/VideoEditor';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { DesignModeProvider, useDesignMode } from './contexts/DesignModeContext';

enum Mode {
  Linear = 'linear',
  Infinity = 'infinity',
  Video = 'video'
}

import { AuthProvider, useAuth } from './contexts/AuthProvider';
import LoginPage from './pages/Auth/LoginPage';

import { BrowserRouter as Router, Routes, Route, useNavigate, Link, useSearchParams } from 'react-router-dom';
import ProfilePage from './pages/Profile/ProfilePage';
import GeminiPlayground from './pages/Dev/GeminiPlayground';
import AdminPage from './pages/Admin/AdminPage';
import SuperEditor from './components/SuperEditor';
import { User } from 'lucide-react';
import MagnificPage from './pages/MagnificPage';
import { AgenticProvider } from './contexts/AgenticContext';
import { quotaService } from './services/quotaService';
import CreditRequestModal from './components/CreditRequestModal';

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'infinity' ? Mode.Infinity : Mode.Linear;

  const [mode, setMode] = useState<Mode>(initialMode);
  const [showInstructions, setShowInstructions] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const { user, profile } = useAuth();
  const { uiStyle, setUiStyle, isApple } = useDesignMode();
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const isAdmin = profile?.is_admin || false;

  useEffect(() => {
    const handleAgentAction = (event: CustomEvent) => {
      const action = event.detail;
      if (action.type === 'SWITCH_MODE') {
        if (action.payload === 'infinity') setMode(Mode.Infinity);
        if (action.payload === 'linear') setMode(Mode.Linear);
      }
    };

    window.addEventListener('agent-action' as any, handleAgentAction as any);
    return () => {
      window.removeEventListener('agent-action' as any, handleAgentAction as any);
    };
  }, []);

  // Load quota
  useEffect(() => {
    const loadQuota = async () => {
      if (!user) return;
      try {
        const q = await quotaService.getUserQuota(user.id);
        if (q) {
          setQuota({ used: q.used, limit: q.quota });
        }
      } catch (error) {
        console.error('Error fetching quota:', error);
      }
    };
    loadQuota();

    const interval = setInterval(loadQuota, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const toggleLang = () => {
    if (lang === 'en') setLang('ru');
    else if (lang === 'ru') setLang('uz');
    else setLang('en');
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-500 ${isApple ? 'ui-apple apple-bg text-[#1d1d1f]' : 'bg-slate-950 text-slate-200'}`}>

      {/* Header */}
      <header className={isApple 
        ? "h-16 bg-white/80 backdrop-blur-2xl sticky top-0 z-40 px-6 flex items-center justify-between flex-none border-b border-black/[0.08] shadow-[0_2px_15px_rgba(0,0,0,0.04)] transition-all duration-300 relative text-[#1d1d1f]"
        : "h-16 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40 px-6 flex items-center justify-between flex-none border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.08] before:to-transparent before:pointer-events-none"
      }>
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 h-full cursor-pointer select-none active:scale-95 transition-all duration-200"
          onClick={() => window.location.href = '/'}
          title="Reload HOUZ.AI"
        >
          {isApple ? (
            <div className="h-8 w-8 overflow-hidden rounded-xl shrink-0 flex items-center justify-start">
              <img
                src="/logo.png"
                alt="HOUZ.AI Logo"
                className="h-8 w-auto max-w-none object-left object-cover"
              />
            </div>
          ) : (
            <img
              src="/logo.png"
              alt="HOUZ.AI Logo"
              className="h-8 w-auto object-contain transition-transform duration-300 brightness-110 contrast-125"
            />
          )}
          {isApple && <span className="font-extrabold text-lg tracking-tight text-slate-900">houz<span className="text-[#0071e3]">.ai</span></span>}
        </div>

        {/* Center Section: Mode Switcher & UI Style Switcher */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className={isApple 
            ? "flex apple-segmented-wrapper"
            : "flex bg-slate-950/80 backdrop-blur-md rounded-xl p-1.5 ring-1 ring-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none z-10"
          }>
            <button
              onClick={() => setMode(Mode.Linear)}
              className={isApple
                ? `flex items-center gap-2 px-3.5 py-1 text-xs font-medium apple-segmented-item active:scale-95 ${mode === Mode.Linear ? 'active' : 'text-slate-400 hover:text-white'}`
                : `flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 relative z-20 ${mode === Mode.Linear ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`
              }
            >
              <Layers size={isApple ? 14 : 16} />
              <span className="hidden sm:inline">{t('linearMode')}</span>
            </button>
            <button
              onClick={() => setMode(Mode.Infinity)}
              className={isApple
                ? `flex items-center gap-2 px-3.5 py-1 text-xs font-medium apple-segmented-item active:scale-95 ${mode === Mode.Infinity ? 'active' : 'text-slate-400 hover:text-white'}`
                : `flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 relative z-20 ${mode === Mode.Infinity ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`
              }
            >
              <GitBranch size={isApple ? 14 : 16} />
              <span className="hidden sm:inline">{t('infinityMode')}</span>
            </button>
            <button
              onClick={() => setMode(Mode.Video)}
              className={isApple
                ? `flex items-center gap-2 px-3.5 py-1 text-xs font-medium apple-segmented-item active:scale-95 ${mode === Mode.Video ? 'active' : 'text-slate-400 hover:text-white'}`
                : `flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 relative z-20 ${mode === Mode.Video ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`
              }
            >
              <Film size={isApple ? 14 : 16} />
              <span className="hidden sm:inline">Video</span>
            </button>
          </div>

          {/* UI Style Selector (Apple Design vs Classic Toggle) */}
          <div className="hidden sm:flex items-center apple-segmented-wrapper">
            <button
              onClick={() => setUiStyle('apple')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95 ${
                isApple
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)] border border-white/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Apple Design UI"
            >
              <span className="text-sm leading-none"></span>
              <span>Apple UI</span>
            </button>
            <button
              onClick={() => setUiStyle('classic')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95 ${
                !isApple
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Classic UI"
            >
              <span className="text-xs leading-none">❖</span>
              <span>Classic</span>
            </button>
          </div>
        </div>

        {/* Right Section Controls */}
        <div className="flex items-center gap-3">
          {/* Mobile UI Style Toggle */}
          <button
            onClick={() => setUiStyle(isApple ? 'classic' : 'apple')}
            className="sm:hidden p-2 rounded-full border border-white/10 bg-white/5 text-slate-300 active:scale-95"
            title="Toggle UI Style"
          >
            {isApple ? '' : '❖'}
          </button>

          {/* Credits Indicator */}
          {quota && (
            <div className={isApple 
              ? "hidden md:flex items-center gap-3 apple-glass px-3.5 py-1.5 rounded-full"
              : "hidden md:flex items-center gap-3 bg-slate-950/50 backdrop-blur-md border border-white/10 border-b-black/50 pl-4 pr-1.5 py-1.5 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_15px_rgba(0,0,0,0.3)] transition-shadow relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none z-10"
            }>
              <div className="flex flex-col gap-1 w-24">
                <div className="flex justify-between text-[8px] uppercase font-bold tracking-wider text-slate-400">
                  <span>Credits</span>
                  <span className={quota.limit - quota.used <= 5 ? 'text-rose-400' : 'text-blue-400'}>
                    {quota.limit - quota.used}
                  </span>
                </div>
                <div className="h-1.5 bg-black/40 shadow-inner rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${quota.limit - quota.used <= 5 ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, (quota.used / quota.limit) * 100))}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className={isApple
                  ? "apple-btn-primary px-3 py-1 text-[10px] uppercase font-bold tracking-wider"
                  : "px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-[10px] font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 tracking-wider ring-1 ring-white/10"
                }
              >
                REQUEST
              </button>
            </div>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className={isApple
              ? "apple-glass-interactive px-2.5 py-1 rounded-full text-xs font-semibold text-slate-200 flex items-center gap-1.5 uppercase"
              : "flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-all bg-slate-950/50 backdrop-blur-md border border-white/10 border-b-black/50 hover:bg-white/10 px-2.5 py-1.5 rounded-xl uppercase shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_10px_rgba(0,0,0,0.2)] relative overflow-hidden z-10"
            }
          >
            <Globe size={13} /> <span>{lang}</span>
          </button>

          <Link 
            to="/profile" 
            className={isApple 
              ? "p-2 rounded-full text-slate-300 hover:text-white apple-glass-interactive"
              : "p-2 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
            } 
            title="Profile"
          >
            <User size={17} />
          </Link>

          {isAdmin && (
            <Link 
              to="/admin" 
              className={isApple 
                ? "p-2 rounded-full text-slate-300 hover:text-white apple-glass-interactive"
                : "p-2 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
              } 
              title="Admin Panel"
            >
              <Settings size={17} />
            </Link>
          )}

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className={isApple
              ? `p-2 rounded-full transition-all active:scale-95 ${showInstructions ? 'bg-blue-600/30 text-blue-300 border border-blue-400/40' : 'text-slate-300 apple-glass-interactive'}`
              : `p-2 rounded-xl transition-all ${showInstructions ? 'text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/20' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/5'}`
            }
            title={showInstructions ? "Hide Instructions" : "Show Instructions"}
          >
            <HelpCircle size={17} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <div className={`absolute inset-0 ${mode === Mode.Linear ? 'z-10 block' : 'z-0 hidden'}`}>
          <LinearEditor showInstructions={showInstructions} />
        </div>
        <div className={`absolute inset-0 ${mode === Mode.Infinity ? 'z-10 block' : 'z-0 hidden'}`}>
          <InfinityCanvas />
        </div>
        <div className={`absolute inset-0 ${mode === Mode.Video ? 'z-10 block' : 'z-0 hidden'} overflow-y-auto`}>
          <VideoEditor />
        </div>
      </main>

      {user && (
        <CreditRequestModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          userId={user.id}
        />
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { session, loading, profile, signOut } = useAuth();

  useEffect(() => {
    if (!loading && session && (profile?.is_banned || profile?.is_rejected)) {
      const timer = setTimeout(async () => {
        await signOut();
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (!loading && session && profile === null) {
      signOut();
    }
  }, [profile, session, loading, signOut]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">Loading...</div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  if (profile?.is_banned || (profile && profile.is_rejected)) {
    const isRejected = profile.is_rejected && !profile.is_banned;
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-900 border border-red-500/30 p-12 rounded-3xl max-w-md shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="text-red-500" size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">
            {isRejected ? 'Approval Declined' : 'Access Restricted'}
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            {isRejected
              ? 'Your account was not approved by an administrator. If you believe this is a mistake, please contact support.'
              : 'Your account has been permanently restricted. You will be redirected to the login screen shortly.'}
          </p>
          <button
            onClick={() => {
              signOut();
              window.location.href = '/';
            }}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 shadow-red-900/20"
          >
            Sign Out Now
          </button>
        </div>
      </div>
    );
  }

  if (profile && !profile.is_approved) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-900 border border-indigo-500/30 p-12 rounded-3xl max-w-md shadow-2xl">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-indigo-500" size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Approval Pending</h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Welcome to HOUZ.AI! Your account is currently pending administrator approval.
            Once approved, you will receive 200 credits to start your first project.
          </p>
          <div className="space-y-4">
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs text-slate-500 text-left">
              <strong>Why this?</strong> To ensure the best experience and prevent abuse, we manually review new registrations. This usually takes just a few minutes.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/playground" element={<GeminiPlayground />} />
        <Route path="/super" element={<SuperEditor />} />
        <Route path="/magnific" element={<MagnificPage />} />
        <Route path="/editor" element={<Home />} />
        <Route path="/" element={<ProfilePage />} />
        <Route path="*" element={<div className="p-10 text-center">404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <DesignModeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </DesignModeProvider>
  );
};

export default App;
