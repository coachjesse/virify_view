// src/firebase/config.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTfTEb1q9SHgG8B_B28jnpN2-quzRgDPQ",
  authDomain: "verify-phone-980cb.firebaseapp.com",
  projectId: "verify-phone-980cb",
  storageBucket: "verify-phone-980cb.firebasestorage.app",
  messagingSenderId: "718286919182",
  appId: "1:718286919182:web:fb044b075855ce63f24e5f",
  measurementId: "G-PRN1ZE2X62"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export services for use in your app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
