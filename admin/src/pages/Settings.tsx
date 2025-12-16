import { useState } from 'react';
import { Save, Upload, Calendar, Globe, MessageSquare, Shield } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: 'Acme Corporation',
    logoUrl: '',
    primaryColor: '#14b8a6',
    secondaryColor: '#6366f1',
    enrollmentStart: '2024-11-01',
    enrollmentEnd: '2024-11-30',
    enableCounselorMode: true,
    enableGoMode: true,
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es'],
    allowLifeEventChanges: true,
    enableChat: true,
    requireAuth: false,
  });

  const handleSave = async () => {
    // TODO: Implement API call to save settings
    // await api.updateCompanySettings(settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-500">Configure your benefits enrollment experience</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Branding
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <button className="w-full px-4 py-2 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 transition-colors flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Logo
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Period */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          Enrollment Period
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={settings.enrollmentStart}
              onChange={(e) => setSettings({ ...settings, enrollmentStart: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={settings.enrollmentEnd}
              onChange={(e) => setSettings({ ...settings, enrollmentEnd: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.allowLifeEventChanges}
            onChange={(e) => setSettings({ ...settings, allowLifeEventChanges: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Allow life event changes outside enrollment period</span>
        </label>
      </div>

      {/* Experience Options */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          Experience Options
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium text-gray-900">Counselor Mode</div>
              <div className="text-sm text-gray-500">Audio-guided walkthrough with explanations</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableCounselorMode}
              onChange={(e) => setSettings({ ...settings, enableCounselorMode: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium text-gray-900">Go Mode</div>
              <div className="text-sm text-gray-500">Self-directed flow for experienced users</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableGoMode}
              onChange={(e) => setSettings({ ...settings, enableGoMode: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium text-gray-900">AI Chat Assistant</div>
              <div className="text-sm text-gray-500">Allow employees to ask questions via chat</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableChat}
              onChange={(e) => setSettings({ ...settings, enableChat: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" />
          Language Settings
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Supported Languages</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked disabled className="w-4 h-4 rounded border-gray-300" />
                <span className="text-sm text-gray-700">English</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.supportedLanguages.includes('es')}
                  onChange={(e) => {
                    const langs = e.target.checked 
                      ? [...settings.supportedLanguages, 'es']
                      : settings.supportedLanguages.filter(l => l !== 'es');
                    setSettings({ ...settings, supportedLanguages: langs });
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Spanish</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
