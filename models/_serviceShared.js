// models/_serviceShared.js
export const normalizeSerial = (v) =>
  String(v || "").trim().toUpperCase();

export const normalizeSerialsArray = (arr) => {
  const seen = new Set();
  return (Array.isArray(arr) ? arr : [])
    .map(normalizeSerial)
    .filter((s) => s.length)
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
};

export const SERVICE_STATUS = [
  "received",          // just logged / received
  "under inspection",  // at technician
  "awaiting customer", // waiting for approval/info
  "repaired",
  "replaced",
  "rejected",          // not eligible
  "returned",          // given back to customer
  "closed",
];

export const INTAKE_METHODS = ["indrive", "pathao", "courier", "walkin"]; // walkin = customer came to office
export const PAYER = ["company", "customer"];
