import { Patient, Encounter, Referral, FollowUpItem, CHWProfile } from '../types';

const STORAGE_KEYS = {
  PATIENTS: 'carenest_patients',
  ENCOUNTERS: 'carenest_encounters',
  REFERRALS: 'carenest_referrals',
  FOLLOW_UPS: 'carenest_follow_ups',
  NETWORK_STATUS: 'carenest_online_status',
  CURRENT_USER: 'carenest_current_user',
};

export const DEFAULT_USER: CHWProfile = {
  id: 'chw-001',
  name: 'Amina Bello',
  role: 'Community Health Worker',
  facilityId: 'AJG-CHC-04',
  facilityName: 'Ajegunle Community Health Centre',
  phone: '+234 802 345 6789',
  community: 'Ajegunle Ward 3',
};

const SEED_PATIENTS: Patient[] = [
  {
    id: 'pat-001',
    patientId: 'CB-00421',
    name: 'Maria Okafor',
    age: 42,
    sex: 'Female',
    phone: '+234 803 555 1204',
    community: 'Ajeromi-Ifelodun, Ajegunle',
    address: '14 Orodu Street, Ajegunle',
    lastVisit: 'Today',
    registeredAt: '2026-03-12',
  },
  {
    id: 'pat-002',
    patientId: 'CB-00418',
    name: 'Tunde Ade',
    age: 28,
    sex: 'Male',
    phone: '+234 814 332 9981',
    community: 'Boundary Market Area',
    address: '32 Cemetery Road, Ajegunle',
    lastVisit: 'Yesterday',
    registeredAt: '2026-05-18',
  },
  {
    id: 'pat-003',
    patientId: 'CB-00415',
    name: 'Aisha Bello',
    age: 34,
    sex: 'Female',
    phone: '+234 809 112 4432',
    community: 'Kirikiri Canal Settlement',
    address: '7 Canal Avenue, Ajegunle',
    lastVisit: 'Sept 17, 2026',
    registeredAt: '2026-06-01',
  },
  {
    id: 'pat-004',
    patientId: 'CB-00409',
    name: 'Chinedu Okoro',
    age: 51,
    sex: 'Male',
    phone: '+234 802 998 7761',
    community: 'Alaba Suru Zone',
    address: '21 Bale Street, Ajegunle',
    lastVisit: 'Sept 10, 2026',
    registeredAt: '2026-02-14',
  },
  {
    id: 'pat-005',
    patientId: 'CB-00402',
    name: 'Fatima Musa',
    age: 19,
    sex: 'Female',
    phone: '+234 703 445 2219',
    community: 'Ojo Road Quarter',
    address: '5 Ojo Road, Ajegunle',
    lastVisit: 'Sept 02, 2026',
    registeredAt: '2026-07-20',
  }
];

const SEED_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc-001',
    patientId: 'pat-001',
    chwId: 'chw-001',
    chwName: 'Amina Bello',
    facilityId: 'AJG-CHC-04',
    facilityName: 'Ajegunle Community Health Centre',
    date: 'Sept 05, 2026',
    rawNotes: 'Follow-up visit. Patient reported difficulty getting regular antihypertensive medication from local dispensary. Advised on clinic pickup.',
    inputMethod: 'text',
    patientReported: {
      chiefComplaint: 'Medication access issue',
      duration: 'Ongoing',
      concerns: ['Difficulty obtaining monthly medication from dispensary', 'Occasional mild tension'],
    },
    chwObservations: {
      clinicalNotes: 'Patient alert and oriented. Discussed community refill alternatives and schedule.',
      vitals: {
        temperature: 36.8,
        bloodPressure: '128/82',
        pulse: 74,
      }
    },
    followUp: {
      recommendation: 'Check in on medication refill status within 2 weeks',
      dueDate: 'Sept 19, 2026',
    },
    confirmed: true,
    confirmedBy: 'Amina Bello',
    confirmedAt: '2026-09-05T10:45:00Z',
    status: 'synced',
    createdAt: '2026-09-05T10:45:00Z',
  }
];

const SEED_FOLLOW_UPS: FollowUpItem[] = [
  {
    id: 'fu-001',
    patientId: 'pat-001',
    patientName: 'Maria Okafor',
    patientCode: 'CB-00421',
    task: 'Medication access follow-up',
    dueDate: 'Sept 23, 2026',
    completed: false,
  },
  {
    id: 'fu-002',
    patientId: 'pat-002',
    patientName: 'Tunde Ade',
    patientCode: 'CB-00418',
    task: 'Clinic follow-up & dressing review',
    dueDate: 'Sept 21, 2026',
    completed: false,
  },
  {
    id: 'fu-003',
    patientId: 'pat-003',
    patientName: 'Aisha Bello',
    patientCode: 'CB-00415',
    task: 'Antenatal wellness check-in',
    dueDate: 'Sept 28, 2026',
    completed: false,
  }
];

const SEED_REFERRALS: Referral[] = [
  {
    id: 'ref-001',
    referralCode: 'REF-10281',
    patientId: 'pat-001',
    patientName: 'Maria Okafor',
    patientAge: 42,
    patientSex: 'Female',
    referringFacility: 'Ajegunle Community Health Centre',
    receivingFacility: 'General Hospital',
    chwName: 'Amina Bello',
    reason: 'Persistent symptoms requiring further evaluation and physician review',
    relevantHistory: 'Patient has reported recurring headaches over the past 3 days and difficulty accessing regular hypertension medication. Past community visit on Sept 05 noted medication supply interruption.',
    symptomsReported: ['Headache for three days', 'Difficulty obtaining medication'],
    recordedObservations: {
      vitals: {
        temperature: 37.4,
        bloodPressure: '130/85',
        pulse: 78,
      },
      notes: 'Elevated blood pressure observed during field visit. Temperature mildly elevated.',
    },
    previousEncounterDate: 'Sept 05, 2026',
    referralSummary: 'Maria Okafor (42F, CB-00421) is referred from Ajegunle CHC to General Hospital due to 3-day history of persistent headache accompanied by difficulty obtaining maintenance medication. Vitals recorded in field: Temp 37.4°C, BP 130/85. Previous encounter on Sept 5, 2026 also highlighted refill challenges. Referred for clinical assessment and medication review.',
    status: 'active',
    createdAt: '2026-09-19T09:15:00Z',
  }
];

// In-memory / LocalStorage manager
class StorageService {
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ENCOUNTERS)) {
      localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(SEED_ENCOUNTERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REFERRALS)) {
      localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(SEED_REFERRALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FOLLOW_UPS)) {
      localStorage.setItem(STORAGE_KEYS.FOLLOW_UPS, JSON.stringify(SEED_FOLLOW_UPS));
    }
    if (localStorage.getItem(STORAGE_KEYS.NETWORK_STATUS) === null) {
      localStorage.setItem(STORAGE_KEYS.NETWORK_STATUS, 'true'); // Online by default
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USER));
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // Network status simulation
  isOnline(): boolean {
    return localStorage.getItem(STORAGE_KEYS.NETWORK_STATUS) !== 'false';
  }

  setOnlineStatus(online: boolean) {
    localStorage.setItem(STORAGE_KEYS.NETWORK_STATUS, online ? 'true' : 'false');
    if (online) {
      // Automatically sync any pending records
      this.syncPendingRecords();
    }
    this.notify();
  }

  toggleOnlineStatus(): boolean {
    const next = !this.isOnline();
    this.setOnlineStatus(next);
    return next;
  }

  // Patients
  getPatients(): Patient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      return data ? JSON.parse(data) : SEED_PATIENTS;
    } catch {
      return SEED_PATIENTS;
    }
  }

  getPatient(id: string): Patient | undefined {
    return this.getPatients().find(p => p.id === id || p.patientId === id);
  }

  addPatient(patient: Omit<Patient, 'id' | 'registeredAt' | 'lastVisit'>): Patient {
    const patients = this.getPatients();
    const newPatient: Patient = {
      ...patient,
      id: `pat-${Date.now()}`,
      lastVisit: 'Today',
      registeredAt: new Date().toISOString().split('T')[0],
    };
    patients.unshift(newPatient);
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    this.notify();
    return newPatient;
  }

  // Encounters
  getEncounters(): Encounter[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ENCOUNTERS);
      return data ? JSON.parse(data) : SEED_ENCOUNTERS;
    } catch {
      return SEED_ENCOUNTERS;
    }
  }

  getPatientEncounters(patientId: string): Encounter[] {
    const encounters = this.getEncounters();
    return encounters
      .filter(e => e.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  saveEncounter(encounter: Omit<Encounter, 'id' | 'createdAt' | 'status'>): Encounter {
    const encounters = this.getEncounters();
    const isOnline = this.isOnline();
    const newEncounter: Encounter = {
      ...encounter,
      id: `enc-${Date.now()}`,
      status: isOnline ? 'synced' : 'pending_sync',
      createdAt: new Date().toISOString(),
    };
    encounters.unshift(newEncounter);
    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(encounters));

    // Update patient's last visit
    const patients = this.getPatients();
    const patientIndex = patients.findIndex(p => p.id === encounter.patientId);
    if (patientIndex >= 0) {
      patients[patientIndex].lastVisit = 'Today';
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    }

    this.notify();
    return newEncounter;
  }

  // Referrals
  getReferrals(): Referral[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REFERRALS);
      return data ? JSON.parse(data) : SEED_REFERRALS;
    } catch {
      return SEED_REFERRALS;
    }
  }

  getReferralByCode(code: string): Referral | undefined {
    const clean = code.trim().toUpperCase();
    return this.getReferrals().find(r => r.referralCode.toUpperCase() === clean);
  }

  createReferral(referral: Omit<Referral, 'id' | 'createdAt' | 'referralCode' | 'status'>): Referral {
    const referrals = this.getReferrals();
    const codeNum = Math.floor(10000 + Math.random() * 90000);
    const newReferral: Referral = {
      ...referral,
      id: `ref-${Date.now()}`,
      referralCode: `REF-${codeNum}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    referrals.unshift(newReferral);
    localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(referrals));
    this.notify();
    return newReferral;
  }

  markReferralReceived(referralCode: string, receivedBy = 'Dr. Eze (General Hospital)'): Referral | undefined {
    const referrals = this.getReferrals();
    const index = referrals.findIndex(r => r.referralCode.toUpperCase() === referralCode.trim().toUpperCase());
    if (index >= 0) {
      referrals[index].status = 'received';
      referrals[index].receivedAt = new Date().toISOString();
      referrals[index].receivedBy = receivedBy;
      localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(referrals));
      this.notify();
      return referrals[index];
    }
    return undefined;
  }

  // Follow-ups
  getFollowUps(): FollowUpItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOLLOW_UPS);
      return data ? JSON.parse(data) : SEED_FOLLOW_UPS;
    } catch {
      return SEED_FOLLOW_UPS;
    }
  }

  toggleFollowUp(id: string) {
    const followUps = this.getFollowUps();
    const item = followUps.find(f => f.id === id);
    if (item) {
      item.completed = !item.completed;
      localStorage.setItem(STORAGE_KEYS.FOLLOW_UPS, JSON.stringify(followUps));
      this.notify();
    }
  }

  // Unsynced count
  getUnsyncedCount(): number {
    const encounters = this.getEncounters();
    return encounters.filter(e => e.status === 'pending_sync').length;
  }

  syncPendingRecords(): number {
    const encounters = this.getEncounters();
    let count = 0;
    encounters.forEach(e => {
      if (e.status === 'pending_sync') {
        e.status = 'synced';
        count++;
      }
    });
    if (count > 0) {
      localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(encounters));
      this.notify();
    }
    return count;
  }

  resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(SEED_ENCOUNTERS));
    localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(SEED_REFERRALS));
    localStorage.setItem(STORAGE_KEYS.FOLLOW_UPS, JSON.stringify(SEED_FOLLOW_UPS));
    localStorage.setItem(STORAGE_KEYS.NETWORK_STATUS, 'true');
    this.notify();
  }
}

export const storage = new StorageService();
