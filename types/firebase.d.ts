// Type declarations are now handled by config/firebase.ts
declare module '*.js' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseStorage } from 'firebase/storage';
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
}
declare module '../config/firebase.js' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseStorage } from 'firebase/storage';
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
}

declare module '../../config/firebase.js' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseStorage } from 'firebase/storage';
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
}

declare module 'config/firebase.js' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseStorage } from 'firebase/storage';
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
}

declare module '../config/firebase' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseStorage } from 'firebase/storage';
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
}

declare module '../../config/firebase' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseStorage } from 'firebase/storage';
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
}

declare module 'config/firebase' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseStorage } from 'firebase/storage';
  export const db: Firestore;
  export const auth: Auth;
  export const storage: FirebaseStorage;
}
