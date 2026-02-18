import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOETY3pewMI4o3cTpJCYhn0Kn5WkXe4dg",
  authDomain: "velin-29530.firebaseapp.com",
  projectId: "velin-29530",
  storageBucket: "velin-29530.firebasestorage.app",
  messagingSenderId: "35735834916",
  appId: "1:35735834916:web:0f0edc7e5dae5827d823b1",
  measurementId: "G-XHPCGBBQS1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
