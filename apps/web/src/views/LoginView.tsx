import React, { useState } from 'react';
import { Activity, Shield, Sparkles, Building2, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [facilityId, setFacilityId] = useState('AJG-CHC-04');
  const [username, setUsername] = useState('amina.bello');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess();
  };

  const handleDemoMode = () => {
    setFacilityId('AJG-CHC-04');
    setUsername('amina.bello');
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-700 text-white shadow-lg mb-4 ring-8 ring-teal-50">
          <Activity className="w-8 h-8 text-teal-200" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          CareNest
        </h1>
        <p className="mt-1 text-sm font-medium text-teal-700">
          Your patient's story, carried forward.
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          AI-assisted field documentation and care continuity for Community Health Workers
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl space-y-6">
          {/* Facility Header Card */}
          <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-3.5 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-teal-700 shrink-0" />
            <div className="text-left text-xs">
              <div className="font-semibold text-teal-950">Ajegunle Community Health Centre</div>
              <div className="text-teal-700">Ajeromi-Ifelodun LGA • Primary Health Care Board</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Facility ID / Organization
              </label>
              <input
                type="text"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                placeholder="e.g. AJG-CHC-04"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email or Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                placeholder="amina.bello"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                required
              />
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                Sign in
              </button>

              {/* Demo Mode Button */}
              <button
                type="button"
                onClick={handleDemoMode}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-teal-700" />
                <span>Launch Demo Mode (Amina Bello, CHW)</span>
              </button>
            </div>
          </form>

          {/* Offline-First & Security Badge */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-700" />
              <span>Offline-first facility encryption</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PWA Ready</span>
            </div>
          </div>
        </div>

        {/* Demo context reminder */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Demo profile: <strong className="text-slate-600">Amina Bello</strong> • Ajegunle CHC
        </p>
      </div>
    </div>
  );
};
