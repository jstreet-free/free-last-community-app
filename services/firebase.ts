import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import config from "../firebase-applet-config.json";

export const app = initializeApp(config);
export const db = (config as any).firestoreDatabaseId ? getFirestore(app, (config as any).firestoreDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
