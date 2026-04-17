// === Firebase Configuration ===
// Replace with your Firebase project config from:
// Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const firestore = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence
firestore.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Offline persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Offline persistence not supported in this browser');
    }
  });

// Helper: get user-scoped collection
function userCollection(storeName) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return firestore.collection('users').doc(user.uid).collection(storeName);
}
