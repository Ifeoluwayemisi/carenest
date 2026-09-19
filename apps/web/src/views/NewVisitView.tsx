import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Mic, 
  Thermometer, 
  Heart, 
  Scale, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { Patient, Vitals } from '../types';
import { VoiceRecorder } from '../components/VoiceRecorder';

interface NewVisitViewProps {
  patient: Patient;
  onBack: () => void;
  onStructureWithAI: (notesText: string, vitals: Vitals, inputMethod: 'voice' | 'text') => void;
}

export const NewVisitView: React.FC<NewVisitViewProps> = ({
  patient,
  onBack,
  onStructureWithAI,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');
  const [notesText, setNotesText] = useState('');
  const [temperature, setTemperature] = useState<string>('37.4');
  const [bloodPressure, setBloodPressure] = useState<string>('130/85');
  const [pulse, setPulse] = useState<string>('76');
  const [weight, setWeight] = useState<string>('68');

  const DEMO_SAMPLE_NOTE = "I visited Maria today. She has been having headaches for three days. She says she has not been able to get her medication. Her temperature is 37.4 degrees and blood pressure is 130 over 85.";

  const handleApplySampleNote = () => {
    setNotesText(DEMO_SAMPLE_NOTE);
    setTemperature('37.4');
    setBloodPressure('130/85');
    setPulse('76');
    setWeight('68');
  };

  const handleVoiceTranscript = (transcript: string) => {
    setNotesText(transcript);
  };

  const handleStartAIProcessing = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveText = notesText.trim() || DEMO_SAMPLE_NOTE;
    
    const vitals: Vitals = {
      temperature: temperature ? parseFloat(temperature) : undefined,
      bloodPressure: bloodPressure.trim() || undefined,
      pulse: pulse ? parseInt(pulse, 10) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
    };

    onStructureWithAI(effectiveText, vitals, activeTab);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top back & identity banner */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Back</span>
        </button>

        <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          Encounter Record
        </span>
      </div>

      {/* Patient Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center text-sm">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{patient.name}</h2>
              <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {patient.patientId}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {patient.age} • {patient.sex} • {patient.community}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Input Method Tabs (Voice vs Text) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">New Patient Visit</h3>
            <p className="text-xs text-slate-500">
              Capture patient story naturally through voice or typing
            </p>
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'voice'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
          </div>
        </div>

        {/* Input Area */}
        {activeTab === 'voice' ? (
          <VoiceRecorder
            onTranscriptComplete={handleVoiceTranscript}
            currentText={notesText}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Visit Notes & Story
              </label>
              <button
                type="button"
                onClick={handleApplySampleNote}
                className="text-xs font-medium text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Fill with Maria's Demo Note
              </button>
            </div>
            <textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Describe what happened during the visit... (e.g. I visited Maria today. She has been having headaches for three days. She says she has not been able to get her medication. Her temperature is 37.4 degrees and blood pressure is 130 over 85.)"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none transition-all leading-relaxed"
            />
          </div>
        )}

        {/* Vitals Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Vitals Recorded in Field</span>
            </h4>
            <span className="text-[11px] text-slate-400">Optional or extracted from voice</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Temperature */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-rose-500" />
                Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="37.4"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            {/* Blood Pressure */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                <Heart className="w-3 h-3 text-indigo-500" />
                Blood Pressure
              </label>
              <input
                type="text"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="130/85"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            {/* Pulse */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-teal-500" />
                Pulse (bpm)
              </label>
              <input
                type="number"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="76"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            {/* Weight */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                <Scale className="w-3 h-3 text-amber-500" />
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="68"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Primary CTA: Structure with AI */}
        <div className="pt-3">
          <button
            type="button"
            onClick={handleStartAIProcessing}
            className="w-full py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            <span>Structure with AI</span>
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            CareNest structures your observations for clinical review. No automated diagnoses or prescriptions.
          </p>
        </div>
      </div>
    </div>
  );
};
