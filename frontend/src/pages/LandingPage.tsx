import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Shield,
  Heart,
  ArrowRight,
  Headphones,
  MousePointerClick,
  CheckCircle2,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { useStore } from '../store';
import api from '../services/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const { setSession, setMode, setCompanySlug, setLanguage, language, theme, setTheme } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'counselor' | 'go' | null>(null);

  const handleStart = async () => {
    if (!selectedMode) return;

    setIsLoading(true);
    try {
      const session = await api.createSession(
        companySlug || 'acme',
        selectedMode,
        language,
        'open_enrollment'
      );
      setSession(session.id, session.session_token);
      setMode(selectedMode);
      setCompanySlug(companySlug || 'acme');
      navigate(`/${companySlug || 'acme'}/profile`);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Shield, text: 'Personalized plan matching', color: 'from-blue-400 to-cyan-400' },
    { icon: Heart, text: 'HSA tax savings calculator', color: 'from-pink-400 to-rose-400' },
    { icon: Zap, text: 'Instant cost comparisons', color: 'from-yellow-400 to-orange-400' },
    { icon: Sparkles, text: 'AI-powered guidance', color: 'from-purple-400 to-indigo-400' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="gradient-mesh" />

      {/* Floating Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TouchCare</span>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
          >
            <Globe className="w-5 h-5" />
            <span className="font-medium">{language === 'en' ? 'ES' : 'EN'}</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/10 backdrop-blur-sm border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white text-sm mb-6">
              <Sparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
              Open Enrollment 2025
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              Find Your
              <span className="block text-gradient">Perfect Health Plan</span>
            </h1>

            <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed mb-10 max-w-lg">
              Our intelligent system analyzes your healthcare needs, financial preferences,
              and risk tolerance to recommend the best plan for you and your family.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} bg-opacity-20 flex items-center justify-center`}>
                    <feature.icon className="w-5 h-5 text-slate-700 dark:text-white" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-200 text-sm font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Mode Selection */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="glass p-8 shadow-glass-lg">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Choose Your Experience</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">Select how you'd like to explore your options</p>

              {/* Mode Cards */}
              <div className="space-y-4 mb-8">
                {/* Counselor Mode */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMode('counselor')}
                  className={`w-full p-6 rounded-2xl text-left transition-all duration-300 ${selectedMode === 'counselor'
                      ? 'bg-gradient-to-r from-primary-500/10 to-primary-600/10 border-2 border-primary-500/50 shadow-glow'
                      : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedMode === 'counselor'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/60'
                      }`}>
                      <Headphones className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Guided Experience</h3>
                        {selectedMode === 'counselor' && (
                          <CheckCircle2 className="w-6 h-6 text-primary-500" />
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        Step-by-step audio guidance with detailed explanations.
                        Perfect if you're new to benefits enrollment.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                          ~10 min
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium">
                          Audio narration
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* Go Mode */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMode('go')}
                  className={`w-full p-6 rounded-2xl text-left transition-all duration-300 ${selectedMode === 'go'
                      ? 'bg-gradient-to-r from-accent-500/10 to-accent-600/10 border-2 border-accent-500/50 shadow-glow'
                      : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedMode === 'go'
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/60'
                      }`}>
                      <MousePointerClick className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Selection</h3>
                        {selectedMode === 'go' && (
                          <CheckCircle2 className="w-6 h-6 text-accent-500" />
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        Fast, self-directed flow for those who know what they need.
                        Get recommendations in minutes.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-medium">
                          ~5 min
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-medium">
                          Self-paced
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: selectedMode ? 1.02 : 1 }}
                whileTap={{ scale: selectedMode ? 0.98 : 1 }}
                onClick={handleStart}
                disabled={!selectedMode || isLoading}
                className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${selectedMode
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow hover:shadow-glow-lg cursor-pointer'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/40 cursor-not-allowed'
                  }`}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Begin Enrollment
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-4">
                Your progress is automatically saved
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Bottom Stats */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 max-w-4xl mx-auto px-6 pb-12"
      >
        <div className="glass p-6 flex flex-wrap justify-center gap-8 lg:gap-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">$2,400</div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">Avg. Annual Savings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">98%</div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">User Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">5 min</div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">Average Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">24/7</div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">AI Support</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
