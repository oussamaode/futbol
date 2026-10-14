/* ============================================================
   SquadUp — Firebase bootstrap
   Initializes Firebase Realtime Database (compat SDK, v10+)
   and exposes the shared handles the app needs.
   ============================================================ */

(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyBivVvdru6x1jFXjeC0VYGrAln5dwJEnCU",
    authDomain: "whatsapp-football-app.firebaseapp.com",
    projectId: "whatsapp-football-app",
    storageBucket: "whatsapp-football-app.firebasestorage.app",
    messagingSenderId: "397264704983",
    appId: "1:397264704983:web:6de58bd4e92b339795a792"
  };

  /* GitHub Pages URL used inside the "Share Lineup" message.
     Keep this in sync with the Open Graph tags in index.html. */
  const APP_URL = 'https://oussamaode.github.io/futbol/';

  const LINEUP_PATH = 'matchLineup';

  try {
    if (window.FIREBASE) {
      return; // allow test overrides/mocks
    }
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK failed to load from the CDN.');
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window.FIREBASE = {
      db: firebase.database(),
      LINEUP_PATH: LINEUP_PATH,
      APP_URL: APP_URL
    };
  } catch (err) {
    console.error('[SquadUp] Firebase initialization failed:', err);
    window.FIREBASE = window.FIREBASE || null;
  }
})();
