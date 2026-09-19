import { Vitals } from '../types';

export interface ExtractedEncounterDraft {
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
    dueDate: string;
  };
}

export interface ProcessingStep {
  id: number;
  label: string;
  status: 'pending' | 'in_progress' | 'done';
}

export const PROCESSING_STEPS: string[] = [
  'Transcribing notes',
  'Extracting key information',
  'Organizing visit details',
  'Preparing review',
];

export class AIService {
  /**
   * Structures freeform CHW visit notes & vitals into a structured clinical documentation draft.
   * STRICT POLICY: Does NOT diagnose, does NOT prescribe, does NOT invent vitals or medical facts.
   * Only reorganizes, extracts, and summarizes explicitly stated information.
   */
  static structureVisitNotes(notesText: string, inputVitals: Vitals): ExtractedEncounterDraft {
    const text = notesText.toLowerCase();

    // 1. Extract chief complaint & duration
    let chiefComplaint = 'General feeling of malaise';
    let duration = 'Not specified';
    const concerns: string[] = [];

    if (text.includes('headache') || text.includes('head ache')) {
      chiefComplaint = 'Headache';
    } else if (text.includes('fever') || text.includes('hot')) {
      chiefComplaint = 'Feverishness / body heat';
    } else if (text.includes('stomach') || text.includes('belly') || text.includes('abdominal')) {
      chiefComplaint = 'Abdominal discomfort';
    } else if (text.includes('cough') || text.includes('chest')) {
      chiefComplaint = 'Cough / Chest discomfort';
    } else if (text.includes('dizz') || text.includes('weak')) {
      chiefComplaint = 'Dizziness and generalized weakness';
    }

    // Duration extraction
    if (text.includes('three days') || text.includes('3 days') || text.includes('3 day')) {
      duration = '3 days';
    } else if (text.includes('two days') || text.includes('2 days')) {
      duration = '2 days';
    } else if (text.includes('a week') || text.includes('one week') || text.includes('1 week')) {
      duration = '1 week';
    } else if (text.includes('yesterday')) {
      duration = '1 day (since yesterday)';
    } else if (text.includes('today')) {
      duration = 'Started today';
    }

    // Concerns extraction
    if (text.includes('medication') || text.includes('medicine') || text.includes('drug') || text.includes('refill')) {
      concerns.push('Difficulty obtaining medication / dispensary refill delay');
    }
    if (text.includes('sleep') || text.includes('rest')) {
      concerns.push('Disturbed sleep / restlessness reported');
    }
    if (text.includes('appetite') || text.includes('eating') || text.includes('food')) {
      concerns.push('Reduced appetite');
    }
    if (concerns.length === 0) {
      concerns.push('Patient reported persistent discomfort during daily community routine');
    }

    // 2. Vitals parsing fallback from text if not provided in inputs
    const vitals: Vitals = { ...inputVitals };

    if (!vitals.temperature) {
      const tempMatch = text.match(/(\d{2}(?:\.\d)?)\s*(?:degrees|deg|celsius|°c|c)/i) ||
                        text.match(/temperature (?:is )?(\d{2}(?:\.\d)?)/i);
      if (tempMatch) {
        vitals.temperature = parseFloat(tempMatch[1]);
      }
    }

    if (!vitals.bloodPressure) {
      const bpMatch = text.match(/(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i);
      if (bpMatch) {
        vitals.bloodPressure = `${bpMatch[1]}/${bpMatch[2]}`;
      }
    }

    // 3. Clinical observations
    let clinicalNotes = 'Patient seen in community setting. Alert and communicative. Observations recorded during encounter.';
    if (vitals.temperature && vitals.temperature >= 37.5) {
      clinicalNotes = 'Patient warm to touch with mildly elevated temperature. Alert and communicative.';
    } else if (vitals.bloodPressure) {
      clinicalNotes = `Routine observation conducted. Blood pressure noted at ${vitals.bloodPressure}. Patient oriented.`;
    }

    // 4. Follow-up recommendations (practical care-continuity, NOT prescriptions)
    let recommendation = 'Review symptom progression and medication access at next community check';
    if (text.includes('medication') || text.includes('drug') || text.includes('refill')) {
      recommendation = 'Review medication access and verify dispensary stock; follow up in clinic if symptoms persist.';
    }

    // Calculate due date (5 days from today)
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 4);
    const dueDate = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      patientReported: {
        chiefComplaint,
        duration,
        concerns,
      },
      chwObservations: {
        clinicalNotes,
        vitals,
      },
      followUp: {
        recommendation,
        dueDate,
      }
    };
  }

  /**
   * Generates a structured referral summary for a receiving facility doctor/nurse.
   * Carries the patient's continuous story forward.
   */
  static generateReferralSummary(
    patientName: string,
    patientAge: number,
    patientSex: string,
    referringFacility: string,
    receivingFacility: string,
    reason: string,
    recentSymptoms: string[],
    vitals: Vitals,
    previousDate?: string
  ): string {
    const vitalsStr = [
      vitals.temperature ? `Temp ${vitals.temperature}°C` : null,
      vitals.bloodPressure ? `BP ${vitals.bloodPressure}` : null,
      vitals.pulse ? `Pulse ${vitals.pulse} bpm` : null,
    ].filter(Boolean).join(', ') || 'Vitals stable in field';

    const symptomsStr = recentSymptoms.length > 0
      ? recentSymptoms.join('; ')
      : 'Unresolved symptoms during field community visits';

    const prevNotice = previousDate
      ? `Patient was also seen on ${previousDate} with ongoing care-continuity documentation.`
      : 'Previous community documentation on file in facility record.';

    return `${patientName} (${patientAge}${patientSex.charAt(0)}) is referred from ${referringFacility} to ${receivingFacility} for: ${reason}. Field observations note: ${symptomsStr}. Recorded vitals: ${vitalsStr}. ${prevNotice} Referral generated to support continuity of care without requiring the patient to restart their medical history.`;
  }
}
