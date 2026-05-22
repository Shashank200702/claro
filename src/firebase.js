import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKXItHvCREWcShMZ6oRcPCpOBH7pnn_60",
  authDomain: "claro-finance.firebaseapp.com",
  projectId: "claro-finance",
  storageBucket: "claro-finance.firebasestorage.app",
  messagingSenderId: "926636570267",
  appId: "1:926636570267:web:4377bb1a127dad997d783e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
