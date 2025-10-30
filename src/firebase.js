// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBoPAYJHtlVyvFkhPu_00GeXGxWE-mml9Y",
  authDomain: "menara-tenggara.firebaseapp.com",
  databaseURL: "https://menara-tenggara-default-rtdb.firebaseio.com",
  projectId: "menara-tenggara",
  storageBucket: "menara-tenggara.appspot.com",
  messagingSenderId: "9395316259",
  appId: "1:9395316259:web:39c5420eace148dc373396",
  measurementId: "G-LBQ8RYZQXN"
};

const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export { signInWithPopup };

// Realtime Database
export const rtdb = getDatabase(app);  // renamed from db to rtdb

// Firestore
export const firestoreDB = getFirestore(app); // renamed from db to firestoreDB
export { doc, getDoc };

// Storage
export const storage = getStorage(app);