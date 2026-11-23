import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try { for (const l of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; } } catch {}
const E = process.env, PORT = +E.PORT || 3000, TTL = (+E.TOKEN_TTL_HOURS || 12) * 3600;
if (E.NODE_ENV === 'production' && !E.TOKEN_SECRET) throw new Error('TOKEN_SECRET required in production');
const SECRET = E.TOKEN_SECRET || (console.warn('Dev: random TOKEN_SECRET, logins reset on restart'), crypto.randomBytes(32).toString('hex'));
const dbFile = path.resolve(root, E.DATABASE_FILE || './data/youngminds.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT DEFAULT 'Administrator', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS positions(id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, reports_to TEXT, summary TEXT, responsibilities TEXT, requirements TEXT, is_open INT DEFAULT 1, is_new INT DEFAULT 0, sort_order INT DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY, full_name TEXT, email TEXT, phone TEXT, course TEXT, year_of_study TEXT, position_id INT NOT NULL REFERENCES positions(id), second_choice_id INT REFERENCES positions(id), motivation TEXT, cv_link TEXT, portfolio_link TEXT, status TEXT DEFAULT 'new' CHECK(status IN ('new','shortlisted','interview','accepted','declined')), admin_notes TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY, school_name TEXT, county TEXT, contact_name TEXT, contact_role TEXT, email TEXT, phone TEXT, levels TEXT, learners INT, format TEXT, focus_areas TEXT, preferred_date TEXT, notes TEXT DEFAULT '', status TEXT DEFAULT 'new' CHECK(status IN ('new','contacted','scheduled','completed','cancelled')), admin_notes TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, name TEXT, email TEXT, subject TEXT, message TEXT, is_read INT DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS subscribers(id INTEGER PRIMARY KEY, email TEXT UNIQUE, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX IF NOT EXISTS ix_app_status ON applications(status);
CREATE INDEX IF NOT EXISTS ix_book_status ON bookings(status);`);

// ---------- seed ----------
const P = [
['Programs Director','Founder & CEO','Runs day-to-day mentorship operations across all partner schools and keeps quality consistent.','Coordinate the three pillar Team Leaders and the subject-teaching programme;Approve session content and visit schedules;Ensure sessions follow the safeguarding policy;Chair debriefs and report to the Founder','Proven leadership;Organised, dependable and calm;Strong communication;Second year or above preferred'],
['School Partnerships & Liaison Officer','Programs Director',"The Hub's main contact with every partner school, from first meeting to follow-up.",'Pre-visit consultations with principals and counsellors;Agree dates, formats and focus areas;Coordinate visit-day logistics;Collect feedback and arrange follow-ups','Confident and professional with adults;Good at planning and follow-up;Comfortable with calls and email'],
['Team Leader — Academic Mentorship','Programs Director','Leads the study-skills, exam-pressure and subject-teaching content.','Design sessions on study habits, reading strategies and exam stress;Coordinate subject teaching and revision clinics;Brief and support mentors','Strong academic discipline;Passion for teaching;Education students encouraged'],
['Team Leader — Social & Life-Skills Mentorship','Programs Director','Leads content on peer pressure, relationships, emotions and substance-abuse awareness.','Design age-appropriate sessions with counsellors;Lead small-group conversations on sensitive topics;Uphold safeguarding','Mature, empathetic listener;Interest in psychology or counselling;Discreet and trustworthy'],
['Team Leader — Purpose & Leadership Mentorship','Programs Director','Leads content on identity, values, character, careers and youth leadership.','Design sessions on identity, values and careers;Prepare mentors to speak on purpose and service;Run leadership training for prefects on request','Leadership experience;Confident public speaker;Creative and inspiring'],
['Volunteer Mentors Coordinator','Programs Director','Recruits, trains and rosters mentors so every visit is well staffed.','Recruit and onboard each semester;Organise mentor-readiness training;Maintain the roster and records','Well connected on campus;Organised record-keeper;Encouraging and people-focused'],
['Communications & Partnerships Officer','Founder & CEO','Manages proposals, partner relationships and official materials.','Draft and send school proposals;Build relationships with partners and sponsors;Keep the brand consistent','Excellent written English;Professional and persuasive;Attention to detail'],
['Social Media Manager','Communications & Partnerships Officer','Tells the Young Minds story online and grows the community.','Run the official social pages;Plan a monthly content calendar;Cover visits within the media and consent policy;Report monthly growth','Creative, with Canva-level design skills;Basic photo and video editing;Never posts learners without consent',1],
['Monitoring, Evaluation & Feedback Officer','Founder & CEO','Tracks whether sessions work and turns feedback into improvements.','Run feedback forms after every visit;Compile school reports;Prepare the annual impact report','Analytical and good with Excel;Clear report writer'],
['Finance & Administration Officer','Founder & CEO','Keeps money and records transparent and accountable.','Manage session costs and receipts;Prepare termly financial summaries;Keep minutes and files','Honest and trustworthy;Careful with records;Basic bookkeeping'],
['Volunteer Mentors & Subject Teachers','Volunteer Mentors Coordinator','Deliver mentorship talks and subject lessons in partner schools; several places available.','Facilitate sessions under the three pillars;Teach or run revision clinics in strong subjects;Follow the Training Manual and safeguarding policy','Caring, reliable role model;Willing to complete mentor training;Able to obtain a Certificate of Good Conduct']];
if (!db.prepare('SELECT COUNT(*) c FROM positions').get().c) P.forEach((p, i) => db.prepare('INSERT INTO positions(slug,title,reports_to,summary,responsibilities,requirements,is_new,sort_order) VALUES(?,?,?,?,?,?,?,?)').run(p[0].toLowerCase().replace(/[^a-z0-9]+/g, '-'), p[0], p[1], p[2], JSON.stringify(p[3].split(';')), JSON.stringify(p[4].split(';')), p[5] || 0, i + 1));
for (const [k, v] of Object.entries({ applications_open: 'true', applications_deadline: '', stat_schools: '0', stat_learners: '0', stat_mentors: '0' })) db.prepare('INSERT OR IGNORE INTO settings VALUES(?,?)').run(k, v);

// ---------- auth ----------
const b64u = b => Buffer.from(b).toString('base64url');
const hash = pw => { const s = crypto.randomBytes(16); return `scrypt$${s.toString('base64')}$${crypto.scryptSync(pw, s, 64).toString('base64')}`; };
const check = (pw, st) => { const [, s, h] = st.split('$'); const a = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64), b = Buffer.from(h, 'base64'); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const sign = o => { const d = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify(o)); return d + '.' + crypto.createHmac('sha256', SECRET).update(d).digest('base64url'); };
const verify = t => { try { const [h, p, s] = t.split('.'); const e = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest(); const g = Buffer.from(s, 'base64url'); if (e.length !== g.length || !crypto.timingSafeEqual(e, g)) return null; const o = JSON.parse(Buffer.from(p, 'base64url')); return o.exp > Date.now() / 1000 ? o : null; } catch { return null; } };
if (E.ADMIN_EMAIL && E.ADMIN_PASSWORD && !db.prepare('SELECT 1 FROM admins WHERE email=?').get(E.ADMIN_EMAIL.toLowerCase()))
  db.prepare('INSERT INTO admins(email,password_hash,name) VALUES(?,?,?)').run(E.ADMIN_EMAIL.toLowerCase(), hash(E.ADMIN_PASSWORD), 'Otonde Michael');

// ---------- helpers ----------
const LEVELS = ['Upper primary', 'Junior school', 'Senior school / secondary'];
const FORMATS = ['Assembly talk', 'Class sessions', 'Small groups', 'Revision clinic / subject teaching', 'Not sure yet'];
const FOCUS = ['Academics & exams', 'Study & reading skills', 'Peer pressure', 'Drugs & substances', 'Mental health & emotions', 'Relationships', 'Careers & subject choice', 'Leadership', 'Subject teaching'];
const setting = k => db.prepare('SELECT value FROM settings WHERE key=?').get(k)?.value ?? '';
const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const appsOpen = () => setting('applications_open') === 'true' && !(setting('applications_deadline') && today() >= setting('applications_deadline'));
const pos = r => ({ id: r.id, slug: r.slug, title: r.title, reportsTo: r.reports_to, summary: r.summary, responsibilities: JSON.parse(r.responsibilities), requirements: JSON.parse(r.requirements), isOpen: !!r.is_open, isNew: !!r.is_new, sortOrder: r.sort_order });
const RE = { email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, phone: /^\+?[0-9 ()-]{9,20}$/, url: /^https?:\/\//i, date: /^\d{4}-\d{2}-\d{2}$/ };
class HttpErr extends Error { constructor(s, m, errors) { super(m); this.s = s; this.errors = errors; } }
function validate(b, rules) {
  const out = {}, errors = {};
  for (const [f, r] of Object.entries(rules)) {
    let v = b[f]; if (typeof v === 'string') v = v.trim();
    if (r.arr) { v = Array.isArray(v) ? v : []; if (r.req && !v.length) errors[f] = 'Select at least one.'; else if (v.some(x => !r.arr.includes(x))) errors[f] = 'Invalid choice.'; out[f] = v; continue; }
    if (v === undefined || v === null || v === '') { if (r.req) errors[f] = 'This field is required.'; out[f] = r.int ? null : ''; continue; }
    if (r.int) { v = Number(v); if (!Number.isInteger(v) || v < (r.min ?? 1) || v > (r.max ?? 1e9)) errors[f] = 'Enter a valid number.'; }
    else { v = String(v); if (r.email) v = v.toLowerCase(); if (r.max && v.length > r.max) errors[f] = `Max ${r.max} characters.`; if (r.min && v.length < r.min) errors[f] = `At least ${r.min} characters.`; if (r.re && !RE[r.re].test(v)) errors[f] = 'Enter a valid value.'; if (r.in && !r.in.includes(v)) errors[f] = 'Invalid choice.'; }
    out[f] = v;
  }
  if (Object.keys(errors).length) throw new HttpErr(422, 'Please correct the highlighted fields.', errors);
  return out;
}
const hits = new Map();
const limited = (k, max) => { const n = Date.now(), e = hits.get(k); if (!e || e.t < n) { hits.set(k, { t: n + 15 * 60e3, c: 1 }); return false; } return ++e.c > max; };
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.t < n) hits.delete(k); }, 60e3).unref();
const csv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

// ---------- routes ----------
const routes = [];
const R = (m, p, fn, o = {}) => routes.push({ m, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, ...o });
const F = { form: 1 }, A = { auth: 1 };

R('GET', '/api/health', () => ({ ok: true, time: new Date().toISOString() }));
R('GET', '/api/site', () => ({ applicationsOpen: appsOpen(), applicationsDeadline: setting('applications_deadline') || null, openPositions: db.prepare('SELECT COUNT(*) c FROM positions WHERE is_open=1').get().c, stats: { schools: +setting('stat_schools'), learners: +setting('stat_learners'), mentors: +setting('stat_mentors') }, options: { levels: LEVELS, formats: FORMATS, focusAreas: FOCUS } }));
R('GET', '/api/positions', () => ({ positions: db.prepare('SELECT * FROM positions WHERE is_open=1 ORDER BY sort_order').all().map(pos) }));
R('POST', '/api/subscribe', c => { if (c.body.website) return [201, { ok: true }]; const { email } = validate(c.body, { email: { req: 1, re: 'email', max: 160, email: 1 } }); db.prepare('INSERT OR IGNORE INTO subscribers(email) VALUES(?)').run(email); return [201, { ok: true, message: 'Thanks for subscribing!' }]; }, F);
R('POST', '/api/messages', c => { if (c.body.website) return [201, { ok: true }]; const v = validate(c.body, { name: { req: 1, max: 120 }, email: { req: 1, re: 'email', max: 160, email: 1 }, subject: { req: 1, max: 160 }, message: { req: 1, min: 10, max: 5000 } }); db.prepare('INSERT INTO messages(name,email,subject,message) VALUES(?,?,?,?)').run(v.name, v.email, v.subject, v.message); return [201, { ok: true, message: 'Thank you for reaching out! We will reply by email soon.' }]; }, F);
R('POST', '/api/bookings', c => {
  if (c.body.website) return [201, { ok: true }];
  const v = validate(c.body, { schoolName: { req: 1, max: 160 }, county: { req: 1, max: 80 }, contactName: { req: 1, max: 120 }, contactRole: { req: 1, max: 120 }, email: { req: 1, re: 'email', max: 160, email: 1 }, phone: { req: 1, re: 'phone' }, levels: { req: 1, arr: LEVELS }, learners: { int: 1, max: 5000 }, format: { req: 1, in: FORMATS }, focusAreas: { req: 1, arr: FOCUS }, preferredDate: { re: 'date' }, notes: { max: 3000 } });
  const r = db.prepare('INSERT INTO bookings(school_name,county,contact_name,contact_role,email,phone,levels,learners,format,focus_areas,preferred_date,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(v.schoolName, v.county, v.contactName, v.contactRole, v.email, v.phone, JSON.stringify(v.levels), v.learners, v.format, JSON.stringify(v.focusAreas), v.preferredDate || null, v.notes);
  return [201, { ok: true, id: +r.lastInsertRowid, message: `Thank you! Your request for ${v.schoolName} has been received. Our Liaison Officer will contact you within 5 working days.` }];
}, F);
R('POST', '/api/applications', c => {
  if (c.body.website) return [201, { ok: true }];
  if (!appsOpen()) throw new HttpErr(403, 'Applications are currently closed.');
  const v = validate(c.body, { fullName: { req: 1, max: 120 }, email: { req: 1, re: 'email', max: 160, email: 1 }, phone: { req: 1, re: 'phone' }, course: { req: 1, max: 160 }, yearOfStudy: { req: 1, in: ['1', '2', '3', '4', '5', 'Postgraduate'] }, positionId: { req: 1, int: 1 }, secondChoiceId: { int: 1 }, motivation: { req: 1, min: 150, max: 5000 }, cvLink: { re: 'url', max: 500 }, portfolioLink: { re: 'url', max: 500 } });
  if (c.body.agree !== true) throw new HttpErr(422, 'Please correct the highlighted fields.', { agree: 'You must agree to continue.' });
  const p = db.prepare('SELECT * FROM positions WHERE id=? AND is_open=1').get(v.positionId);
  if (!p) throw new HttpErr(422, 'Please correct the highlighted fields.', { positionId: 'Choose an open position.' });
  const sc = v.secondChoiceId && db.prepare('SELECT id FROM positions WHERE id=? AND is_open=1').get(v.secondChoiceId)?.id;
  if (db.prepare("SELECT 1 FROM applications WHERE email=? AND position_id=? AND created_at>datetime('now','-30 days')").get(v.email, p.id)) throw new HttpErr(409, 'You have already applied for this position. We will be in touch.');
  const r = db.prepare('INSERT INTO applications(full_name,email,phone,course,year_of_study,position_id,second_choice_id,motivation,cv_link,portfolio_link) VALUES(?,?,?,?,?,?,?,?,?,?)').run(v.fullName, v.email, v.phone, v.course, v.yearOfStudy, p.id, sc || null, v.motivation, v.cvLink || null, v.portfolioLink || null);
  return [201, { ok: true, id: +r.lastInsertRowid, message: `Thank you, ${v.fullName.split(' ')[0]}! Your application for ${p.title} has been received.` }];
}, F);
R('POST', '/api/auth/login', c => {
  const a = db.prepare('SELECT * FROM admins WHERE email=?').get(String(c.body.email || '').trim().toLowerCase());
  const ok = a ? check(String(c.body.password || ''), a.password_hash) : (check('x', hash('y')), false);
  if (!ok) throw new HttpErr(401, 'Incorrect email or password.');
  const now = Math.floor(Date.now() / 1000);
  return { token: sign({ sub: a.id, email: a.email, name: a.name, iat: now, exp: now + TTL }), admin: { email: a.email, name: a.name } };
}, { login: 1 });
R('GET', '/api/auth/me', c => ({ admin: { email: c.user.email, name: c.user.name } }), A);
R('POST', '/api/auth/password', c => {
  const { currentPassword: cp, newPassword: np } = c.body; const a = db.prepare('SELECT * FROM admins WHERE id=?').get(c.user.sub);
  if (!check(String(cp || ''), a.password_hash)) throw new HttpErr(401, 'Current password is incorrect.');
  if (typeof np !== 'string' || np.length < 10) throw new HttpErr(422, 'New password must be at least 10 characters.');
  db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hash(np), a.id); return { ok: true };
}, A);

const appRow = r => ({ id: r.id, fullName: r.full_name, email: r.email, phone: r.phone, course: r.course, yearOfStudy: r.year_of_study, positionId: r.position_id, positionTitle: r.position_title, secondChoiceTitle: r.second_title, motivation: r.motivation, cvLink: r.cv_link, portfolioLink: r.portfolio_link, status: r.status, adminNotes: r.admin_notes, createdAt: r.created_at });
function appList(q) {
  const w = [], a = [];
  if (q.status) { w.push('a.status=?'); a.push(q.status); }
  if (q.position) { w.push('a.position_id=?'); a.push(+q.position); }
  if (q.q) { w.push('(a.full_name LIKE ? OR a.email LIKE ? OR a.course LIKE ?)'); a.push(...Array(3).fill(`%${q.q}%`)); }
  return db.prepare(`SELECT a.*,p.title position_title,s.title second_title FROM applications a JOIN positions p ON p.id=a.position_id LEFT JOIN positions s ON s.id=a.second_choice_id ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY a.id DESC`).all(...a).map(appRow);
}
R('GET', '/api/admin/summary', () => {
  const n = (t, w) => db.prepare(`SELECT COUNT(*) c FROM ${t} ${w ? 'WHERE ' + w : ''}`).get().c;
  return { applications: { total: n('applications'), new: n('applications', "status='new'") }, bookings: { total: n('bookings'), new: n('bookings', "status='new'"), scheduled: n('bookings', "status='scheduled'") }, messages: { total: n('messages'), unread: n('messages', 'is_read=0') }, subscribers: n('subscribers'),
    byPosition: db.prepare('SELECT p.title, COUNT(a.id) applications FROM positions p LEFT JOIN applications a ON a.position_id=p.id GROUP BY p.id ORDER BY p.sort_order').all().map(r => ({ title: r.title, applications: r.applications })),
    recent: db.prepare("SELECT * FROM (SELECT 'application' type, full_name title, created_at FROM applications UNION ALL SELECT 'booking', school_name, created_at FROM bookings UNION ALL SELECT 'message', subject, created_at FROM messages) ORDER BY created_at DESC LIMIT 8").all().map(r => ({ ...r })) };
}, A);
R('GET', '/api/admin/applications', c => ({ applications: appList(c.query) }), A);
R('GET', '/api/admin/applications.csv', c => {
  const cols = ['id', 'fullName', 'email', 'phone', 'course', 'yearOfStudy', 'positionTitle', 'secondChoiceTitle', 'status', 'cvLink', 'portfolioLink', 'motivation', 'adminNotes', 'createdAt'];
  return { raw: '\ufeff' + [cols.join(','), ...appList(c.query).map(r => cols.map(k => csv(r[k])).join(','))].join('\r\n'), type: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': 'attachment; filename="applications.csv"' } };
}, A);
const patcher = (table, statuses) => c => {
  const r = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(+c.params.id); if (!r) throw new HttpErr(404, 'Not found.');
  if (c.body.status !== undefined && !statuses.includes(c.body.status)) throw new HttpErr(422, 'Invalid status.', { status: 'Invalid status.' });
  db.prepare(`UPDATE ${table} SET status=?,admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(c.body.status ?? r.status, String(c.body.adminNotes ?? r.admin_notes).slice(0, 5000), r.id);
  return { ok: true, ...db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(r.id) };
};
const remover = table => c => { if (!db.prepare(`DELETE FROM ${table} WHERE id=?`).run(+c.params.id).changes) throw new HttpErr(404, 'Not found.'); return { ok: true }; };
R('PATCH', '/api/admin/applications/:id', patcher('applications', ['new', 'shortlisted', 'interview', 'accepted', 'declined']), A);
R('DELETE', '/api/admin/applications/:id', remover('applications'), A);
R('GET', '/api/admin/bookings', c => ({ bookings: db.prepare(`SELECT * FROM bookings ${c.query.status ? 'WHERE status=?' : ''} ORDER BY id DESC`).all(...(c.query.status ? [c.query.status] : [])).map(r => ({ ...r, levels: JSON.parse(r.levels), focus_areas: JSON.parse(r.focus_areas) })) }), A);
R('PATCH', '/api/admin/bookings/:id', patcher('bookings', ['new', 'contacted', 'scheduled', 'completed', 'cancelled']), A);
R('DELETE', '/api/admin/bookings/:id', remover('bookings'), A);
R('GET', '/api/admin/messages', () => ({ messages: db.prepare('SELECT * FROM messages ORDER BY id DESC').all().map(r => ({ ...r })) }), A);
R('PATCH', '/api/admin/messages/:id', c => { db.prepare('UPDATE messages SET is_read=? WHERE id=?').run(c.body.isRead ? 1 : 0, +c.params.id); return { ok: true }; }, A);
R('DELETE', '/api/admin/messages/:id', remover('messages'), A);
R('GET', '/api/admin/subscribers', () => ({ subscribers: db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all().map(r => ({ ...r })) }), A);
R('GET', '/api/admin/positions', () => ({ positions: db.prepare('SELECT p.*,(SELECT COUNT(*) FROM applications WHERE position_id=p.id) n FROM positions p ORDER BY sort_order').all().map(r => ({ ...pos(r), applicationCount: r.n })) }), A);
const lines = v => Array.isArray(v) ? v : String(v || '').split('\n').map(s => s.trim()).filter(Boolean);
R('POST', '/api/admin/positions', c => {
  const v = validate(c.body, { title: { req: 1, max: 160 }, reportsTo: { req: 1, max: 160 }, summary: { req: 1, max: 1000 } });
  const r = db.prepare('INSERT INTO positions(slug,title,reports_to,summary,responsibilities,requirements,is_open,is_new,sort_order) VALUES(?,?,?,?,?,?,?,?,?)').run(v.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36), v.title, v.reportsTo, v.summary, JSON.stringify(lines(c.body.responsibilities)), JSON.stringify(lines(c.body.requirements)), c.body.isOpen === false ? 0 : 1, c.body.isNew ? 1 : 0, +c.body.sortOrder || 0);
  return [201, { ok: true, id: +r.lastInsertRowid }];
}, A);
R('PATCH', '/api/admin/positions/:id', c => {
  const r = db.prepare('SELECT * FROM positions WHERE id=?').get(+c.params.id); if (!r) throw new HttpErr(404, 'Not found.'); const b = c.body;
  db.prepare('UPDATE positions SET title=?,reports_to=?,summary=?,responsibilities=?,requirements=?,is_open=?,is_new=?,sort_order=? WHERE id=?').run(b.title ?? r.title, b.reportsTo ?? r.reports_to, b.summary ?? r.summary, 'responsibilities' in b ? JSON.stringify(lines(b.responsibilities)) : r.responsibilities, 'requirements' in b ? JSON.stringify(lines(b.requirements)) : r.requirements, 'isOpen' in b ? +!!b.isOpen : r.is_open, 'isNew' in b ? +!!b.isNew : r.is_new, 'sortOrder' in b ? +b.sortOrder || 0 : r.sort_order, r.id);
  return { ok: true };
}, A);
R('DELETE', '/api/admin/positions/:id', c => { if (db.prepare('SELECT 1 FROM applications WHERE position_id=? OR second_choice_id=?').get(+c.params.id, +c.params.id)) throw new HttpErr(409, 'This position has applications. Close it instead of deleting it.'); return remover('positions')(c); }, A);
R('GET', '/api/admin/settings', () => ({ applicationsOpen: setting('applications_open') === 'true', applicationsDeadline: setting('applications_deadline'), stats: { schools: +setting('stat_schools'), learners: +setting('stat_learners'), mentors: +setting('stat_mentors') } }), A);
R('PUT', '/api/admin/settings', c => {
  const b = c.body, up = (k, v) => db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));
  if (b.applicationsDeadline && !RE.date.test(b.applicationsDeadline)) throw new HttpErr(422, 'Invalid date.', { applicationsDeadline: 'Use YYYY-MM-DD.' });
  if ('applicationsOpen' in b) up('applications_open', !!b.applicationsOpen);
  if ('applicationsDeadline' in b) up('applications_deadline', b.applicationsDeadline || '');
  for (const k of ['schools', 'learners', 'mentors']) if (b.stats && k in b.stats) { const n = Number(b.stats[k]); if (!Number.isInteger(n) || n < 0) throw new HttpErr(422, 'Stats must be whole numbers ≥ 0.'); up('stat_' + k, n); }
  return { ok: true };
}, A);

// ---------- http ----------
const PAGES = { '/': ['home', 'Home', 'Real talk. Real tools. Real impact. University students mentoring learners in Kenyan schools.'], '/about': ['about', 'About', 'A near-peer voice in Kenyan schools.'], '/programs': ['programs', 'What we do', 'Academic, life-skills, leadership mentorship and subject teaching.'], '/team': ['team', 'Our team', 'Meet the volunteers behind Young Minds.'], '/gallery': ['gallery', 'Gallery', 'Moments from our school visits.'], '/get-involved': ['get-involved', 'Get involved', 'Voluntary roles for university students.'], '/book': ['book', 'Book a session', 'Book a mentorship session for your learners.'], '/contact': ['contact', 'Contact', 'Get in touch with Young Minds Mentorship Hub.'] };
const shell = (key, title, desc, body = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Young Minds Mentorship Hub</title><meta name="description" content="${desc}"><meta property="og:title" content="${title} | Young Minds Mentorship Hub"><meta property="og:description" content="${desc}"><meta property="og:image" content="/assets/team.jpg"><link rel="icon" href="/assets/favicon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/styles.css"></head><body data-page="${key}"><a class="skip" href="#main">Skip to content</a><header id="hdr"></header><main id="main">${body}</main><footer id="ftr"></footer><script type="module" src="/js/main.js"></script></body></html>`;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" };
const send = (res, s, body, type, extra = {}) => { res.writeHead(s, { ...SEC, 'Content-Type': type, ...extra }); res.end(body); };
const readBody = req => new Promise((ok, no) => { let n = 0; const ch = []; req.on('data', d => { n += d.length; if (n > 102400) { no(new HttpErr(413, 'Request too large.')); req.destroy(); } else ch.push(d); }); req.on('end', () => ok(Buffer.concat(ch).toString())); req.on('error', no); });
const ip = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;

const server = http.createServer(async (req, res) => {
  const t0 = Date.now(), url = new URL(req.url, 'http://x'), p = url.pathname.replace(/(.)\/$/, '$1');
  if (p.startsWith('/api/')) {
    let s = 200;
    try {
      const hit = routes.find(r => r.m === req.method && r.re.test(p));
      if (!hit) { s = routes.some(r => r.re.test(p)) ? 405 : 404; throw new HttpErr(s, s === 404 ? 'Unknown endpoint.' : 'Method not allowed.'); }
      const c = { query: Object.fromEntries(url.searchParams), body: {}, params: hit.re.exec(p).groups || {} };
      if (hit.auth) { const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''); c.user = m && verify(m[1]); if (!c.user) throw new HttpErr(401, 'Please log in.'); }
      if (hit.form && limited('f' + ip(req), 10)) throw new HttpErr(429, 'Too many submissions. Please try again later.');
      if (hit.login && limited('l' + ip(req), 8)) throw new HttpErr(429, 'Too many attempts. Please try again later.');
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!(req.headers['content-type'] || '').includes('application/json')) throw new HttpErr(415, 'Content-Type must be application/json.');
        const raw = await readBody(req); try { c.body = raw ? JSON.parse(raw) : {}; } catch { throw new HttpErr(400, 'Invalid JSON.'); }
      }
      const out = hit.fn(c), [st, body] = Array.isArray(out) ? out : [200, out];
      s = st;
      if (body.raw !== undefined) send(res, s, body.raw, body.type, { 'Cache-Control': 'no-store', ...body.headers });
      else send(res, s, JSON.stringify(body), 'application/json', { 'Cache-Control': 'no-store' });
    } catch (e) {
      s = e instanceof HttpErr ? e.s : 500; if (s === 500) console.error(e);
      if (!res.headersSent) send(res, s, JSON.stringify({ error: s === 500 ? 'Something went wrong.' : e.message, ...(e.errors && { errors: e.errors }) }), 'application/json', { 'Cache-Control': 'no-store' });
    }
    console.log(req.method, p, s, Date.now() - t0 + 'ms'); return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, 'Method not allowed', 'text/plain');
  if (PAGES[p]) { const [k, t, d] = PAGES[p]; return send(res, 200, shell(k, t, d), MIME['.html'], { 'Cache-Control': 'no-cache' }); }
  const pub = path.join(root, 'public');
  const f = path.normalize(path.join(pub, p === '/admin' ? '/admin/index.html' : p));
  const bad = !f.startsWith(pub + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory();
  if (bad) return send(res, 404, shell('404', 'Page not found', 'Page not found.', '<section class="wrap" style="padding:80px 0"><h1>Page not found</h1><p><a class="btn" href="/">Back home</a></p></section>'), MIME['.html']);
  const ext = path.extname(f);
  send(res, 200, req.method === 'HEAD' ? '' : fs.readFileSync(f), MIME[ext] || 'application/octet-stream', { 'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=86400' });
});
server.listen(PORT, () => console.log(`Young Minds Mentorship Hub running at http://localhost:${PORT}`));
