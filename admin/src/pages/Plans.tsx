import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Check, X } from 'lucide-react';
import api from '../services/api';
import AddPlanModal from '../components/AddPlanModal';

interface Plan {
  id: string;
  name: string;
  type: string;
  premiums: { employee: number };
  deductibles: { individual: number };
  hsa_eligible: boolean;
  is_active: boolean;
  enrolledCount?: number;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const data = await api.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Health Plans</h1>
          <p className="text-gray-500">Manage available insurance plans and coverage details</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Plan
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Plan Name</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Type</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Premium (Emp)</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Deductible</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">HSA Eligible</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-50">
                <td className="py-4 px-6 font-medium text-gray-900">{plan.name}</td>
                <td className="py-4 px-6 text-gray-600">
                  <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium">
                    {plan.type}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-600">${plan.premiums?.employee || 0}/mo</td>
                <td className="py-4 px-6 text-gray-600">${plan.deductibles?.individual || 0}</td>
                <td className="py-4 px-6">
                  {plan.hsa_eligible ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300" />
                  )}
                </td>
                <td className="py-4 px-6">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                    }`}>
                    {plan.is_active ? 'Active' : 'Draft'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No plans found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddPlanModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchPlans}
      />
    </div>
  )
}
