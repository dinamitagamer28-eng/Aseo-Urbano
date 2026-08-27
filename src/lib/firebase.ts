import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBdc_twZ9BxRqToxhlO_TKRnXAFNq3Nfo0",
  authDomain: "aseo-urbano-a86ff.firebaseapp.com",
  projectId: "aseo-urbano-a86ff",
  storageBucket: "aseo-urbano-a86ff.firebasestorage.app",
  messagingSenderId: "256866760836",
  appId: "1:256866760836:web:d005e7349365e5b0a5ead1",
  measurementId: "G-KDQKY8MWZY"
};

// Singleton para Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

