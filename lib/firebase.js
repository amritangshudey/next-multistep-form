import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAIme8z6VrIgUCm5CVdhiiwBHFSNb7cEHs",
  authDomain: "ecoearn-11eff.firebaseapp.com",
  projectId: "ecoearn-11eff",
  storageBucket: "ecoearn-11eff.appspot.com",
  messagingSenderId: "415597006831",
  appId: "1:415597006831:web:878d49fbdcd30b493ef01a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.settings.appVerificationDisabledForTesting = false;

export {auth};