import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { DocumentAssistant } from './components/DocumentAssistant';
import { FileOrganizer } from './components/FileOrganizer';
import { SettingsView } from './components/SettingsView';
import { fetchAIStatus } from './api';
import type { AIStatus } from './api';
import { ShieldCheck } from 'lucide-react';

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  const loadStatus = async () => {
    try {
      const status = await fetchAIStatus();
      setAiStatus(status);
    } catch {
      setAiStatus({
        ollama_available: false,
        ollama_host: 'http://localhost:11434',
        current_model: 'codellama:latest',
        model_available: false,
        available_models: [],
        models_details: [],
        message: 'Unable to reach backend or Ollama.',
      });
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-amber-400 selection:text-zinc-950">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        aiStatus={aiStatus}
      />

      {/* Main Body with AnimatePresence */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentTab === 'dashboard' && (
              <Dashboard onNavigate={setCurrentTab} aiStatus={aiStatus} />
            )}
            {currentTab === 'documents' && (
              <DocumentAssistant aiStatus={aiStatus} />
            )}
            {currentTab === 'organizer' && (
              <FileOrganizer />
            )}
            {currentTab === 'settings' && (
              <SettingsView aiStatus={aiStatus} onRefreshStatus={loadStatus} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-white/5 bg-[#090a0f]/80 py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 font-bold">Sloth.ai</span>
            <span>—</span>
            <span>Hacktoberfest 2026: “Slow and Steady” Open-Source AI Challenge</span>
          </div>

          <div className="flex items-center space-x-6">
            <a
              href="https://github.com/abhinavgautam08/Sloth.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-amber-300 transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>abhinavgautam08/Sloth.ai</span>
            </a>

            <div className="flex items-center space-x-1 text-zinc-600">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>Privacy Verified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
