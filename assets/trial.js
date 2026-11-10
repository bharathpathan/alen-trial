// The trial flow: sign in (Google, or email and password with a confirmed address), the holder's details, then one
// 7-day key per account. Firestore's security rules (firestore.rules) enforce the expiry, the fields and one trial per
// account on Google's servers; this page cannot change them.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, reload,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, getDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// The web configuration is public by design; access is controlled by Authentication and the Firestore rules.
const app = initializeApp({
  apiKey: 'AIzaSyDkjT4bbQQux99GM13ZmJeDo0WyHOK1DZU',
  authDomain: 'project-alen.firebaseapp.com',
  projectId: 'project-alen',
  storageBucket: 'project-alen.firebasestorage.app',
  messagingSenderId: '1038999627607',
  appId: '1:1038999627607:web:dce957e6b2124477114012',
});
const auth = getAuth(app);
const db = getFirestore(app);
const TRIAL_DAYS = 7;
const DAY = 86400000;

const $ = (id) => document.getElementById(id);
const STEPS = ['step-loading', 'step-signin', 'step-verify', 'step-details', 'step-key'];
function show(step) {
  for (const s of STEPS) $(s).hidden = s !== step;
  const n = { 'step-signin': 1, 'step-verify': 1, 'step-details': 2, 'step-key': 3 }[step] || 1;
  ['p1', 'p2', 'p3'].forEach((p, i) => $(p).classList.toggle('on', i < n));
  const h = document.querySelector(`#${step} h2`); if (h && step !== 'step-loading') { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
function error(msg) { const e = $('error'); e.textContent = msg || ''; e.hidden = !msg; if (msg) $('info').hidden = true; }
function info(msg) { const e = $('info'); e.textContent = msg || ''; e.hidden = !msg; }
async function busy(button, fn) {
  const label = button.querySelector('span'); const old = label ? label.textContent : button.textContent;
  button.disabled = true; if (label) label.textContent = 'Please wait…';
  try { error(''); await fn(); } catch (e) { error(friendly(e)); } finally { button.disabled = false; if (label) label.textContent = old; }
}

/** Firebase error codes in plain words. */
function friendly(e) {
  const code = e?.code || '';
  const map = {
    'auth/email-already-in-use': 'There is already an account with this email. Choose “I have an account”.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/weak-password': 'Choose a password of at least 8 characters.',
    'auth/invalid-credential': 'The email or password is not right.',
    'auth/wrong-password': 'The email or password is not right.',
    'auth/user-not-found': 'There is no account with this email. Choose “New account”.',
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
    'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
    'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site and try again.',
    'auth/network-request-failed': 'No connection. Check the internet and try again.',
    'auth/unauthorized-domain': 'This site is not yet allowed to sign in. Please tell us at the address in the privacy notice.',
    'permission-denied': 'The key could not be created. Each account gets one trial; if you have one already, sign in again to see it.',
    unavailable: 'The key service is not reachable right now. Try again in a minute.',
  };
  return map[code] || e?.message || String(e);
}

/** ALEN- and 32 base-32 characters (160 random bits) from the browser's secure random source. */
function newKey() {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = 0; let value = 0; let out = '';
  for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += A[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  return `ALEN-${out}`;
}
const initials = (s) => { const w = String(s || '?').split(/[\s@._-]+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase(); };

function paintUser(user, name) {
  document.querySelectorAll('[data-name]').forEach((el) => { el.textContent = name || user.displayName || user.email; });
  document.querySelectorAll('[data-email]').forEach((el) => { el.textContent = user.email || ''; });
  document.querySelectorAll('[data-avatar]').forEach((el) => {
    el.textContent = '';
    if (user.photoURL && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(user.photoURL)) { const img = new Image(); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = user.photoURL; el.append(img); } else el.textContent = initials(name || user.displayName || user.email);
  });
}

let timer = null;
function showKey(key, data) {
  $('key-value').textContent = key;
  const created = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now();
  const ends = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : created + (data.days || TRIAL_DAYS) * DAY;
  $('key-ends').textContent = new Date(ends).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
  const tick = () => {
    const ms = Math.max(0, ends - Date.now()); const s = Math.floor(ms / 1000);
    const parts = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    for (const [k, v] of Object.entries(parts)) document.querySelector(`[data-${k}]`).textContent = String(v).padStart(2, '0');
    if (!ms) { $('key-sub').textContent = 'This trial has ended. Paid plans are coming soon.'; clearInterval(timer); }
  };
  clearInterval(timer); tick(); timer = setInterval(tick, 1000);
  paintUser(auth.currentUser, data.name);
  show('step-key');
}

async function route(user) {
  error(''); info('');
  if (!user) { show('step-signin'); return; }
  const password = user.providerData.some((p) => p.providerId === 'password');
  if (password && !user.emailVerified) { $('verify-email').textContent = user.email; show('step-verify'); return; }
  show('step-loading');
  try {
    const trial = await getDoc(doc(db, 'trials', user.uid));
    if (trial.exists()) {
      const key = trial.data().key; const k = await getDoc(doc(db, 'keys', key));
      if (k.exists()) { showKey(key, k.data()); info('Welcome back. This is the key made for your account.'); return; }
    }
  } catch (e) { error(friendly(e)); }
  paintUser(user);
  if (!$('name').value) $('name').value = user.displayName || '';
  show('step-details');
}

// ---- sign-in ----
let mode = 'new';
function setMode(m) {
  mode = m;
  $('tab-new').setAttribute('aria-selected', String(m === 'new')); $('tab-old').setAttribute('aria-selected', String(m === 'old'));
  $('email-btn').querySelector('span').textContent = m === 'new' ? 'Create account' : 'Sign in';
  $('password').autocomplete = m === 'new' ? 'new-password' : 'current-password';
  $('pw-hint').hidden = m !== 'new'; $('reset-btn').hidden = m === 'new';
  error('');
}
$('tab-new').addEventListener('click', () => setMode('new'));
$('tab-old').addEventListener('click', () => setMode('old'));
$('google-btn').addEventListener('click', (e) => busy(e.currentTarget, async () => { const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); await signInWithPopup(auth, p); }));
$('email-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('email').value.trim(); const password = $('password').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error('Enter your email address.'); $('email').focus(); return; }
  if (password.length < 8) { error('The password needs at least 8 characters.'); $('password').focus(); return; }
  busy($('email-btn'), async () => {
    if (mode === 'new') { const c = await createUserWithEmailAndPassword(auth, email, password); await sendEmailVerification(c.user); }
    else await signInWithEmailAndPassword(auth, email, password);
  });
});
$('reset-btn').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  const email = $('email').value.trim(); if (!email) { error('Enter your email first.'); return; }
  await sendPasswordResetEmail(auth, email); info('If there is an account for that email, a reset link is on its way.');
}));
$('verified-btn').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  await reload(auth.currentUser); await auth.currentUser.getIdToken(true);
  if (!auth.currentUser.emailVerified) { error('Not confirmed yet. Open the link in the email, then try again.'); return; }
  await route(auth.currentUser);
}));
$('resend-btn').addEventListener('click', (e) => busy(e.currentTarget, async () => { await sendEmailVerification(auth.currentUser); info('Sent. Check your inbox (and the spam folder).'); }));
document.querySelectorAll('[data-signout]').forEach((b) => b.addEventListener('click', () => { clearInterval(timer); signOut(auth); }));

// ---- details and key ----
$('details-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('name').value.trim(); const role = $('role').value; const company = $('company').value.trim(); const purpose = $('purpose').value.trim();
  if (!name) { error('Enter your name.'); $('name').focus(); return; }
  if (!role) { error('Choose your role.'); $('role').focus(); return; }
  if (!$('consent').checked) { error('Please agree to the privacy notice to create the key.'); $('consent').focus(); return; }
  busy($('create-btn'), async () => {
    const user = auth.currentUser; const key = newKey();
    const record = { uid: user.uid, name: name.slice(0, 100), email: user.email, role: role.slice(0, 60), plan: 'trial', days: TRIAL_DAYS, consent: true, createdAt: serverTimestamp() };
    if (company) record.company = company.slice(0, 120);
    if (purpose) record.purpose = purpose.slice(0, 500);
    const batch = writeBatch(db);
    batch.set(doc(db, 'keys', key), record);
    batch.set(doc(db, 'trials', user.uid), { key, createdAt: serverTimestamp() });
    await batch.commit();
    const saved = await getDoc(doc(db, 'keys', key));
    showKey(key, saved.data());
  });
});
$('copy-btn').addEventListener('click', async () => {
  const label = $('copy-btn').querySelector('span');
  try { await navigator.clipboard.writeText($('key-value').textContent); label.textContent = 'Copied ✓'; }
  catch { const r = document.createRange(); r.selectNodeContents($('key-value')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); label.textContent = 'Press Ctrl+C'; }
  setTimeout(() => { label.textContent = 'Copy key'; }, 2200);
});

onAuthStateChanged(auth, (user) => { route(user); });
