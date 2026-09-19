import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Circle, ChevronRight, User } from 'lucide-react';
import { storage } from '../services/storage';
import { Patient } from '../types';

interface FollowUpsViewProps {
  onSelectPatient: (patient: Patient) => void;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({ onSelectPatient }) => {
  const [followUps, setFollowUps] = useState(storage.getFollowUps());

  const handleToggle = (id: string) => {
    storage.toggleFollowUp(id);
    setFollowUps([...storage.getFollowUps()]);
  };

  const pendingCount = followUps.filter(f => !f.completed).length;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Pending Follow-ups</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Care continuity check-ins scheduled for community members
          </p>
        </div>
        <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
          {pendingCount} remaining
        </span>
      </div>

      <div className="space-y-3">
        {followUps.map((item) => {
          const patient = storage.getPatient(item.patientId);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                item.completed ? 'opacity-60 bg-slate-50/70 border-slate-200' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  className="mt-0.5 sm:mt-0 text-slate-400 hover:text-teal-700 transition-colors"
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 hover:text-teal-600" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${item.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {item.patientName}
                    </span>
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-semibold">
                      {item.patientCode}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${item.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                    {item.task}
                  </p>
                  <div className="text-[11px] text-amber-800 font-semibold mt-1">
                    Due: {item.dueDate}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    item.completed
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  {item.completed ? 'Undo' : 'Complete'}
                </button>

                {patient && (
                  <button
                    type="button"
                    onClick={() => onSelectPatient(patient)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                    title="View patient profile"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
