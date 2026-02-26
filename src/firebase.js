import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA8qbOTyWkDJqHzyufMT-3SgR-P3CbY5vM",
  authDomain: "osmdraft2026.firebaseapp.com",
  projectId: "osmdraft2026",
  storageBucket: "osmdraft2026.firebasestorage.app",
  messagingSenderId: "1463811388",
  appId: "1:1463811388:web:dfa038aee1215174253239"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);