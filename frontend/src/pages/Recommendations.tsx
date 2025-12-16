import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown,
  Shield,
  ArrowRight,
  Sparkles,
  Check,
  PiggyBank,
  Umbrella,
  Wallet,
  Leaf
} from 'lucide-react';
import { useStore } from '../store';
import api from '../services/api';

export default function Recommendations() {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const {
    profile,
    bundles,
    setBundles,
    selectedBundleId,
    selectBundle,
    sessionId,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBundles = async () => {
      setIsLoading(true);
      try {
        const data = await api.getRecommendations(profile);
        setBundles(data);

        // Auto-select the best fit if nothing selected
        if (data.bestFitBundle && !selectedBundleId) {
          const bestBundle = data.bundles[data.bestFitBundle];
          if (bestBundle) {
            selectBundle(bestBundle.id);
          }
        }
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBundles();
  }, [profile, setBundles, selectBundle, selectedBundleId]);

  const handleSelectBundle = async (bundleId: string) => {
    selectBundle(bundleId);
    if (sessionId) {
      // In a real app, we'd map bundle ID to plan ID + account choice
      // For now just tracking the selection
      await api.trackEvent('bundle_selected', { bundleId });
    }
  };

  const handleContinue = () => {
    if (selectedBundleId) {
      navigate(`/${companySlug}/review`);
    }
  };

  const getBundleIcon = (type: string) => {
    switch (type) {
      case 'futureBuilder': return PiggyBank;
      case 'safetyNet': return Umbrella;
      case 'leanAndMean': return Wallet;
      case 'peaceOfMind': return Leaf;
      default: return Shield;
    }
  };

  const getBundleGradient = (type: string) => {
    switch (type) {
      case 'futureBuilder': return 'from-emerald-500 to-teal-600';
      case 'safetyNet': return 'from-blue-500 to-indigo-600';
      case 'leanAndMean': return 'from-amber-500 to-orange-600';
      case 'peaceOfMind': return 'from-purple-500 to-pink-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="gradient-mesh" />
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Designing Your Strategy</h2>
          <p className="text-slate-600 dark:text-white/60">Finding the perfect balance of coverage and savings...</p>
        </div>
      </div>
    );
  }

  if (!bundles) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="gradient-mesh" />
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Unable to Load Recommendations</h2>
          <p className="text-slate-600 dark:text-white/60 mb-6">
            We encountered an issue while generating your personalized strategy. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-3 w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const bundleKeys = ['futureBuilder', 'safetyNet', 'leanAndMean', 'peaceOfMind'] as const;

  return (
    <div className="min-h-screen relative overflow-hidden pb-32">
      {/* Background */}
      <div className="gradient-mesh" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Header */}
      <header className="relative z-10 pt-12 pb-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            We found the best path for your lifestyle
          </h1>
          <p className="text-xl text-slate-600 dark:text-white/70">
            Based on your financial health and risk tolerance, we recommend the{' '}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {bundles.bundles[bundles.bestFitBundle]?.title}
            </span>{' '}
            strategy.
          </p>
        </motion.div>
      </header>

      {/* Bundles Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {bundleKeys.map((key, index) => {
            const bundle = bundles.bundles[key];
            if (!bundle) return null;

            const isBestFit = bundles.bestFitBundle === key;
            const isSelected = selectedBundleId === bundle.id;
            const Icon = getBundleIcon(key);
            const gradient = getBundleGradient(key);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSelectBundle(bundle.id)}
                className={`relative group cursor-pointer transition-all duration-300 ${isSelected ? 'scale-105 z-10' : 'hover:scale-[1.02]'
                  }`}
              >
                {/* Best Fit Badge */}
                {isBestFit && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      BEST FIT
                    </div>
                  </div>
                )}

                <div className={`h-full glass overflow-hidden border-2 transition-colors ${isSelected
                  ? 'border-indigo-500 dark:border-indigo-400 shadow-xl shadow-indigo-500/20'
                  : 'border-transparent hover:border-white/20'
                  }`}>
                  {/* Card Header */}
                  <div className={`p-6 bg-gradient-to-br ${gradient} text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Icon className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-1">{bundle.title}</h3>
                      <p className="text-white/80 text-sm h-10 line-clamp-2">{bundle.description}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-6">
                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/50 mb-1">Monthly Cost</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          ${Math.round(bundle.costBreakdown.premium / 12)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/50 mb-1">Net Annual</div>
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          ${Math.round(bundle.costBreakdown.netCost).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Plan & Account */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-white/60">Plan</span>
                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                          {bundle.plan.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-white/60">Account</span>
                        <span className={`font-medium ${bundle.accountType === 'HSA' ? 'text-emerald-500' :
                          bundle.accountType === 'FSA' ? 'text-blue-500' :
                            'text-slate-400'
                          }`}>
                          {bundle.accountType === 'None' ? 'No Account' : bundle.accountType}
                        </span>
                      </div>
                      {bundle.contribution > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-white/60">Contribution</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            ${bundle.contribution.toLocaleString()}/yr
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reasons */}
                    <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-white/10">
                      {bundle.reasons.slice(0, 3).map((reason, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-white/70">
                          <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Select Button */}
                    <button className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20'
                      }`}>
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4" />
                          Selected
                        </>
                      ) : (
                        'Select Strategy'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 py-6 z-30">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="hidden md:block">
            <div className="text-sm text-slate-500 dark:text-white/50">Selected Strategy</div>
            <div className="font-bold text-slate-900 dark:text-white text-lg">
              {bundles.bundles[Object.keys(bundles.bundles).find(k => bundles.bundles[k as keyof typeof bundles.bundles]?.id === selectedBundleId) as keyof typeof bundles.bundles]?.title || 'None Selected'}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: selectedBundleId ? 1.02 : 1 }}
            whileTap={{ scale: selectedBundleId ? 0.98 : 1 }}
            onClick={handleContinue}
            disabled={!selectedBundleId}
            className={`btn-primary px-8 py-4 text-lg flex items-center gap-3 ${!selectedBundleId ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            Continue to Review
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </footer>
    </div>
  );
}
