import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Download,
  Shield,
  Heart,
  DollarSign,
  Calendar,
  Users,
  FileText,
  ArrowLeft,
  Sparkles,
  Zap,
  Calculator,
  ChevronDown,
  ChevronUp,
  PartyPopper
} from 'lucide-react';
import { useStore } from '../store';
import api from '../services/api';

export default function Review() {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const {
    profile,
    bundles,
    selectedBundleId,
    sessionId,
    reset,
  } = useStore();

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hsaContribution, setHsaContribution] = useState(3000);
  const [showVoluntary, setShowVoluntary] = useState(false);

  const recommendations = bundles ? Object.values(bundles.bundles) : [];
  const selectedPlan = recommendations.find(r => r.id === selectedBundleId);

  if (!selectedPlan) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="gradient-mesh" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">No plan selected</h2>
          <button
            onClick={() => navigate(`/${companySlug}/recommendations`)}
            className="btn-secondary"
          >
            Go back to recommendations
          </button>
        </div>
      </div>
    );
  }

  const calculateTaxSavings = (contribution: number) => {
    const taxRates: Record<string, number> = {
      'under_50k': 0.12,
      '50k_75k': 0.22,
      '75k_100k': 0.22,
      '100k_150k': 0.24,
      '150k_200k': 0.32,
      'over_200k': 0.35,
    };
    const rate = taxRates[profile.householdIncome || 'under_50k'] || 0.22;
    return Math.round(contribution * rate);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const blob = await api.exportPdf(sessionId!, {
        includeComparison: true,
        includeGapAnalysis: true,
        includeHsaProjection: selectedPlan.plan.hsa_eligible,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'benefits-summary.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      await api.createEnrollment({
        sessionId,
        planId: selectedPlan.plan.id,
        enrollmentType: 'open_enrollment',
        coverageType: profile.coverageType,
        dependents: profile.dependents || [],
        hsaContributionAnnual: selectedPlan.plan.hsa_eligible ? hsaContribution : undefined,
      });
      await api.trackEvent('enrollment_completed', { planId: selectedPlan.plan.id });
      setIsComplete(true);
    } catch (err) {
      console.error('Enrollment failed:', err);
    } finally {
      setIsEnrolling(false);
    }
  };

  const monthlyPremium = Math.round(selectedPlan.costBreakdown.premium / 12);
  const employerHsa = selectedPlan.plan.hsa_employer_contribution?.individual || 0;
  const taxSavings = selectedPlan.plan.hsa_eligible ? calculateTaxSavings(hsaContribution) : 0;

  const isBestFit = bundles && bundles.bundles[bundles.bestFitBundle]?.id === selectedPlan.id;

  if (isComplete) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="gradient-mesh" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8"
          >
            <PartyPopper className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-slate-900 dark:text-white mb-4 text-center"
          >
            You're All Set!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-600 dark:text-white/70 text-center max-w-md mb-8"
          >
            Your enrollment in <span className="text-slate-900 dark:text-white font-semibold">{selectedPlan.plan.name}</span> has been submitted.
            You'll receive a confirmation email shortly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass p-6 w-full max-w-md"
          >
            <h3 className="font-semibold text-white mb-4">What's Next</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <span>Confirmation email will arrive within 24 hours</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                <span>Your new coverage begins January 1, 2025</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <span>ID cards will be mailed within 2 weeks</span>
              </li>
              {selectedPlan.plan.hsa_eligible && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <span>HSA account will be set up automatically</span>
                </li>
              )}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex gap-4 mt-8"
          >
            <button
              onClick={handleDownloadPdf}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Summary
            </button>
            <button
              onClick={() => {
                reset();
                navigate('/');
              }}
              className="btn-ghost"
            >
              Return Home
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-32">
      {/* Background */}
      <div className="gradient-mesh" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Header */}
      <header className="relative z-10 pt-8 pb-6 px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(`/${companySlug}/recommendations`)}
            className="btn-ghost flex items-center gap-2 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Plans
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Review Your Selection</h1>
            <p className="text-slate-600 dark:text-white/60">Confirm your choices before enrollment</p>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 space-y-6">
        {/* Selected Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedPlan.plan.name}</h2>
                  {isBestFit && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-amber-500 text-black">
                      Best Fit
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-slate-600 dark:text-white/60">
                  <span>{selectedPlan.plan.type}</span>
                  <span>•</span>
                  <span>{selectedPlan.plan.network}</span>
                  {selectedPlan.plan.hsa_eligible && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Zap className="w-3 h-3" />
                        HSA Eligible
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500 dark:text-white/50">Monthly Premium</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">${monthlyPremium}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass p-4 text-center">
                <Shield className="w-5 h-5 mx-auto mb-2 text-indigo-500 dark:text-indigo-400" />
                <div className="text-xs text-slate-500 dark:text-white/50 mb-1">Deductible</div>
                <div className="font-bold text-slate-900 dark:text-white">${selectedPlan.plan.deductibles?.individual?.toLocaleString()}</div>
              </div>
              <div className="glass p-4 text-center">
                <Heart className="w-5 h-5 mx-auto mb-2 text-pink-500 dark:text-pink-400" />
                <div className="text-xs text-slate-500 dark:text-white/50 mb-1">Out-of-Pocket Max</div>
                <div className="font-bold text-slate-900 dark:text-white">${selectedPlan.plan.oop_max?.individual?.toLocaleString()}</div>
              </div>
              <div className="glass p-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-2 text-cyan-500 dark:text-cyan-400" />
                <div className="text-xs text-slate-500 dark:text-white/50 mb-1">Coverage Type</div>
                <div className="font-bold text-slate-900 dark:text-white capitalize">{profile.coverageType?.replace('_', ' ')}</div>
              </div>
              <div className="glass p-4 text-center">
                <Calendar className="w-5 h-5 mx-auto mb-2 text-amber-500 dark:text-amber-400" />
                <div className="text-xs text-slate-500 dark:text-white/50 mb-1">Effective Date</div>
                <div className="font-bold text-slate-900 dark:text-white">Jan 1, 2025</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* HSA Election (if eligible) */}
        {selectedPlan.plan.hsa_eligible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">HSA Contribution Election</h3>
                <p className="text-sm text-slate-600 dark:text-white/60">Set your annual pre-tax contribution</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm text-slate-600 dark:text-white/70 mb-3">
                <span>Annual Contribution</span>
                <span className="text-slate-900 dark:text-white font-bold text-xl">${hsaContribution.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max="8300"
                step="100"
                value={hsaContribution}
                onChange={(e) => setHsaContribution(parseInt(e.target.value))}
                className="slider-glass w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-white/50 mt-2">
                <span>$0</span>
                <span>$8,300 max (family)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Employer Adds</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">${employerHsa}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Your Tax Savings</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">${taxSavings.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Total Annual Value</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">${(employerHsa + taxSavings).toLocaleString()}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Voluntary Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass"
        >
          <button
            onClick={() => setShowVoluntary(!showVoluntary)}
            className="w-full p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-white">Additional Coverage Options</h3>
                <p className="text-sm text-slate-600 dark:text-white/60">Accident, critical illness, and supplemental life</p>
              </div>
            </div>
            {showVoluntary ? (
              <ChevronUp className="w-5 h-5 text-slate-400 dark:text-white/60" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400 dark:text-white/60" />
            )}
          </button>

          <AnimatePresence>
            {showVoluntary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-3">
                  {[
                    { name: 'Accident Insurance', price: '$15/mo', desc: 'Coverage for accidents and injuries' },
                    { name: 'Critical Illness', price: '$25/mo', desc: 'Lump sum payment for serious diagnoses' },
                    { name: 'Supplemental Life', price: '$10/mo', desc: 'Additional life insurance coverage' },
                  ].map((benefit) => (
                    <div key={benefit.name} className="glass p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white">{benefit.name}</h4>
                        <p className="text-sm text-slate-600 dark:text-white/50">{benefit.desc}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-700 dark:text-white/70">{benefit.price}</span>
                        <button className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Cost Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6"
        >
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            Cost Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-white/70">Monthly Premium</span>
              <span className="text-slate-900 dark:text-white">${monthlyPremium}/mo</span>
            </div>
            {selectedPlan.plan.hsa_eligible && hsaContribution > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-white/70">HSA Contribution</span>
                <span className="text-slate-900 dark:text-white">${Math.round(hsaContribution / 12)}/mo</span>
              </div>
            )}
            <div className="border-t border-slate-200 dark:border-white/10 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-900 dark:text-white font-semibold">Total Monthly Deduction</span>
                <span className="text-xl font-bold text-gradient">
                  ${monthlyPremium + (selectedPlan.plan.hsa_eligible ? Math.round(hsaContribution / 12) : 0)}/mo
                </span>
              </div>
            </div>
            {selectedPlan.plan.hsa_eligible && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">After tax savings</span>
                <span className="text-green-600 dark:text-green-400">
                  ~${monthlyPremium + Math.round(hsaContribution / 12) - Math.round(taxSavings / 12)}/mo effective
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 py-4 z-20">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="btn-ghost flex items-center gap-2"
          >
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            Download Summary
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="btn-primary flex items-center gap-2"
          >
            {isEnrolling ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enrolling...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Complete Enrollment
              </>
            )}
          </motion.button>
        </div>
      </footer>
    </div>
  );
}
