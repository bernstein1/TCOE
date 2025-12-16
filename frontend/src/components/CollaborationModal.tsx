import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Copy, Check, Link2, ArrowRight, Loader2 } from 'lucide-react';
import { useCollaboration } from '../hooks/useCollaboration';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CollaborationModal({ isOpen, onClose }: CollaborationModalProps) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    isConnected,
    sessionCode,
    shareUrl,
    spouseJoined,
    spouseProfile,
    comparisonResults,
    error,
    createSession,
    joinSession,
    requestComparison,
    leaveSession,
  } = useCollaboration({
    onSpouseJoined: () => {
      // Could show a toast notification here
    },
    onComparisonReady: (_results: any) => {
      // Handle comparison results
    },
  });

  const handleCreateSession = () => {
    createSession();
  };

  const handleJoinSession = () => {
    if (joinCode.length === 6) {
      joinSession(joinCode.toUpperCase());
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (sessionCode) {
      leaveSession();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-xl font-display font-semibold text-gray-900">
                Compare with Spouse
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Work together to find the best coverage option
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {!sessionCode ? (
              <>
                {/* Mode Selection */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setMode('create')}
                    className={`flex-1 py-2 rounded-xl font-medium transition-colors ${mode === 'create'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    Start New
                  </button>
                  <button
                    onClick={() => setMode('join')}
                    className={`flex-1 py-2 rounded-xl font-medium transition-colors ${mode === 'join'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    Join Existing
                  </button>
                </div>

                {mode === 'create' ? (
                  <button
                    onClick={handleCreateSession}
                    disabled={!isConnected}
                    className="w-full btn btn-primary gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Create Shareable Link
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter 6-digit code
                      </label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="ABC123"
                        className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <button
                      onClick={handleJoinSession}
                      disabled={joinCode.length !== 6 || !isConnected}
                      className="w-full btn btn-primary gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Join Session
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                {/* Session Code Display */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm text-gray-500 mb-2">Share this code with your spouse</div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold tracking-widest text-gray-900">
                      {sessionCode}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200">
                  {spouseJoined ? (
                    <>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Spouse Connected</div>
                        <div className="text-sm text-gray-500">
                          {spouseProfile?.coverageType ? 'Profile shared' : 'Waiting for profile...'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Waiting for spouse...</div>
                        <div className="text-sm text-gray-500">Share the code above</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Compare Button */}
                {spouseJoined && spouseProfile?.coverageType && (
                  <button
                    onClick={requestComparison}
                    className="w-full btn btn-primary gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Compare Coverage Options
                  </button>
                )}

                {/* Comparison Results */}
                {comparisonResults && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Recommendation</h3>
                    {comparisonResults.scenarios.map((scenario: any, i: number) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border-2 ${scenario.isBest
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{scenario.name}</div>
                            <div className="text-sm text-gray-500">{scenario.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              ${scenario.totalCost.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">est. annual</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isConnected && (
              <p className="text-center text-sm text-amber-600 mt-4">
                Connecting to collaboration server...
              </p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
