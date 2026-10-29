import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage';

export function DoctorPlaceholder() {
  return (
    <PlaceholderPage
      role="Doctor"
      heading="Doctor screen"
      description="Write the visit note, set priority, and send to the nurse queue in one tap."
    />
  );
}

export function NursePlaceholder() {
  return (
    <PlaceholderPage
      role="Nurse"
      heading="Nurse validation screen"
      description="Review extracted follow-up cards, approve, edit dates, or reject to audit."
    />
  );
}

export function RecordsPlaceholder() {
  return (
    <PlaceholderPage
      role="Records Desk"
      heading="Records Desk"
      description="Review overdue defaulters and send privacy-safe reminders."
    />
  );
}

export function ASHAPlaceholder() {
  return (
    <PlaceholderPage
      role="ASHA"
      heading="ASHA list"
      description="Weekly list of unreachable patients with outcome tags and print export."
    />
  );
}

export function AdminPlaceholder() {
  return (
    <PlaceholderPage
      role="Admin"
      heading="Admin overview"
      description="Follow-ups approved, overdue defaulters, and contact rate."
    />
  );
}
