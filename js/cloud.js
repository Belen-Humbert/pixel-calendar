// Cuenta de Google + guardado en la nube (Firebase Auth + Firestore).
// Firebase se carga solo si hay configuración, así la app sigue andando sin internet.
import { firebaseConfig } from './firebase-config.js';

const V = '11.0.2';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export const cloudConfigured = Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

let fb = null;          // módulos y objetos de Firebase
let unsubDoc = null;    // escucha de cambios desde otros dispositivos
let pushTimer = null;
let lastPushed = '';    // para no subir lo mismo dos veces

export const cloud = {
  user: null,            // { uid, name, email, photo }
  status: cloudConfigured ? 'idle' : 'off', // off | idle | syncing | ok | error
  lastSync: 0,
};

async function boot() {
  if (fb) return fb;
  const [app, auth, store] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const a = app.initializeApp(firebaseConfig);
  let db;
  try {
    db = store.initializeFirestore(a, { localCache: store.persistentLocalCache() });
  } catch {
    db = store.getFirestore(a);
  }
  fb = { auth, store, a, db, authObj: auth.getAuth(a) };
  return fb;
}

/**
 * Arranca la sesión. Llama a onUser(user|null) cuando entra o sale,
 * y a onRemote(datos) cuando llegan cambios de la nube.
 */
export async function initCloud({ onUser, onRemote, onStatus }) {
  if (!cloudConfigured) return;
  try {
    const { auth, authObj } = await boot();
    await auth.getRedirectResult(authObj).catch(() => {});
    auth.onAuthStateChanged(authObj, user => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      lastPushed = '';
      if (!user) { cloud.user = null; cloud.status = 'idle'; onStatus(); onUser(null); return; }
      cloud.user = { uid: user.uid, name: user.displayName || 'Jugador 1', email: user.email || '', photo: user.photoURL || '' };
      onUser(cloud.user);
      listen(onRemote, onStatus);
    });
  } catch (err) {
    console.warn('[cloud] no se pudo iniciar', err);
    cloud.status = 'error'; onStatus();
  }
}

function listen(onRemote, onStatus) {
  const { store, db } = fb;
  const ref = store.doc(db, 'users', cloud.user.uid);
  cloud.status = 'syncing'; onStatus();
  unsubDoc = store.onSnapshot(ref, snap => {
    const data = snap.exists() ? snap.data() : null;
    cloud.status = 'ok'; cloud.lastSync = Date.now(); onStatus();
    onRemote(data, !snap.metadata.hasPendingWrites);
  }, err => {
    console.warn('[cloud] error al leer', err);
    cloud.status = 'error'; onStatus();
  });
}

export async function login() {
  const { auth, authObj } = await boot();
  const provider = new auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await auth.signInWithPopup(authObj, provider);
  } catch (err) {
    // en la app instalada a veces no se pueden abrir ventanas: usamos redirección
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(err.code)) {
      await auth.signInWithRedirect(authObj, provider);
    } else if (err.code !== 'auth/popup-closed-by-user') {
      throw err;
    }
  }
}

export async function logout() {
  if (!fb) return;
  await fb.auth.signOut(fb.authObj);
}

/** Sube el estado (con una pequeña espera para juntar varios cambios). */
export function pushSoon(payload, summaries, onStatus) {
  if (!cloud.user || !fb) return;
  const json = JSON.stringify(payload);
  if (json === lastPushed) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const { store, db } = fb;
    const uid = cloud.user.uid;
    try {
      cloud.status = 'syncing'; onStatus();
      lastPushed = json;
      const batch = store.writeBatch(db);
      batch.set(store.doc(db, 'users', uid), { ...payload, updatedAt: store.serverTimestamp() });
      for (const m of summaries) {
        batch.set(store.doc(db, 'users', uid, 'months', m.month), { ...m, savedAt: store.serverTimestamp() });
      }
      await batch.commit();
      cloud.status = 'ok'; cloud.lastSync = Date.now(); onStatus();
    } catch (err) {
      console.warn('[cloud] error al guardar', err);
      lastPushed = '';
      cloud.status = 'error'; onStatus();
    }
  }, 1200);
}

export const sameAsPushed = payload => JSON.stringify(payload) === lastPushed;
export const markPushed = payload => { lastPushed = JSON.stringify(payload); };
