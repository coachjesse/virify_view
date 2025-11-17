// src/api/auth.ts
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
  } from "firebase/auth";
  import { doc, setDoc, getDoc } from "firebase/firestore";
  
  import { auth, db } from "../firebase/firebase";
  
  /**
   * Sign up a user and create a Firestore user document.
   */
  export async function signup(email: string, password: string) {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
  
    // Create Firestore user document
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      status: true,
      role: 1,
      createdAt: new Date(),
    });
  
    return user;
  }
  
  /**
   * Log in a user with email + password
   */
  export async function login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }
  
  /**
   * Log out the current user
   */
  export async function logout() {
    await signOut(auth);
  }
  
  /**
   * Subscribe to auth state changes (login/logout)
   */
  export function onAuthChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, (user) => callback(user));
  }
  
  /**
   * Get current logged-in user (sync)
   */
  export function getCurrentUser(): User | null {
    return auth.currentUser;
  }
  
  /**
   * Fetch the user's Firestore document
   */
  export async function getUserDoc(uid: string) {
    const ref = doc(db, "users", uid);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  }
  