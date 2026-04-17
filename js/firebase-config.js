// === Firebase Configuration ===
// Replace with your Firebase project config from:
// Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
  apiKey: "AIzaSyCob88GJ6YO7f-wTHpHognE32a1opYoCwk",
  authDomain: "gymlog-83e63.firebaseapp.com",
  projectId: "gymlog-83e63",
  storageBucket: "gymlog-83e63.firebasestorage.app",
  messagingSenderId: "841548024881",
  appId: "1:841548024881:web:292aa5de08e946b611d910",
  measurementId: "G-7MQVVQZCFG"
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
