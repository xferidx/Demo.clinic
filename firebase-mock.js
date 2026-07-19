// firebase-mock.js
// -----------------------------------------------------------------------------
// TRIAL / DEMO BUILD ONLY.
// This is a tiny stand-in for the Firebase SDK, backed by the browser's
// localStorage instead of a real cloud project. It implements just enough of
// the same function names (doc, setDoc, onSnapshot, collection, deleteDoc,
// getDocs, serverTimestamp, signInWithEmailAndPassword, etc.) that the site's
// existing code works completely unchanged — nothing to rewire, no cloud
// project required.
//
// Data does NOT sync between devices or browsers in this mode — it lives only
// on the device viewing the demo. That's expected for a sales/trial copy.
// The full product replaces this file with a real Firebase config for live,
// multi-device sync across the clinic's staff and patients.
//
// Staff / patient-records access in this trial uses a single demo code
// instead of a real staff email + password: 1234
// -----------------------------------------------------------------------------

const DEMO_CODE = "1234";
const LS_PREFIX = "mockfs:";
const AUTH_KEY = LS_PREFIX + "auth:user";

// ---------- helpers ----------
let idSeq = 0;
function randomId() {
  idSeq += 1;
  return "demo" + Date.now().toString(36) + idSeq.toString(36);
}

function reviveTimestamps(val) {
  if (val && typeof val === "object") {
    if (val.__ts !== undefined) {
      const ms = val.__ts;
      return { toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) };
    }
    if (Array.isArray(val)) return val.map(reviveTimestamps);
    const out = {};
    for (const k in val) out[k] = reviveTimestamps(val[k]);
    return out;
  }
  return val;
}

function resolveTimestamps(val) {
  if (val && typeof val === "object") {
    if (val.__serverTimestamp) return { __ts: Date.now() };
    if (Array.isArray(val)) return val.map(resolveTimestamps);
    const out = {};
    for (const k in val) out[k] = resolveTimestamps(val[k]);
    return out;
  }
  return val;
}

function readDoc(path) {
  const raw = localStorage.getItem(LS_PREFIX + "doc:" + path);
  return raw ? JSON.parse(raw) : null;
}
function writeDoc(path, data) {
  localStorage.setItem(LS_PREFIX + "doc:" + path, JSON.stringify(data));
}
function removeDoc(path) {
  localStorage.removeItem(LS_PREFIX + "doc:" + path);
}
function listDocs(collPath) {
  const prefix = LS_PREFIX + "doc:" + collPath + "/";
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && !key.slice(prefix.length).includes("/")) {
      const id = key.slice(prefix.length);
      try {
        out.push({ id, data: JSON.parse(localStorage.getItem(key)) });
      } catch (e) {}
    }
  }
  return out;
}

// ---------- refs ----------
class DocRef {
  constructor(path) {
    this.path = path;
    this.id = path.split("/").pop();
  }
}
class CollRef {
  constructor(path) {
    this.path = path;
  }
}

// ---------- App / Firestore / Storage entry points ----------
export function initializeApp() {
  return { __mock: true };
}
export function getFirestore() {
  return { __mock: true };
}
export function getStorage() {
  return { __mock: true };
}

export function doc(first, ...rest) {
  if (first instanceof CollRef) {
    const path = rest.length ? first.path + "/" + rest.join("/") : first.path + "/" + randomId();
    return new DocRef(path);
  }
  return new DocRef(rest.join("/"));
}

export function collection(_db, ...segs) {
  return new CollRef(segs.join("/"));
}

export function serverTimestamp() {
  return { __serverTimestamp: true };
}

// ---------- writes ----------
export async function setDoc(ref, data, opts) {
  let toSave = resolveTimestamps(data);
  if (opts && opts.merge) {
    const existing = readDoc(ref.path);
    if (existing) toSave = { ...existing, ...toSave };
  }
  writeDoc(ref.path, toSave);
  notify(ref.path);
}

export async function deleteDoc(ref) {
  removeDoc(ref.path);
  notify(ref.path);
}

export async function getDocs(collRef) {
  const items = listDocs(collRef.path);
  return {
    forEach(fn) {
      items.forEach((it) =>
        fn({
          id: it.id,
          ref: new DocRef(collRef.path + "/" + it.id),
          data: () => reviveTimestamps(it.data),
        })
      );
    },
  };
}

// ---------- live listeners (single-device only) ----------
const listeners = new Map(); // watch-path -> Set(fn)

function notify(writtenPath) {
  listeners.forEach((fns, watchPath) => {
    if (writtenPath === watchPath || writtenPath.startsWith(watchPath + "/")) {
      fns.forEach((fn) => fn());
    }
  });
}

export function onSnapshot(ref, cb, errCb) {
  const isColl = ref instanceof CollRef;
  const watchPath = ref.path;

  function fire() {
    try {
      if (isColl) {
        const items = listDocs(watchPath);
        cb({
          forEach(fn) {
            items.forEach((it) => fn({ id: it.id, data: () => reviveTimestamps(it.data) }));
          },
        });
      } else {
        const raw = readDoc(watchPath);
        cb({ exists: () => !!raw, data: () => (raw ? reviveTimestamps(raw) : undefined), id: ref.id });
      }
    } catch (e) {
      if (errCb) errCb(e);
    }
  }

  if (!listeners.has(watchPath)) listeners.set(watchPath, new Set());
  listeners.get(watchPath).add(fire);
  setTimeout(fire, 0);

  return () => {
    const set = listeners.get(watchPath);
    if (set) set.delete(fire);
  };
}

// ---------- auth ----------
let currentUser = null;
try {
  const saved = localStorage.getItem(AUTH_KEY);
  if (saved) currentUser = JSON.parse(saved);
} catch (e) {}

const authListeners = new Set();
function persistAuth() {
  if (currentUser) localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
  else localStorage.removeItem(AUTH_KEY);
}
function fireAuth() {
  authListeners.forEach((fn) => fn(currentUser));
}

export function getAuth() {
  return {
    get currentUser() {
      return currentUser;
    },
  };
}

export async function signInAnonymously() {
  currentUser = { uid: "anon-" + randomId(), isAnonymous: true };
  persistAuth();
  fireAuth();
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  if (password !== DEMO_CODE) {
    const err = new Error("Incorrect code.");
    err.code = "auth/invalid-credential";
    throw err;
  }
  currentUser = { uid: "staff-demo", isAnonymous: false, email: email || "staff@demo.clinic" };
  persistAuth();
  fireAuth();
  return { user: currentUser };
}

export async function signOut() {
  currentUser = null;
  persistAuth();
  fireAuth();
}

export function onAuthStateChanged(_auth, cb) {
  authListeners.add(cb);
  setTimeout(() => cb(currentUser), 0);
  return () => authListeners.delete(cb);
}

// ---------- storage (photos etc, stored as base64 data URLs) ----------
export function ref(_storage, path) {
  return { path };
}
export async function uploadBytes(storageRef, blob) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  localStorage.setItem(LS_PREFIX + "file:" + storageRef.path, dataUrl);
}
export async function getDownloadURL(storageRef) {
  const url = localStorage.getItem(LS_PREFIX + "file:" + storageRef.path);
  if (!url) throw new Error("File not found in demo storage.");
  return url;
}
export async function deleteObject(storageRef) {
  localStorage.removeItem(LS_PREFIX + "file:" + storageRef.path);
}
