// Entirely fictional content for the demo. No real person or clinical record.
export const SYNTHETIC_CONTENT: Record<string, string> = {
  "pa-referral": [
    "REFERRAL — synthetic demo record",
    "Patient: Linh Tran (fictional), born 01/01/1990",
    "To: General practitioner",
    "Reason: lower back pain for 6 weeks after a cycling fall; worse when sitting.",
    "Request: GP review and decide whether imaging is needed.",
    "From: Dr M. Example, Riverside Urgent Care (fictional)",
  ].join("\n"),
  "pa-careplan": [
    "CARE PLAN — synthetic demo record",
    "Patient: Linh Tran (fictional)",
    "Physiotherapy: 6 sessions over 4 weeks.",
    "Goals: core stabilisation, hip mobility, return to cycling 30 min.",
    "Home exercises: bridges 3x10, bird-dog 3x10, walking 20 min daily.",
    "Review: week 4.",
  ].join("\n"),
  "pa-pathology": [
    "PATHOLOGY — synthetic demo record (kept private by the patient)",
    "Patient: Linh Tran (fictional)",
    "Full blood count: within reference range.",
    "HbA1c: 6.1% (borderline).",
    "Thyroid function: normal.",
  ].join("\n"),
};
