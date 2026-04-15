import { initializeApp } from 'firebase/app';
import {
  AuthError,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

// Use environment variables if available (for Vercel), otherwise fallback to applet config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig?.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig?.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig?.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig?.appId,
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || appletConfig?.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signIn() {
  const prefersRedirect =
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 768px)').matches ||
      /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent));

  if (prefersRedirect) {
    await signInWithRedirect(auth, googleProvider);
    return { mode: 'redirect' as const };
  }

  try {
    await signInWithPopup(auth, googleProvider);
    return { mode: 'popup' as const };
  } catch (error) {
    const authError = error as AuthError;

    if (
      authError.code === 'auth/popup-blocked' ||
      authError.code === 'auth/popup-closed-by-user' ||
      authError.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return { mode: 'redirect' as const };
    }

    throw error;
  }
}

export function completeRedirectSignIn() {
  return getRedirectResult(auth);
}

export function getFriendlyAuthError(error: unknown) {
  const authError = error as AuthError | undefined;

  switch (authError?.code) {
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase yet. Add your live site domain in Firebase Authentication settings, then try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups for this site or try again and we will fall back to redirect sign-in.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before sign-in completed. Try again and finish the Google prompt.';
    case 'auth/network-request-failed':
      return 'The sign-in request could not reach Firebase. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Authentication for this project yet.';
    default:
      return authError?.message || 'Sign-in failed. Please try again.';
  }
}

export const logOut = () => signOut(auth);
