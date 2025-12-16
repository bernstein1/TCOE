import { SignIn } from '@clerk/clerk-react';
import { Building2 } from 'lucide-react';

export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-gray-900">HR Admin Portal</h1>
          <p className="text-gray-500 mt-2">Sign in to manage benefits enrollment</p>
        </div>

        <div className="flex justify-center">
          <SignIn redirectUrl="/dashboard" />
        </div>
      </div>
    </div>
  );
}

