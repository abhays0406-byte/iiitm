export interface PriorityReferenceEntry {
  keywords: string[];
  suggested: 'High' | 'Routine';
  basis: string;
  source: 'Illustrative reference. Needs clinician review.';
}

export const PRIORITY_REFERENCE: PriorityReferenceEntry[] = [
  { keywords: ['uncontrolled diabetes', 'uncontrolled sugar', 'hba1c high', 'sugar uncontrolled'], suggested: 'High', basis: 'Uncontrolled glycaemia needs close monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['hypertension uncontrolled', 'bp uncontrolled', 'bp high', 'high bp', 'bp not controlled'], suggested: 'High', basis: 'Uncontrolled hypertension risk', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['chest pain', 'chest tightness', 'angina', 'cardiac', 'heart failure', 'breathlessness at rest'], suggested: 'High', basis: 'Cardiac symptoms require urgent review', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['post operative', 'post-operative', 'post op', 'post-op', 'surgery done', 'operated'], suggested: 'High', basis: 'Post-operative wound monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['tb', 'tuberculosis', 'dots', 'anti tb'], suggested: 'High', basis: 'TB treatment adherence monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['pregnancy', 'pregnant', 'antenatal', 'anc', 'garbhavati', 'गर्भवती'], suggested: 'High', basis: 'Antenatal care requires regular follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['renal failure', 'kidney failure', 'creatinine high', 'ckd', 'chronic kidney'], suggested: 'High', basis: 'Renal function deterioration risk', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['stroke', 'paralysis', 'hemiplegia', 'tia', 'brain attack'], suggested: 'High', basis: 'Neurological event follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['seizure', 'epilepsy', 'fits', 'convulsion', 'dora', 'mirgi', 'मिर्गी'], suggested: 'High', basis: 'Seizure disorder monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['sepsis', 'infection severe', 'high fever', 'tez bukhar', 'तेज बुखार'], suggested: 'High', basis: 'Severe infection needs close monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['suture removal', 'stitches removal', 'tanka', 'टांका'], suggested: 'High', basis: 'Wound care follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['new medication', 'dose changed', 'dose increased', 'dose decreased', 'dose adjusted', 'titration'], suggested: 'High', basis: 'Medication change needs monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['child', 'paediatric', 'infant', 'bachcha', 'बच्चा', 'shishu'], suggested: 'High', basis: 'Paediatric patients need closer monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['elderly', 'aged', 'budhapa', 'बुजुर्ग', 'senior citizen'], suggested: 'High', basis: 'Elderly patients at higher risk', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['cancer', 'malignancy', 'tumour', 'tumor', 'chemotherapy', 'radiation'], suggested: 'High', basis: 'Oncology follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['thyroid', 'hypothyroid', 'hyperthyroid', 'tsh abnormal', 'thyroid uncontrolled'], suggested: 'High', basis: 'Thyroid disorder monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['asthma attack', 'copd exacerbation', 'breathing difficulty', 'saans ki takleef'], suggested: 'High', basis: 'Respiratory exacerbation', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['mental health', 'depression severe', 'psychosis', 'schizophrenia', 'psychiatric'], suggested: 'High', basis: 'Psychiatric condition monitoring', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['routine checkup', 'routine check-up', 'general checkup', 'annual checkup', 'niyamit jaanch'], suggested: 'Routine', basis: 'Routine wellness visit', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['stable diabetes', 'diabetes controlled', 'sugar controlled', 'sugar stable'], suggested: 'Routine', basis: 'Controlled diabetes maintenance', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['stable bp', 'bp controlled', 'bp stable', 'hypertension controlled'], suggested: 'Routine', basis: 'Controlled hypertension maintenance', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['cold', 'cough', 'mild fever', 'viral', 'flu', 'sardi', 'khansi', 'सर्दी', 'खांसी'], suggested: 'Routine', basis: 'Minor acute illness', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['lipid profile', 'cholesterol check', 'lipid check'], suggested: 'Routine', basis: 'Lipid monitoring follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['vitamin deficiency', 'vitamin d', 'vitamin b12', 'anaemia mild', 'khoon ki kami'], suggested: 'Routine', basis: 'Nutritional deficiency follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['skin rash', 'allergy', 'urticaria', 'khujli', 'daad', 'खुजली'], suggested: 'Routine', basis: 'Dermatological follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['physiotherapy', 'exercise', 'rehabilitation', 'vyayam'], suggested: 'Routine', basis: 'Rehabilitation follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['eye check', 'vision check', 'spectacles', 'chasma', 'चश्मा'], suggested: 'Routine', basis: 'Ophthalmology follow-up', source: 'Illustrative reference. Needs clinician review.' },
  { keywords: ['dental', 'tooth', 'teeth', 'daant', 'दांत'], suggested: 'Routine', basis: 'Dental follow-up', source: 'Illustrative reference. Needs clinician review.' },
];

// Normalise text the same way the extractor does: lowercase, collapse whitespace
function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface SuggestionResult {
  suggested: 'High' | 'Routine';
  matchedKeyword: string;
  basis: string;
}

export function suggestPriority(noteText: string): SuggestionResult | null {
  const norm = normalise(noteText);
  for (const entry of PRIORITY_REFERENCE) {
    for (const kw of entry.keywords) {
      if (norm.includes(normalise(kw))) {
        return { suggested: entry.suggested, matchedKeyword: kw, basis: entry.basis };
      }
    }
  }
  return null;
}
