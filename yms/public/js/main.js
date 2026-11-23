const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = (p, o) => fetch(p, o).then(r => r.json().then(j => ({ ok: r.ok, status: r.status, ...j })));
const page = document.body.dataset.page;
const NAV = [['/', 'Home'], ['/about', 'About'], ['/programs', 'What we do'], ['/team', 'Our team'], ['/gallery', 'Gallery'], ['/get-involved', 'Get involved'], ['/contact', 'Contact']];
const path = location.pathname.replace(/(.)\/$/, '$1');
$('#hdr').innerHTML = `<div class="wrap bar"><a class="brand" href="/"><img src="/assets/logo.jpg" width="52" height="52" alt="Young Minds logo"><span><b>YOUNG MINDS</b><small>MENTORSHIP HUB</small></span></a>
<button class="burger" aria-expanded="false" aria-controls="nav" aria-label="Menu"><i></i><i></i><i></i></button>
<nav id="nav">${NAV.map(([h, t]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ''}>${t}</a>`).join('')}<a class="btn sm" href="/book">Book a session</a></nav></div>`;
$('.burger').onclick = e => { const o = $('#nav').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); };
const year = new Date().getFullYear();
$('#ftr').innerHTML = `<div class="wrap grid"><div><a class="brand" href="/"><img src="/assets/logo.jpg" width="52" height="52" alt=""></a><p>Real conversations. Real impact. University students mentoring and teaching young Kenyans.</p></div>
<div><h3>Explore</h3><ul>${NAV.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>
<div><h3>Take action</h3><ul><li><a href="/book">Book a school session</a></li><li><a href="/get-involved#positions">Open positions</a></li><li><a href="/get-involved#apply">Apply to volunteer</a></li><li><a href="/contact">Partner with us</a></li></ul></div>
<div><h3>Stay updated</h3><form data-endpoint="/api/subscribe"><label for="sub" class="hint">Email address</label><input id="sub" name="email" type="email" required autocomplete="email"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn yel sm" type="submit">Subscribe</button><div class="form-status" role="status" aria-live="polite" hidden></div></form></div></div>
<div class="strip"><div class="wrap"><a href="tel:+254741050074">0741 050 074</a><a href="mailto:youngmindsmentorshiphub@gmail.com">youngmindsmentorshiphub@gmail.com</a><span>Nairobi, Kenya</span></div></div>
<p class="copy">© ${year} Young Minds Mentorship Hub · A student-led social impact initiative</p>`;

const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hero = (t, s) => `<section class="hero"><div class="wrap"><h1>${t}</h1>${s ? `<p class="lead nv">${s}</p>` : ''}</div></section>`;
const cta = (h, p, b = 'Book a session', l = '/book') => `<div class="wrap"><div class="cta fade"><h2>${h}</h2>${p ? `<p>${p}</p>` : ''}<a class="btn yel" href="${l}">${b}</a></div></div>`;
const arch = () => `<div><div class="arch"><img data-slot="founder_portrait" src="/assets/founder.jpg" width="380" height="475" alt="Otonde Michael, CEO and Founder"></div><div class="center"><span class="tag"><b>Otonde Michael</b><br>CEO &amp; Founder</span></div></div>`;
const ticks = a => `<ul class="ticks">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
const pillars = [['Academic mentorship', 'Study habits, reading strategies, goal-setting, exam confidence, subject and pathway choice.'], ['Social & life skills', 'Peer pressure, relationships, self-esteem, emotions, drugs and substance abuse, decision-making.'], ['Purpose & leadership', 'Identity, values, character, careers, giving back.'], ['Subject teaching', 'Volunteer lessons and revision clinics in Mathematics, English, Kiswahili, Sciences, Humanities, Business and Computer Studies, using the "I do, we do, you do" method.']];
const pillarCards = () => `<div class="grid">${pillars.map(([t, d]) => `<div class="card pillar fade"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>`;
const posCard = p => `<div class="card"><h3>${esc(p.title)} ${p.isNew ? '<span class="chip new">New</span>' : ''}</h3><p class="hint">Reports to ${esc(p.reportsTo)} · Voluntary</p></div>`;
const fieldHtml = (n, l, t = 'text', extra = '') => `<div class="field"><label for="${n}">${l}</label><input id="${n}" name="${n}" type="${t}" ${extra}><div class="error"></div></div>`;
const group = (n, l, items, type) => `<fieldset class="field"><legend>${l}</legend>${items.map(i => `<label class="opt"><input type="${type}" name="${n}" value="${esc(i)}" ${type === 'radio' && n === 'format' ? 'required' : ''}>${esc(i)}</label>`).join('')}<div class="error"></div></fieldset>`;
const status = '<div class="form-status" role="status" aria-live="polite" hidden></div>';
const hp = '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';

const site = (await api('/api/site')).ok ? await api('/api/site') : { stats: {}, options: { levels: [], formats: [], focusAreas: [] } };
const { positions } = ['home', 'get-involved'].includes(page) ? await api('/api/positions') : { positions: [] };
const main = $('#main');

const PAGE = {
  home: () => {
    const st = site.stats, show = st.schools > 0 || st.learners > 0 || st.mentors > 0;
    return `<section class="hero"><div class="wrap two"><div><span class="kicker">Now visiting schools in Kenya</span><h1>Real talk.<br>Real tools.<br><span class="nv">Real impact.</span></h1><p class="lead nv">University students mentoring and teaching learners in schools, on the academic, social and personal challenges of growing up.</p>
<p><a class="btn" href="/book">Book a session for your school</a> <a class="btn outline" href="/get-involved">Volunteer with us</a></p><ul class="badges"><li>Near-peer mentors</li><li>No judgement</li><li>Tailored to each school</li></ul></div>${arch()}</div></section>
${show ? `<section class="wrap sec stats"><div class="grid g3"><div class="card"><b>${st.schools}</b>Schools reached</div><div class="card"><b>${st.learners}</b>Learners mentored</div><div class="card"><b>${st.mentors}</b>Trained mentors</div></div></section>` : ''}
<section class="sec dark"><div class="wrap"><span class="kicker y">Why we exist</span><h2>Students carry more than school bags <span class="hl">into class.</span></h2><p class="lead">Schools are strong on academics but stretched thin on life skills and emotional support. We step into that gap.</p>
<div class="grid">${['Mental-health strain with limited counselling time.', 'Early substance use: tobacco as young as 10; alcohol, bhang and khat in the early teens.', 'Disrupted schooling affecting girls (teen pregnancy, dropout).', 'The life-skills gap: strong exam focus, little time for resilience, careers and peer pressure.'].map(t => `<div class="card">${t}</div>`).join('')}</div></div></section>
<section class="sec"><div class="wrap center"><h2>Four ways we support learners</h2><p class="lead">Every visit is designed with the school's guidance &amp; counselling department around what its learners need this term.</p>${pillarCards()}<p><a class="btn" href="/programs">Explore our programmes</a></p></div></section>
<section class="sec grey"><div class="wrap"><h2 class="center">From first call to follow-up</h2><ol class="steps">${[['Request a session', 'Tell us about your school and learners.'], ['Consultation', 'We meet the principal and counsellors.'], ['Tailored content design', 'Content is shaped around your learners.'], ['Delivery', 'Trained, vetted mentors run the session.'], ['Feedback', 'Learners and teachers respond; you get a short report.'], ['Follow-up', 'We return through the term.']].map(([t, d]) => `<li><b>${t}</b><br>${d}</li>`).join('')}</ol></div></section>
<section class="sec"><div class="wrap two"><img data-slot="founder_speaking" src="/assets/founder-speaking.jpg" width="600" height="450" alt="Otonde Michael speaking" loading="lazy" style="border:8px solid var(--navy);border-radius:28px"><div><h2>Otonde Michael</h2><p class="lead">CEO &amp; Founder · Congressman, Kenyatta University Student Leadership</p><p>Otonde currently serves as a Congressman in Kenyatta University Student Leadership and was formerly the Delegate for the School of Education. He previously held school talks in Nairobi through the Modini Youth Foundation.</p><a class="btn" href="/about">Read our story</a></div></div></section>
<section class="sec yellow"><div class="wrap"><div class="two"><img data-slot="team_photo" src="/assets/team.jpg" width="600" height="400" alt="The Young Minds team" loading="lazy" style="border-radius:18px"><div><h2>We're recruiting volunteers</h2><p>${site.openPositions} voluntary roles are open for university students who want to mentor, teach and lead.</p><p><b>${site.applicationsOpen ? (site.applicationsDeadline ? 'Apply before ' + fmtDate(site.applicationsDeadline) + '.' : 'Applications are open on a rolling basis.') : 'Applications are currently closed.'}</b></p><a class="btn" href="/get-involved#positions">See open positions</a></div></div><div class="grid g3" style="margin-top:32px">${positions.slice(0, 3).map(posCard).join('')}</div></div></section>
${cta('Bring real talk to your school', 'Assembly talks, class sessions, small groups and revision clinics, shaped around your learners.')}`;
  },
  about: () => `${hero('A near-peer voice in Kenyan schools')}
<section class="sec wrap two"><div><h2>Who we are</h2><p>Young Minds Mentorship Hub is a student-led mentorship organisation. University students and young leaders, mainly from Kenyatta University, visit primary and secondary schools in Kenya for honest, practical, near-peer conversations with learners. They also volunteer to teach subjects.</p></div><img data-slot="team_photo" src="/assets/team.jpg" width="600" height="400" alt="The Young Minds team" loading="lazy" style="border-radius:18px"></section>
<section class="wrap grid g2"><div class="card" style="background:var(--yellow)"><h2>Vision</h2><p>A generation of Kenyan students who leave school not just academically prepared, but emotionally resilient, values-grounded and confident in who they are.</p></div><div class="card" style="background:var(--navy);color:#fff"><h2>Mission</h2><p>To bring consistent, honest, near-peer mentorship into schools, reinforcing the work of guidance and counselling departments with real conversations on academics, life skills and purpose.</p></div></section>
<section class="sec wrap"><h2>Core values</h2><div class="grid g3">${[['Trust', "We earn students' openness before we offer them advice."], ['Partnership', 'We work with school administrations and counsellors, never around them.'], ['Relevance', 'Every talk is tailored to the specific school and student group.'], ['Integrity', 'No commercial motive; impact is the only agenda.'], ['Consistency', 'Ongoing relationships with schools, not one-off visits.'], ['Safety', 'Vetted, trained mentors who follow a written safeguarding policy.']].map(([t, d]) => `<div class="card fade"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>
<section class="sec grey"><div class="wrap two">${arch()}<div><h2>Otonde Michael</h2><p>Otonde is a Congressman in Kenyatta University Student Leadership and was formerly the Delegate for the School of Education. He held school talks in Nairobi through the Modini Youth Foundation. He sets the Hub's vision, represents it, and leads flagship sessions.</p></div></div></section>
<section class="sec wrap"><h2>What makes us different</h2><div class="grid g3">${['Near-peer credibility', 'Evidence-led', 'Partner not replace', 'Tailored not generic', 'Track record', 'Purpose not profit'].map(t => `<div class="card fade"><h3>${t}</h3></div>`).join('')}</div></section>${cta('Bring real talk to your school')}`,
  programs: () => `${hero('Mentorship that meets learners where they are')}
<section class="sec wrap"><div class="grid g2">${pillars.map(([t, d]) => `<div class="card pillar"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>
<section class="sec grey"><div class="wrap"><h2>Session formats</h2><div class="grid">${[['Assembly talk', '30–45 minutes'], ['Class sessions', '40 minutes'], ['Small groups', '10–15 learners'], ['Revision clinics', 'Subject teaching']].map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
<section class="sec wrap"><h2>Topics by level</h2><div class="grid g3"><div class="card"><h3>Upper primary</h3>${ticks(['Self-esteem and friendship', 'Study habits', 'Staying safe'])}</div><div class="card"><h3>Junior school</h3>${ticks(['Peer pressure', 'Emotions and relationships', 'Subject pathways'])}</div><div class="card"><h3>Senior school</h3>${ticks(['Exam confidence', 'Substance abuse awareness', 'Careers and purpose'])}</div></div>
<div class="notice soft"><h3>Safe by design</h3><p>Trained, vetted mentors work in pairs, a teacher is present, and a written report follows each visit.</p></div></section>${cta('Ready to book?')}`,
  team: () => `${hero('The volunteers behind Young Minds')}
<section class="sec wrap"><img data-slot="team_photo" src="/assets/team.jpg" width="1180" height="600" alt="The Young Minds team" style="border-radius:18px;width:100%"><p>${['Mentors', 'Subject teachers', 'Role models', 'Future educators'].map(c => `<span class="chip">${c}</span> `).join('')}</p></section>
<section class="sec grey"><div class="wrap two">${arch()}<div><h2>Leadership</h2><p>Founder &amp; CEO, Programs Director, three pillar Team Leaders, School Partnerships &amp; Liaison Officer, Volunteer Mentors Coordinator, and officers for Communications, Social Media, Monitoring &amp; Evaluation and Finance.</p>${ticks(['One named contact per school', 'Every session approved and reviewed', 'Every role has a trained deputy'])}</div></div></section>
${cta('Want to join us?', `${site.openPositions} voluntary roles are open right now.`, 'See open positions', '/get-involved#positions')}`,
  'get-involved': () => {
    const open = site.applicationsOpen, opts = positions.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('');
    return `${hero('Lead. Mentor. Make a difference.')}<section class="sec wrap"><div class="notice"><h3>Please read: all positions are voluntary</h3><p>There is no salary, allowance or stipend attached to any role. We are looking for people whose motivation is intrinsic: you want to serve because you care about young people and believe in education, not for money or titles.</p></div>
<div class="grid g3"><div class="card"><h3>Real experience</h3><p>Leadership, facilitation, teaching and project skills for your CV.</p></div><div class="card"><h3>Recognition</h3><p>A certificate of service and recommendation letters.</p></div><div class="card"><h3>Purpose</h3><p>Help learners who stand where you stood.</p></div></div>
<h2 id="positions" style="margin-top:48px">Open positions</h2><p class="lead">Open to Kenyatta University students from all schools and years. School of Education students are especially encouraged.</p>
${positions.map(p => `<details><summary><span>${esc(p.title)} ${p.isNew ? '<span class="chip new">New</span>' : ''}<br><small class="hint">Reports to ${esc(p.reportsTo)} · Voluntary</small></span></summary><p>${esc(p.summary)}</p><h4>Key responsibilities</h4>${ticks(p.responsibilities)}<h4>Who we are looking for</h4>${ticks(p.requirements)}${open ? `<button class="btn sm" data-apply="${p.id}">Apply for this role</button>` : ''}</details>`).join('')}
<h2 id="apply" style="margin-top:48px">Apply</h2><p><b>${open ? (site.applicationsDeadline ? 'Applications open. Apply before ' + fmtDate(site.applicationsDeadline) + '.' : 'Applications are open on a rolling basis.') : 'Applications are currently closed. Follow us or subscribe below to hear when roles reopen.'}</b></p>
${open ? `<form data-endpoint="/api/applications" novalidate>${status}${fieldHtml('fullName', 'Full name', 'text', 'required maxlength=120')}${fieldHtml('email', 'Email', 'email', 'required')}${fieldHtml('phone', 'Phone', 'tel', 'required')}${fieldHtml('course', 'Course/programme', 'text', 'required')}
<div class="field"><label for="yearOfStudy">Year of study</label><select id="yearOfStudy" name="yearOfStudy" required><option value="">Select</option>${['1', '2', '3', '4', '5', 'Postgraduate'].map(y => `<option>${y}</option>`).join('')}</select><div class="error"></div></div>
<div class="field"><label for="positionId">First choice position</label><select id="positionId" name="positionId" required><option value="">Select</option>${opts}</select><div class="error"></div></div>
<div class="field"><label for="secondChoiceId">Second choice (optional)</label><select id="secondChoiceId" name="secondChoiceId"><option value="">None</option>${opts}</select><div class="error"></div></div>
<div class="field"><label for="motivation">Motivation</label><textarea id="motivation" name="motivation" rows="7" required minlength="150" maxlength="5000" placeholder="Why do you want this role, what will you bring, and what intrinsically motivates you to serve young people?"></textarea><div class="hint"><span id="cc">0</span>/5000 (minimum 150)</div><div class="error"></div></div>
${fieldHtml('cvLink', 'CV link (optional)', 'url')}<p class="hint">Google Drive link set to "anyone with the link can view".</p>${fieldHtml('portfolioLink', 'Portfolio link (optional)', 'url')}<p class="hint">Required for the Social Media Manager role.</p>
<div class="field"><label class="opt"><input type="checkbox" name="agree" data-single required>I understand this is an unpaid, voluntary role and that my motivation to serve is intrinsic. I agree to follow the Young Minds safeguarding policy and code of conduct.</label><div class="error"></div></div>${hp}<button class="btn" type="submit">Submit application</button></form>` : ''}</section>`;
  },
  book: () => `${hero('Book a session for your learners', 'Our Liaison Officer will contact you within 5 working days.')}<section class="sec wrap two"><div><h2>Simple, safe and tailored</h2>${ticks(['Tell us about your learners', 'We consult your counsellors', 'Trained, vetted mentors deliver'])}<div class="notice soft"><h3>Prefer to talk?</h3><p><a href="tel:+254741050074">0741 050 074</a><br><a href="mailto:youngmindsmentorshiphub@gmail.com">youngmindsmentorshiphub@gmail.com</a></p></div></div>
<form data-endpoint="/api/bookings" novalidate>${status}${fieldHtml('schoolName', 'School name', 'text', 'required')}${fieldHtml('county', 'County/sub-county', 'text', 'required')}${fieldHtml('contactName', 'Your name', 'text', 'required')}${fieldHtml('contactRole', 'Your role', 'text', 'required')}${fieldHtml('email', 'Email', 'email', 'required')}${fieldHtml('phone', 'Phone', 'tel', 'required')}
${group('levels', 'Level(s)', site.options.levels, 'checkbox')}${group('format', 'Preferred format', site.options.formats, 'radio')}${group('focusAreas', 'Focus areas', site.options.focusAreas, 'checkbox')}
${fieldHtml('learners', 'Approximate number of learners (optional)', 'number', 'min=1 max=5000')}${fieldHtml('preferredDate', 'Preferred date (optional)', 'date')}<div class="field"><label for="notes">Notes (optional)</label><textarea id="notes" name="notes" rows="4" maxlength="3000"></textarea><div class="error"></div></div>${hp}<button class="btn" type="submit">Request session</button></form></section>`,
  contact: () => `${hero('Get in touch')}<section class="sec wrap two"><div><ul class="ticks"><li><a href="tel:+254741050074">0741 050 074</a></li><li><a href="mailto:youngmindsmentorshiphub@gmail.com">youngmindsmentorshiphub@gmail.com</a></li><li>Kenyatta University, Nairobi, Kenya</li></ul>
<h2>FAQ</h2>${[['Do schools pay?', 'Nothing is sold; some schools support mentors\' transport.'], ['Are mentors vetted?', 'Yes: training, a code of conduct, a Certificate of Good Conduct, and mentors work in pairs.'], ['Can we choose topics?', 'Yes, through the consultation.'], ['How can my organisation partner?', 'As a sponsor, through CSR, or as a professional volunteer. Message us to start.']].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
<form data-endpoint="/api/messages" novalidate>${status}${fieldHtml('name', 'Name', 'text', 'required')}${fieldHtml('email', 'Email', 'email', 'required')}${fieldHtml('subject', 'Subject', 'text', 'required')}<div class="field"><label for="message">Message</label><textarea id="message" name="message" rows="6" required minlength="10" maxlength="5000"></textarea><div class="error"></div></div>${hp}<button class="btn" type="submit">Send message</button></form></section>`,
  gallery: () => `${hero('Moments from our school visits', 'Mentorship talks, revision clinics and team moments.')}<section class="sec wrap"><p class="center">Photos from our visits are coming soon.</p></section>`,
  404: () => ''
};
if (PAGE[page] && page !== '404') main.innerHTML = PAGE[page]();

// slots (admin-controlled photos; endpoint arrives with the media module)
try { const s = await fetch('/api/media/slots'); if (s.ok) { const { slots } = await s.json(); document.querySelectorAll('[data-slot]').forEach(i => { const x = slots[i.dataset.slot]; if (x?.src) { i.src = x.src; i.alt = x.alt || i.alt; } }); } } catch {}

// forms
document.addEventListener('click', e => { const b = e.target.closest('[data-apply]'); if (b) { const s = $('#positionId'); if (s) s.value = b.dataset.apply; $('#apply').scrollIntoView(); s?.focus(); } });
$('#motivation')?.addEventListener('input', e => $('#cc').textContent = e.target.value.length);
document.querySelectorAll('form[data-endpoint]').forEach(f => {
  const st = f.querySelector('.form-status'), clear = () => f.querySelectorAll('.has-error').forEach(x => { x.classList.remove('has-error'); x.querySelector('.error').textContent = ''; });
  const show = (m, ok) => { st.hidden = false; st.className = 'form-status ' + (ok ? 'is-success' : 'is-error'); st.textContent = m; };
  f.addEventListener('submit', async e => {
    e.preventDefault(); clear();
    const bad = [...f.elements].find(el => el.name && !el.checkValidity());
    if (bad) { const w = bad.closest('.field'); w.classList.add('has-error'); w.querySelector('.error').textContent = bad.validationMessage; bad.focus(); return; }
    const data = {};
    for (const el of f.elements) { if (!el.name || el.type === 'submit') continue;
      if (el.type === 'checkbox') { if (el.hasAttribute('data-single')) data[el.name] = el.checked; else if (el.checked) (data[el.name] ||= []).push(el.value); }
      else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; } else data[el.name] = el.value; }
    const btn = f.querySelector('[type=submit]'), lbl = btn.textContent; btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await api(f.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (r.ok) { f.reset(); show(r.message || 'Thank you!', true); }
      else { show(r.error || 'Something went wrong.', false); for (const [k, m] of Object.entries(r.errors || {})) { const w = f.querySelector(`[name="${k}"]`)?.closest('.field'); if (w) { w.classList.add('has-error'); w.querySelector('.error').textContent = m; } } }
    } catch { show('Network error. Please try again.', false); }
    btn.disabled = false; btn.textContent = lbl;
  });
});
const io = new IntersectionObserver(es => es.forEach(x => x.isIntersecting && x.target.classList.add('in')), { threshold: .1 });
document.querySelectorAll('.fade').forEach(x => io.observe(x));
