import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDc9dBpulGUHcLN2S_zsLYELsAm9Y6A2gQ",
    authDomain: "studybuddy-9ed41.firebaseapp.com",
    databaseURL: "https://studybuddy-9ed41-default-rtdb.firebaseio.com",
    projectId: "studybuddy-9ed41",
    storageBucket: "studybuddy-9ed41.firebasestorage.app",
    messagingSenderId: "931923562406",
    appId: "1:931923562406:web:388c2a01ceb4122c454967",
    measurementId: "G-MWK1DXHBZF",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
