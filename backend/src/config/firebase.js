const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You can initialize with service account key or use default credentials
// For service account: admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
// For default credentials (GCP): admin.initializeApp()

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) {
    return admin.firestore();
  }

  try {
    // Check if Firebase is already initialized
    var serviceAccount = require("../../verify-phone-980cb-firebase-adminsdk-fbsvc-a0e4ea4c56.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
    return admin.firestore();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

const getFirestore = () => {
  if (!firebaseInitialized) {
    return initializeFirebase();
  }
  return admin.firestore();
};

module.exports = {
  initializeFirebase,
  getFirestore,
  admin,
};

