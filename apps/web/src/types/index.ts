export interface Vitals {
  temperature?: number; // e.g. 37.4
  bloodPressure?: string; // e.g. "130/85"
  pulse?: number; // e.g. 76
  weight?: number; // e.g. 68
}

export interface Patient {
  id: string;
  patientId: string; // e.g. "CB-00421"
  name: string;
  age: number;
  sex: 'Female' | 'Male' | 'Other';
  phone: string;
  community: string;
  address?: string;
  lastVisit: string;
  registeredAt: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  chwId: string;
  chwName: string;
  facilityId: string;
  facilityName: string;
  date: string;
  rawNotes: string;
  inputMethod: 'voice' | 'text';
  patientReported: {
    chiefComplaint: string;
    duration: string;
    concerns: string[];
  };
  chwObservations: {
    clinicalNotes: string;
    vitals: Vitals;
  };
  followUp: {
    recommendation: string;
    dueDate?: string;
  };
  confirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  status: 'synced' | 'pending_sync';
  createdAt: string;
}

export interface Referral {
  id: string;
  referralCode: string; // e.g. "REF-10281"
  patientId: string;
  patientName: string;
  patientAge: number;
  patientSex: 'Female' | 'Male' | 'Other';
  referringFacility: string;
  receivingFacility: string;
  chwName: string;
  reason: string;
  relevantHistory: string;
  symptomsReported: string[];
  recordedObservations: {
    vitals: Vitals;
    notes: string;
  };
  previousEncounterDate: string;
  referralSummary: string;
  status: 'active' | 'received';
  createdAt: string;
  receivedAt?: string;
  receivedBy?: string;
}

export interface FollowUpItem {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  task: string;
  dueDate: string;
  completed: boolean;
}

export interface CHWProfile {
  id: string;
  name: string;
  role: string;
  facilityId: string;
  facilityName: string;
  phone: string;
  community: string;
}
