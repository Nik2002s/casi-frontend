/**
 * Firebase configuration.
 * Set these in your .env.production file before building:
 *
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
 *   VITE_FIREBASE_PROJECT_ID=your-project-id
 *   VITE_FIREBASE_APP_ID=...
 */

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}
// const firebaseConfig = {
//   apiKey: "AIzaSyBOfK8qXUVNtOgnrBt15ZwhuMkdOtxy41o",
//   authDomain: "casi-64bdd-12277.firebaseapp.com",
//   projectId: "casi-64bdd-12277",
//   storageBucket: "casi-64bdd-12277.firebasestorage.app",
//   messagingSenderId: "353424150606",
//   appId: "1:353424150606:web:d09805adad99b7ccc5731f",
//   measurementId: "G-TB2RP7HEQ2"
// };
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
