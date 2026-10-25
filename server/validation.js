import { CATALOGS } from './catalogs.js';
import { HttpError } from './http.js';

function invalid(label) { throw new HttpError(422, 'INVALID_PROFILE', `Vérifiez le champ « ${label} » dans votre fiche.`); }
function string(value, max, label, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') invalid(label);
  const result = value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  if (result.length > max || (required && !result)) invalid(label);
  return result;
}
function choice(raw, key, catalog, required = false) {
  const value = string(raw[key], 150, key, required);
  if (value && !catalog.includes(value)) invalid(key);
  return value;
}
function choices(raw, key, catalog, required = false) {
  if (!Array.isArray(raw[key]) || raw[key].length > catalog.length || raw[key].some(value => !catalog.includes(value))) invalid(key);
  const values = [...new Set(raw[key])]; if (required && !values.length) invalid(key); return values;
}
function photo(raw) {
  if (!raw) return { base64: null, type: null };
  if (typeof raw !== 'string') invalid('photo');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw);
  if (!match || match[2].length > 1398104 || match[2].length % 4 !== 0) invalid('photo');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 1048576 || buffer.toString('base64') !== match[2]) invalid('photo');
  const type = match[1];
  const valid = type === 'image/jpeg' ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
    : type === 'image/png' ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) invalid('photo');
  return { base64: match[2], type };
}
export function validateProfile(raw) {
  const d = {};
  const strings = { firstName: [60, true], lastName: [80, true], email: [254, true], headline: [120], bio: [1000, true], school: [150], skills: [300], projectTitle: [120], projectDescription: [1500, true], city: [100, true] };
  for (const [key, [max, required]] of Object.entries(strings)) d[key] = string(raw[key], max, key, required);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) invalid('e-mail');
  if (!/^\d{1,3}$/.test(String(raw.age)) || Number(raw.age) < 1 || Number(raw.age) > 120) invalid('âge');
  d.age = Number(raw.age);
  d.role = choice(raw, 'role', ['founder', 'partner', 'investor'], true);
  const enums = { professionalStatus: ['statuses', true], educationLevel: ['education'], studyField: ['studyFields'], experience: ['experience'], availability: ['availability', true], projectCategory: ['sectors', true], projectStage: ['stages', true], collaborationType: ['collaborations', true], lookingFor: ['lookingFor'] };
  for (const [key, [catalog, required]] of Object.entries(enums)) d[key] = choice(raw, key, CATALOGS[catalog], required);
  d.workFields = choices(raw, 'workFields', CATALOGS.workFields, true);
  d.department = choice(raw, 'department', CATALOGS.departments.map(([id]) => id), true);
  d.region = 'ile-de-france';
  d.arrondissement = d.department === '75' ? choice(raw, 'arrondissement', CATALOGS.arrondissements) : '';
  d.plan = choice(raw, 'plan', ['student', 'classic', 'vip']);
  if (raw.consent !== true) throw new HttpError(422, 'CONSENT_REQUIRED', 'Votre accord est nécessaire pour traiter la préinscription.');
  d.consent = true; d.publicConsent = raw.publicConsent === true; d.showAge = raw.showAge === true;
  d.showInvestmentIntent = d.role === 'investor' && raw.showInvestmentIntent === true;
  d.showInvestmentAmount = d.showInvestmentIntent && raw.showInvestmentAmount === true;
  d.investmentRanges = d.role === 'investor' ? choices(raw, 'investmentRanges', CATALOGS.investmentRanges) : [];
  for (const [key, max] of Object.entries({ investmentSectors: 300, investmentProjectTypes: 500, investmentAmount: 80 })) d[key] = d.role === 'investor' ? string(raw[key], max, key) : '';
  return { profile: d, photo: photo(raw.photoUrl) };
}
export function publicProfile(d) {
  const p = { displayName: `${d.firstName} ${Array.from(d.lastName)[0]}.`, role: d.role === 'investor' && !d.showInvestmentIntent ? 'member' : d.role,
    age: d.showAge ? d.age : '', education: [d.educationLevel, d.studyField].filter(Boolean).join(' · ') };
  for (const key of ['headline', 'bio', 'professionalStatus', 'experience', 'availability', 'workFields', 'skills', 'city', 'department', 'arrondissement', 'projectTitle', 'projectCategory', 'projectStage', 'projectDescription', 'collaborationType', 'lookingFor']) p[key] = d[key];
  if (d.showInvestmentIntent) {
    p.investmentSectors = d.investmentSectors; p.investmentProjectTypes = d.investmentProjectTypes;
    if (d.showInvestmentAmount) { p.investmentAmount = d.investmentAmount; p.investmentRanges = d.investmentRanges; }
  }
  return p;
}
