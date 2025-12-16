import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

interface AddPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddPlanModal({ isOpen, onClose, onSuccess }: AddPlanModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'HDHP',
        network: 'National PPO',
        description: '',
        premiums: { employee: 0, employee_spouse: 0, family: 0 },
        deductibles: { individual: 0, family: 0 },
        oopMax: { individual: 0, family: 0 },
        copays: { pcp: 0, specialist: 0, er: 0, urgent_care: 0 },
        coinsurance: 0,
        hsaEligible: false,
        hsaEmployerContribution: { individual: 0, family: 0 },
        highlights: [''],
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.createPlan({
                ...formData,
                highlights: formData.highlights.filter(h => h.trim() !== ''),
                // Set defaults for required fields not in this simplified form
                warnings: [],
                fsaEligible: !formData.hsaEligible,
                rxTiers: { generic: 10, preferred: 30, non_preferred: 60, specialty: 100 },
                requiresReferral: false,
                requiresPcp: false,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create plan:', error);
            alert('Failed to create plan. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const addHighlight = () => {
        setFormData({ ...formData, highlights: [...formData.highlights, ''] });
    };

    const updateHighlight = (index: number, value: string) => {
        const newHighlights = [...formData.highlights];
        newHighlights[index] = value;
        setFormData({ ...formData, highlights: newHighlights });
    };

    const removeHighlight = (index: number) => {
        setFormData({ ...formData, highlights: formData.highlights.filter((_, i) => i !== index) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Plan</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="e.g. HDHP Premier"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            >
                                <option value="HDHP">HDHP</option>
                                <option value="PPO">PPO</option>
                                <option value="HMO">HMO</option>
                                <option value="EPO">EPO</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                            <input
                                type="text"
                                required
                                value={formData.network}
                                onChange={e => setFormData({ ...formData, network: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Premiums */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Monthly Premiums (Employee Cost)</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Employee Only</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.premiums.employee}
                                    onChange={e => setFormData({
                                        ...formData,
                                        premiums: { ...formData.premiums, employee: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Employee + Spouse</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.premiums.employee_spouse}
                                    onChange={e => setFormData({
                                        ...formData,
                                        premiums: { ...formData.premiums, employee_spouse: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Family</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.premiums.family}
                                    onChange={e => setFormData({
                                        ...formData,
                                        premiums: { ...formData.premiums, family: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Deductibles & OOP */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Deductibles</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Individual</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.deductibles.individual}
                                        onChange={e => setFormData({
                                            ...formData,
                                            deductibles: { ...formData.deductibles, individual: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Family</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.deductibles.family}
                                        onChange={e => setFormData({
                                            ...formData,
                                            deductibles: { ...formData.deductibles, family: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Out-of-Pocket Max</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Individual</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.oopMax.individual}
                                        onChange={e => setFormData({
                                            ...formData,
                                            oopMax: { ...formData.oopMax, individual: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Family</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.oopMax.family}
                                        onChange={e => setFormData({
                                            ...formData,
                                            oopMax: { ...formData.oopMax, family: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coinsurance & Copays */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Coinsurance (%)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                max="100"
                                value={formData.coinsurance}
                                onChange={e => setFormData({ ...formData, coinsurance: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PCP Copay ($)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.copays.pcp}
                                onChange={e => setFormData({
                                    ...formData,
                                    copays: { ...formData.copays, pcp: Number(e.target.value) }
                                })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    {/* HSA */}
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="hsaEligible"
                                checked={formData.hsaEligible}
                                onChange={e => setFormData({ ...formData, hsaEligible: e.target.checked })}
                                className="rounded text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="hsaEligible" className="text-sm font-medium text-gray-900">HSA Eligible</label>
                        </div>

                        {formData.hsaEligible && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Employer Contribution (Ind)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.hsaEmployerContribution.individual}
                                        onChange={e => setFormData({
                                            ...formData,
                                            hsaEmployerContribution: { ...formData.hsaEmployerContribution, individual: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Employer Contribution (Fam)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.hsaEmployerContribution.family}
                                        onChange={e => setFormData({
                                            ...formData,
                                            hsaEmployerContribution: { ...formData.hsaEmployerContribution, family: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Highlights */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plan Highlights</label>
                        <div className="space-y-2">
                            {formData.highlights.map((highlight, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={highlight}
                                        onChange={e => updateHighlight(index, e.target.value)}
                                        className="flex-1 px-3 py-2 border rounded-lg"
                                        placeholder="e.g. Free Telehealth"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeHighlight(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addHighlight}
                                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                            >
                                <Plus className="w-4 h-4" />
                                Add Highlight
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Creating...' : 'Create Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
