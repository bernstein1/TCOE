import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Baby,
  Heart,
  Stethoscope,
  AlertCircle,
  Pill,
  Search,
  X,
  DollarSign,
  Shield,
  TrendingUp,
  Calculator,
  Sparkles,
  Activity,
  Calendar,
  Wallet
} from 'lucide-react';
import { useStore } from '../store';
import api from '../services/api';
import AudioPlayer from '../components/AudioPlayer';

export default function ProfileBuilder() {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const { t } = useTranslation();
  const {
    currentStep,
    nextStep,
    prevStep,
    profile,
    updateProfile,
    sessionId,
    mode,
  } = useStore();

  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [plannedCareSelections, setPlannedCareSelections] = useState<string[]>(
    profile.plannedProcedures || []
  );

  const steps = useMemo(() => [
    {
      id: 'coverage',
      title: t('stepCoverageTitle'),
      subtitle: t('stepCoverageSubtitle'),
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'health_status',
      title: t('stepHealthTitle'),
      subtitle: t('stepHealthSubtitle'),
      icon: Activity,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      id: 'doctor_visits',
      title: t('stepDoctorTitle'),
      subtitle: t('stepDoctorSubtitle'),
      icon: Stethoscope,
      gradient: 'from-purple-500 to-indigo-500',
    },
    {
      id: 'planned_care',
      title: t('stepPlannedTitle'),
      subtitle: t('stepPlannedSubtitle'),
      icon: Calendar,
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      id: 'prescriptions',
      title: t('stepRxTitle'),
      subtitle: t('stepRxSubtitle'),
      icon: Pill,
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      id: 'liquidity_check',
      title: 'Emergency Cash',
      subtitle: 'Can you handle a surprise bill?',
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      id: 'complexity_tolerance',
      title: 'Savings Preference',
      subtitle: 'Do you want to manage a tax-free account?',
      icon: Wallet,
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'financial_mindset',
      title: t('stepMindsetTitle'),
      subtitle: t('stepMindsetSubtitle'),
      icon: TrendingUp,
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      id: 'emergency_buffer',
      title: t('stepBufferTitle'),
      subtitle: t('stepBufferSubtitle'),
      icon: Shield,
      gradient: 'from-red-500 to-pink-500',
    },
    {
      id: 'income',
      title: t('stepIncomeTitle'),
      subtitle: t('stepIncomeSubtitle'),
      icon: Wallet,
      gradient: 'from-teal-500 to-cyan-500',
    },
  ], [t]);

  const coverageOptions = useMemo(() => [
    {
      value: 'employee',
      icon: User,
      label: t('covEmpLabel'),
      description: t('covEmpDesc'),
      algorithmNote: t('covEmpNote')
    },
    {
      value: 'employee_spouse',
      icon: Users,
      label: t('covSpouseLabel'),
      description: t('covSpouseDesc'),
      algorithmNote: t('covSpouseNote')
    },
    {
      value: 'employee_children',
      icon: Baby,
      label: t('covChildLabel'),
      description: t('covChildDesc'),
      algorithmNote: t('covChildNote')
    },
    {
      value: 'family',
      icon: Heart,
      label: t('covFamLabel'),
      description: t('covFamDesc'),
      algorithmNote: t('covFamNote')
    },
  ], [t]);

  const healthStatusOptions = useMemo(() => [
    {
      value: 'excellent',
      label: t('healthExcLabel'),
      description: t('healthExcDesc'),
      icon: '💪',
      algorithmImpact: t('healthExcImpact')
    },
    {
      value: 'good',
      label: t('healthGoodLabel'),
      description: t('healthGoodDesc'),
      icon: '👍',
      algorithmImpact: t('healthGoodImpact')
    },
    {
      value: 'fair',
      label: t('healthFairLabel'),
      description: t('healthFairDesc'),
      icon: '⚖️',
      algorithmImpact: t('healthFairImpact')
    },
    {
      value: 'managing_conditions',
      label: t('healthCondLabel'),
      description: t('healthCondDesc'),
      icon: '🏥',
      algorithmImpact: t('healthCondImpact')
    },
  ], [t]);

  const doctorVisitOptions = useMemo(() => [
    {
      value: 'rarely',
      label: t('visitRareLabel'),
      detail: t('visitRareDetail'),
      pcpCost: '$0-30',
      algorithmWeight: 0.2
    },
    {
      value: 'occasionally',
      label: t('visitOccLabel'),
      detail: t('visitOccDetail'),
      pcpCost: '$50-120',
      algorithmWeight: 0.5
    },
    {
      value: 'regularly',
      label: t('visitRegLabel'),
      detail: t('visitRegDetail'),
      pcpCost: '$150-240',
      algorithmWeight: 0.8
    },
    {
      value: 'frequently',
      label: t('visitFreqLabel'),
      detail: t('visitFreqDetail'),
      pcpCost: '$270+',
      algorithmWeight: 1.0
    },
  ], [t]);

  const plannedCareOptions = useMemo(() => [
    { value: 'none', label: t('careNoneLabel'), icon: '✓', costImpact: 'Low' },
    { value: 'pregnancy', label: t('carePregLabel'), icon: '👶', costImpact: '$5,000-15,000' },
    { value: 'surgery', label: t('careSurgLabel'), icon: '🏥', costImpact: '$2,000-20,000+' },
    { value: 'therapy', label: t('careTherapyLabel'), icon: '🧠', costImpact: '$1,000-5,000' },
    { value: 'imaging', label: t('careImgLabel'), icon: '📷', costImpact: '$500-3,000' },
    { value: 'specialist', label: t('careSpecLabel'), icon: '👨‍⚕️', costImpact: '$1,000-8,000' },
  ], [t]);

  const financialMindsetOptions = useMemo(() => [
    {
      value: 'predictable',
      title: t('mindsetPredTitle'),
      description: t('mindsetPredDesc'),
      icon: Shield,
      gradient: 'from-blue-500 to-indigo-500',
      recommendation: t('mindsetPredRec'),
      traits: [t('traitFixedCopays'), t('traitLowerDed'), t('traitHigherPrem')]
    },
    {
      value: 'balanced',
      title: t('mindsetBalTitle'),
      description: t('mindsetBalDesc'),
      icon: TrendingUp,
      gradient: 'from-purple-500 to-pink-500',
      recommendation: t('mindsetBalRec'),
      traits: [t('traitModPrem'), t('traitCostShare'), t('traitGoodCov')]
    },
    {
      value: 'saver',
      title: t('mindsetSaveTitle'),
      description: t('mindsetSaveDesc'),
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-500',
      recommendation: t('mindsetSaveRec'),
      traits: [t('traitLowPrem'), t('traitHsaBen'), t('traitHighDed')]
    },
  ], [t]);

  const incomeOptions = useMemo(() => [
    { value: 'under_50k', label: t('incUnder50'), taxBracket: '12%', hsaSavings: '$500-600' },
    { value: '50k_75k', label: t('inc50to75'), taxBracket: '22%', hsaSavings: '$900-1,100' },
    { value: '75k_100k', label: t('inc75to100'), taxBracket: '22%', hsaSavings: '$900-1,100' },
    { value: '100k_150k', label: t('inc100to150'), taxBracket: '24%', hsaSavings: '$1,000-1,200' },
    { value: '150k_200k', label: t('inc150to200'), taxBracket: '32%', hsaSavings: '$1,300-1,600' },
    { value: 'over_200k', label: t('incOver200'), taxBracket: '35%+', hsaSavings: '$1,500-1,800' },
  ], [t]);

  const stepIndex = Math.max(0, currentStep - 1);
  const currentStepConfig = steps[stepIndex] || steps[0];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  // Prescription search
  const searchPrescriptions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchPrescriptions(query);
      setSearchResults(results.slice(0, 8));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPrescriptions(prescriptionSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [prescriptionSearch, searchPrescriptions]);

  const canProceed = (currentProfile = profile) => {
    switch (currentStepConfig.id) {
      case 'coverage': return !!currentProfile.coverageType;
      case 'health_status': return !!currentProfile.healthStatus;
      case 'doctor_visits': return !!currentProfile.pcpVisits;
      case 'liquidity_check': return currentProfile.liquidityCheck !== undefined;
      case 'complexity_tolerance': return currentProfile.complexityTolerance !== undefined;
      case 'financial_mindset': return !!currentProfile.riskTolerance;
      case 'emergency_buffer': return currentProfile.maxSurpriseBill !== undefined;
      case 'income': return !!currentProfile.householdIncome;
      default: return true;
    }
  };

  const handleNext = async () => {
    // Check against the latest state from the store to avoid stale closures
    const latestProfile = useStore.getState().profile;
    if (!canProceed(latestProfile)) return;

    try {
      if (sessionId) {
        // Optimistic update - don't await
        api.updateSession(sessionId, {
          currentStep: currentStep + 1,
          profileData: latestProfile,
        }).catch(err => console.error('Failed to save progress:', err));

        api.trackEvent('profile_step_completed', { step: currentStepConfig.id })
          .catch(err => console.error('Failed to track event:', err));
      }
    } catch (err) {
      console.error('Error initiating save:', err);
    }

    if (stepIndex >= steps.length - 1) {
      navigate(`/${companySlug}/recommendations`);
    } else {
      nextStep();
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      navigate(`/${companySlug}`);
    } else {
      prevStep();
    }
  };

  const togglePlannedCare = (value: string) => {
    const newSelections = plannedCareSelections.includes(value)
      ? plannedCareSelections.filter(v => v !== value)
      : [...plannedCareSelections, value];
    setPlannedCareSelections(newSelections);
    updateProfile({ plannedProcedures: newSelections });
  };

  const addPrescription = (drug: any) => {
    const current = profile.prescriptions || [];
    if (!current.find((p) => p.id === drug.id)) {
      updateProfile({
        prescriptions: [...current, { id: drug.id, name: drug.name, quantity: 1 }],
      });
    }
    setPrescriptionSearch('');
    setSearchResults([]);
  };

  const removePrescription = (id: string) => {
    updateProfile({
      prescriptions: (profile.prescriptions || []).filter((p) => p.id !== id),
    });
  };

  const StepIcon = currentStepConfig.icon;

  const renderStep = () => {
    switch (currentStepConfig.id) {
      case 'coverage':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coverageOptions.map((option, index) => {
                const Icon = option.icon;
                const isSelected = profile.coverageType === option.value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => updateProfile({ coverageType: option.value as any })}
                    className={`selection-card p-6 text-left ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSelected
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white'
                        }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{option.label}</h3>
                        <p className="text-slate-600 dark:text-white/60 text-sm mb-2">{option.description}</p>
                        <div className="flex items-center gap-2">
                          <Calculator className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                          <span className="text-xs text-indigo-500 dark:text-indigo-400">{option.algorithmNote}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 'health_status':
        return (
          <div className="space-y-4">
            {healthStatusOptions.map((option, index) => {
              const isSelected = profile.healthStatus === option.value;
              return (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => updateProfile({ healthStatus: option.value as any })}
                  className={`selection-card w-full p-5 text-left ${isSelected ? 'selected' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{option.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{option.label}</h3>
                      <p className="text-slate-600 dark:text-white/60 text-sm">{option.description}</p>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-3 py-1 rounded-lg bg-indigo-500/30 text-indigo-300 text-xs"
                      >
                        {option.algorithmImpact}
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        );

      case 'doctor_visits':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {doctorVisitOptions.map((option, index) => {
                const isSelected = profile.pcpVisits === option.value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => updateProfile({ pcpVisits: option.value as any })}
                    className={`selection-card p-5 text-center ${isSelected ? 'selected' : ''}`}
                  >
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{option.label}</h3>
                    <p className="text-slate-500 dark:text-white/50 text-sm mb-3">{option.detail}</p>
                    <div className="text-xs text-indigo-500 dark:text-indigo-400">
                      Est. copay costs: {option.pcpCost}/yr
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="glass p-4 mt-6"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-white/70">
                  <strong className="text-slate-900 dark:text-white">Why this matters:</strong> If you visit doctors frequently,
                  plans with fixed copays ($25-50 per visit) often beat high-deductible plans where
                  you pay full cost until meeting your deductible.
                </div>
              </div>
            </motion.div>
          </div>
        );

      case 'planned_care':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {plannedCareOptions.map((option, index) => {
                const isSelected = plannedCareSelections.includes(option.value);
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => togglePlannedCare(option.value)}
                    className={`selection-card p-4 text-center ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="text-2xl mb-2 block">{option.icon}</span>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">{option.label}</h4>
                    <span className={`text-xs ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-white/40'}`}>
                      {option.costImpact}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {plannedCareSelections.length > 0 && plannedCareSelections[0] !== 'none' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="glass p-4 border-l-4 border-amber-500"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-white/80">
                    <strong className="text-amber-600 dark:text-amber-400">Cost Alert:</strong> With planned procedures,
                    you'll likely hit your deductible. A plan with a{' '}
                    <span className="text-slate-900 dark:text-white">lower deductible</span> may save you money
                    even with higher premiums.
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 'prescriptions':
        return (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/40" />
              <input
                type="text"
                value={prescriptionSearch}
                onChange={(e) => setPrescriptionSearch(e.target.value)}
                placeholder="Search medications (e.g., Lipitor, Metformin)..."
                className="input-glass pl-12 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass divide-y divide-white/10 max-h-64 overflow-y-auto"
              >
                {searchResults.map((drug) => (
                  <button
                    key={drug.id}
                    onClick={() => addPrescription(drug)}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{drug.name}</div>
                      {drug.genericName && (
                        <div className="text-sm text-slate-500 dark:text-white/50">{drug.genericName}</div>
                      )}
                    </div>
                    <span className={`badge ${drug.tier === 'generic' ? 'badge-best' :
                      drug.tier === 'preferred' ? 'badge-good' : 'badge-neutral'
                      }`}>
                      {drug.tier || 'Tier 2'}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Selected Prescriptions */}
            <div className="space-y-2">
              <AnimatePresence>
                {(profile.prescriptions || []).map((rx) => (
                  <motion.div
                    key={rx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between px-4 py-3 glass"
                  >
                    <div className="flex items-center gap-3">
                      <Pill className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      <span className="font-medium text-slate-900 dark:text-white">{rx.name}</span>
                    </div>
                    <button
                      onClick={() => removePrescription(rx.id)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400 dark:text-white/60" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(profile.prescriptions || []).length === 0 && (
                <div className="text-center py-8 text-slate-400 dark:text-white/40">
                  <Pill className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No medications added yet</p>
                  <p className="text-sm mt-1">Search above or skip if you don't take any</p>
                </div>
              )}
            </div>

            <div className="glass p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-white/70">
                  <strong className="text-slate-900 dark:text-white">Drug costs vary 5x between plans.</strong> Generic tier
                  drugs might be $5 on one plan and $25 on another. We'll factor this into your recommendation.
                </div>
              </div>
            </div>
          </div>
        );

      case 'liquidity_check':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                If you had a $500 medical bill today, could you pay it comfortably?
              </h3>
              <p className="text-slate-500 dark:text-white/60">
                This helps us decide if you need a plan with lower upfront costs.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => updateProfile({ liquidityCheck: true })}
                className={`selection-card p-6 text-center ${profile.liquidityCheck === true ? 'selected' : ''}`}
              >
                <div className="text-4xl mb-3">👍</div>
                <div className="font-semibold text-slate-900 dark:text-white">Yes, no problem</div>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => updateProfile({ liquidityCheck: false })}
                className={`selection-card p-6 text-center ${profile.liquidityCheck === false ? 'selected' : ''}`}
              >
                <div className="text-4xl mb-3">👎</div>
                <div className="font-semibold text-slate-900 dark:text-white">No, that would be tight</div>
              </motion.button>
            </div>
          </div>
        );

      case 'complexity_tolerance':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Do you want to manage a tax-free savings account?
              </h3>
              <p className="text-slate-500 dark:text-white/60">
                HSA/FSA accounts save money but require some management.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => updateProfile({ complexityTolerance: true })}
                className={`selection-card p-6 text-center ${profile.complexityTolerance === true ? 'selected' : ''}`}
              >
                <div className="text-4xl mb-3">📈</div>
                <div className="font-semibold text-slate-900 dark:text-white">Yes, I want tax savings</div>
                <div className="text-sm text-slate-500 dark:text-white/50 mt-1">I'm okay with some paperwork</div>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => updateProfile({ complexityTolerance: false })}
                className={`selection-card p-6 text-center ${profile.complexityTolerance === false ? 'selected' : ''}`}
              >
                <div className="text-4xl mb-3">🧘</div>
                <div className="font-semibold text-slate-900 dark:text-white">No, keep it simple</div>
                <div className="text-sm text-slate-500 dark:text-white/50 mt-1">I prefer simplicity over optimization</div>
              </motion.button>
            </div>
          </div>
        );

      case 'financial_mindset':
        return (
          <div className="space-y-4">
            {financialMindsetOptions.map((option, index) => {
              const Icon = option.icon;
              const isSelected = profile.riskTolerance === option.value;
              return (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                  onClick={() => updateProfile({ riskTolerance: option.value as any })}
                  className={`selection-card w-full p-6 text-left ${isSelected ? 'selected' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{option.title}</h3>
                      <p className="text-slate-600 dark:text-white/60 text-sm mb-3">{option.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {option.traits.map((trait) => (
                          <span key={trait} className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 text-xs">
                            {trait}
                          </span>
                        ))}
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-300"
                        >
                          <Sparkles className="w-4 h-4" />
                          Recommended: {option.recommendation}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        );

      case 'emergency_buffer':
        const currentBuffer = profile.maxSurpriseBill || 2000;
        return (
          <div className="space-y-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="text-6xl font-bold text-gradient mb-2">
                ${currentBuffer.toLocaleString()}
              </div>
              <p className="text-slate-500 dark:text-white/50">Maximum unexpected bill you can handle</p>
            </motion.div>

            <div className="px-4">
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={currentBuffer}
                onChange={(e) => updateProfile({ maxSurpriseBill: parseInt(e.target.value) })}
                className="slider-glass w-full"
              />
              <div className="flex justify-between text-sm text-slate-500 dark:text-white/50 mt-3">
                <span>$500</span>
                <span>$10,000</span>
              </div>
            </div>

            <motion.div
              key={currentBuffer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`glass p-4 border-l-4 ${currentBuffer >= 6000
                ? 'border-green-500'
                : currentBuffer >= 3000
                  ? 'border-yellow-500'
                  : 'border-red-500'
                }`}
            >
              {currentBuffer >= 6000 ? (
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-white/80">
                    <strong className="text-green-600 dark:text-green-400">HDHP Safe Zone:</strong> With this buffer,
                    high-deductible plans can work well for you - lower premiums and HSA tax benefits
                    without financial risk.
                  </div>
                </div>
              ) : currentBuffer >= 3000 ? (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-white/80">
                    <strong className="text-yellow-600 dark:text-yellow-400">Moderate Risk:</strong> Consider mid-range
                    deductible plans. HDHP is possible but may cause financial stress in a bad year.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-white/80">
                    <strong className="text-red-600 dark:text-red-400">Protection Priority:</strong> We'll prioritize
                    plans with lower deductibles to protect you from unexpected costs.
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        );

      case 'income':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {incomeOptions.map((option, index) => {
                const isSelected = profile.householdIncome === option.value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    onClick={() => updateProfile({ householdIncome: option.value })}
                    className={`selection-card p-4 text-left ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-white mb-1">{option.label}</div>
                    <div className="text-xs text-slate-500 dark:text-white/50 mb-2">Tax bracket: ~{option.taxBracket}</div>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" />
                        HSA saves you {option.hsaSavings}/yr
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="glass p-4"
            >
              <div className="flex items-start gap-3">
                <Calculator className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-white/70">
                  <strong className="text-slate-900 dark:text-white">HSA Tax Magic:</strong> Contributions reduce taxable income,
                  grow tax-free, and withdrawals for medical expenses are tax-free. Higher income = bigger savings.
                </div>
              </div>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="gradient-mesh" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Header */}
      <header className="relative z-10 glass-dark sticky top-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleBack} className="btn-ghost flex items-center gap-1">
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-2 text-slate-600 dark:text-white/70">
              <span className="text-sm font-medium">{stepIndex + 1}</span>
              <span className="text-slate-300 dark:text-white/30">/</span>
              <span className="text-sm">{steps.length}</span>
            </div>
          </div>
          <div className="progress-glass">
            <motion.div
              className="progress-fill-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepConfig.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
          >
            {/* Step Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${currentStepConfig.gradient} flex items-center justify-center shadow-glow`}
              >
                <StepIcon className="w-8 h-8 text-indigo-600 dark:text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                {currentStepConfig.title}
              </h1>
              <p className="text-slate-600 dark:text-white/60 max-w-lg mx-auto">
                {currentStepConfig.subtitle}
              </p>
            </div>

            {/* Step Content */}
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 py-4 z-20">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          {['planned_care', 'prescriptions'].includes(currentStepConfig.id) ? (
            <button onClick={handleNext} className="btn-ghost">
              Skip this step
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            className={`btn-primary flex items-center gap-2 transition-transform active:scale-95 ${!canProceed() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {stepIndex >= steps.length - 1 ? t('seeRecommendations') : t('continue')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Audio Guide */}
      {mode === 'counselor' && (
        <AudioPlayer step={currentStep} autoPlay={true} />
      )}
    </div>
  );
}
