# CareNest — System Design & UI/UX Component Architecture (`DESIGN.md`)

## 1. Design Principles & UX Strategy
- **Field-First Usability:** Engineered for high sunlight visibility, outdoor use, and rapid single-handed mobile navigation by Community Health Workers (CHWs).
- **Source Transparency:** Explicit, color-coded visual separation between **Patient Statements**, **CHW Clinical Observations**, and **AI Suggested Actions**.
- **Human-in-the-Loop Safeguards:** AI generates reviewable drafts; the CHW retains full agency to edit, approve, or reject suggestions before final persistence.
- **Offline Resilience:** Seamless visual cues for network state transitions (Online vs. Offline Local Queueing) with zero workflow interruption.

---

## 2. Color Palette & CSS System Variables

```css
:root {
  /* Primary Brand - Field Healthcare Emerald */
  --color-primary: #1B4D3E;          /* Dominant Header, Navigation, & Hero Containers */
  --color-primary-hover: #143B2F;
  --color-accent: #2E8B57;           /* Active states & primary action triggers */
  --color-accent-light: #E8F4F0;     /* Highlight backgrounds & active tabs */

  /* Neutral Surface Palette */
  --color-bg-app: #F8FAF9;           /* App canvas background */
  --color-surface: #FFFFFF;          /* High-elevation cards & modals */
  --color-border: #E2E8F0;           /* Soft dividers & neutral borders */
  --color-text-main: #0F172A;        /* High-contrast body text */
  --color-text-muted: #64748B;       /* Secondary labels & timestamps */

  /* Source Attribution Colors (PRD Core Requirement) */
  --color-patient-bg: #EFF6FF;       /* Soft Blue: Patient-reported history */
  --color-patient-border: #3B82F6;
  --color-patient-text: #1E40AF;

  --color-chw-bg: #F0FDF4;           /* Soft Green: CHW clinical observation */
  --color-chw-border: #22C55E;
  --color-chw-text: #166534;

  --color-ai-bg: #FAF5FF;            /* Soft Purple: AI structured suggestions */
  --color-ai-border: #A855F7;
  --color-ai-text: #6B21A8;

  /* Network & System Status Badges */
  --color-offline-bg: #FEF3C7;       /* Amber: Offline local storage state */
  --color-offline-text: #92400E;
  --color-online-bg: #D1FAE5;        /* Mint Green: Synced live state */
  --color-online-text: #065F46;
  --color-urgent-bg: #FEE2E2;        /* Crimson: Red-flag triage alerts */
  --color-urgent-text: #991B1B;
}
```

---

## 3. Typography Hierarchy
- **Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Heading 1 (Screen Titles):** `20px` / Bold (`700`) / Line Height `1.2` / `--color-primary`
- **Heading 2 (Card & Section Headers):** `16px` / Semi-bold (`600`) / `--color-text-main`
- **Subheadings / Field Labels:** `14px` / Medium (`500`) / `--color-text-muted`
- **Body Text:** `14px` / Regular (`400`) / Line Height `1.5` / `--color-text-main`
- **Micro-copy & Status Badges:** `12px` / Bold (`700`) / Uppercase Tracking `0.05em`

---

## 4. Touch Targets, Buttons & Interactivity

| Element Type | Dimensions | Styling Specifications | Interactivity / Feedback |
| :--- | :--- | :--- | :--- |
| **Primary Action Button** | Height: `52px` | Background: `--color-accent`, Radius: `8px`, Text: `#FFFFFF` Bold | Active press depth transform (`translateY(1px)`), `--color-primary-hover`. |
| **Secondary Button** | Height: `48px` | Background: `--color-surface`, Border: `1.5px solid --color-border` | Hover highlight (`--color-bg-app`), focus ring (`2px` emerald). |
| **Voice Dictation CTA** | `72px x 72px` Circle | Background: `--color-accent`, Icon: White Mic, Pulse animation | Continuous ambient pulsing ring when active (`scale(1.1)` keyframe). |
| **Touch Targets** | Min `48px x 48px` | Generous padding (`12px` min) across all list items and form fields | Immediate visual touch feedback (ripple or background darkening). |

---

## 5. Lucide Iconography Guidelines

To maintain aesthetic consistency, use **Lucide React Icons** (`lucide-react`) across all application views:

```tsx
import { 
  Mic, 
  MicOff, 
  Wifi, 
  WifiOff, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ChevronRight, 
  ArrowLeft 
} from 'lucide-react';
```

### Icon Usage Rules:
* **Network Status Indicator:** Use `<Wifi size={16} />` for online state; `<WifiOff size={16} />` for offline local storage state.
* **Voice Recording:** Use `<Mic size={32} />` inside the central floating action button. Toggle to `<MicOff size={32} />` during processing.
* **Source Attribution Badges:**
  * Patient-reported items: `<User size={14} className="text-blue-600" />`
  * CHW Observations: `<CheckCircle2 size={14} className="text-green-600" />`
  * AI Generated Suggestions: `<FileText size={14} className="text-purple-600" />`
* **Red Flag / Urgent Triage Alerts:** `<AlertTriangle size={16} className="text-red-600" />`

---

## 6. Reusable UI Components Architecture

### Component A: App Navigation Header with Network Badge
```tsx
export const AppHeader = ({ isOnline, pendingSyncCount }: { isOnline: boolean; pendingSyncCount: number }) => (
  <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-50">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-lg">C</div>
      <div>
        <h1 className="text-base font-bold leading-tight">CareNest</h1>
        <p className="text-[10px] text-emerald-200">Field Assistant</p>
      </div>
    </div>
    
    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
      isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
      <span>{isOnline ? 'Synced' : `Offline (${pendingSyncCount} Queued)`}</span>
    </div>
  </header>
);
```

### Component B: Source-Attributed Card Component
```tsx
interface SourceCardProps {
  type: 'patient' | 'chw' | 'ai';
  title: string;
  content: string;
}

export const SourceAttributedCard = ({ type, title, content }: SourceCardProps) => {
  const styles = {
    patient: 'bg-[var(--color-patient-bg)] border-[var(--color-patient-border)] text-[var(--color-patient-text)]',
    chw: 'bg-[var(--color-chw-bg)] border-[var(--color-chw-border)] text-[var(--color-chw-text)]',
    ai: 'bg-[var(--color-ai-bg)] border-[var(--color-ai-border)] text-[var(--color-ai-text)]',
  };

  return (
    <div className={`border-l-4 p-3.5 rounded-r-lg mb-3 shadow-xs ${styles[type]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-sm text-slate-800 font-normal leading-relaxed">{content}</p>
    </div>
  );
};
```

---

## 7. Page Specifications & Layout Mapping

| File Path | Purpose | Core UI Elements |
| :--- | :--- | :--- |
| `pages/index.tsx` | CHW Home Dashboard | Patient Queue, Search Bar, Offline Banner, Big "Start Visit" FAB button. |
| `pages/visit/record.tsx` | Voice Capture Screen | Audio Waveform Visualizer, Big Mic Pulse Button, Live Transcript Box. |
| `pages/visit/review.tsx` | AI Review & Confirm | Source-Attributed Cards, Editable Inputs, "Confirm & Save" Primary CTA. |
| `pages/supervisor/index.tsx` | Supervisor Dashboard | Metric Cards (Active CHWs, Pending Syncs, Red Flags), Patient Handoff Table. |

---

## 8. Offline Local Storage Schema (IndexedDB / LocalStorage)
- `carenest_patients_cache`: Static list of patients assigned to the active CHW.
- `carenest_offline_queue`: Array of draft visit JSON records waiting to auto-sync when network reconnects.
