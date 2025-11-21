
import React, { useState, useEffect } from 'react';
import { Hexagon, Layers, GitBranch, HelpCircle, Globe, Zap } from 'lucide-react';
import LinearEditor from './components/LinearEditor';
import InfinityCanvas from './components/InfinityCanvas';
import { LanguageProvider, useLanguage } from './LanguageContext';

enum Mode {
  Linear = 'linear',
  Infinity = 'infinity'
}

import { AuthProvider, useAuth } from './contexts/AuthProvider';
import LoginPage from './pages/Auth/LoginPage';

import { BrowserRouter as Router, Routes, Route, useNavigate, Link, useSearchParams } from 'react-router-dom';
import ProfilePage from './pages/Profile/ProfilePage';
import GeminiPlayground from './pages/Dev/GeminiPlayground';
import { User } from 'lucide-react';
import { AgenticProvider } from './contexts/AgenticContext';
import AgenticOverlay from './components/AgenticOverlay';
import { quotaService } from './services/quotaService';

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'infinity' ? Mode.Infinity : Mode.Linear;

  const [mode, setMode] = useState<Mode>(initialMode);
  const [showInstructions, setShowInstructions] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const { user } = useAuth();
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);

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

    // Refresh quota every 10 seconds
    const interval = setInterval(loadQuota, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ru' : 'en');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col">

      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 flex items-center justify-between flex-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Hexagon fill="white" size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-white hidden sm:block">HOUZ.AI</h1>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setMode(Mode.Linear)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === Mode.Linear
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            <Layers size={16} />
            <span className="hidden sm:inline">{t('linearMode')}</span>
          </button>
          <button
            onClick={() => setMode(Mode.Infinity)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === Mode.Infinity
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            <GitBranch size={16} />
            <span className="hidden sm:inline">{t('infinityMode')}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Credits Indicator */}
          {quota && (
            <div className="hidden md:flex items-center gap-2 text-xs bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg">
              <Zap className={`${quota.limit - quota.used <= 5
                ? 'text-red-400'
                : quota.limit - quota.used <= 10
                  ? 'text-yellow-400'
                  : 'text-indigo-400'
                }`} size={14} />
              <span className="font-medium text-white">{quota.limit - quota.used}</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-400">{quota.limit}</span>
              <span className="text-slate-500">credits</span>
            </div>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 border border-slate-700 px-2 py-1 rounded uppercase"
          >
            <Globe size={14} /> {lang}
          </button>

          <Link to="/profile" className="text-slate-400 hover:text-white transition-colors" title="Profile">
            <User size={20} />
          </Link>

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className={`transition-colors ${showInstructions ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            title={showInstructions ? "Hide Instructions" : "Show Instructions"}
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </header>

      {/* Main Content - Keep both mounted to preserve state */}
      <main className="flex-1 relative overflow-hidden">
        <div className={`absolute inset-0 ${mode === Mode.Linear ? 'z-10 block' : 'z-0 hidden'}`}>
          <LinearEditor showInstructions={showInstructions} />
        </div>
        <div className={`absolute inset-0 ${mode === Mode.Infinity ? 'z-10 block' : 'z-0 hidden'}`}>
          <InfinityCanvas />
        </div>
      </main>
      <AgenticOverlay />
    </div>
  );

};

const AppContent: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/playground" element={<GeminiPlayground />} />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<div className="p-10 text-center">404 - Page Not Found</div>} />
      </Routes>
      <AgenticOverlay />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AgenticProvider>
          <AppContent />
        </AgenticProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
