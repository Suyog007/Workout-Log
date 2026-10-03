// === Optional cloud backup target ===
// This is a public web config (it identifies the project, it is not a secret).
// Access is controlled by Firestore rules: a signed-in user can only touch
// documents under users/{their uid}.
//
// Swap these values to point the backup at a different Firebase project.

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCob88GJ6YO7f-wTHpHognE32a1opYoCwk',
  authDomain: 'gymlog-83e63.firebaseapp.com',
  projectId: 'gymlog-83e63',
  storageBucket: 'gymlog-83e63.firebasestorage.app',
  messagingSenderId: '841548024881',
  appId: '1:841548024881:web:292aa5de08e946b611d910',
};

export const SDK_VERSION = '10.12.0';

/**
 * Remote collections are namespaced so they can never collide with data from
 * the previous version of this app (which used `exercises`, `workouts`,
 * `sets`, `templates`, `bodyweight`).
 */
export const REMOTE_PREFIX = 'v2_';

export const LEGACY_COLLECTIONS = ['exercises', 'workouts', 'sets', 'templates', 'bodyweight'];
