import { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, googleProvider, storage, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signInId = async (id: string, pass: string) => {
    try {
      const email = id.includes('@') ? id : `${id}@travellog.com`;
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error signing in with ID", error);
      throw error;
    }
  };

  const signUpId = async (id: string, pass: string, name: string, photoURL?: string) => {
    try {
      const email = id.includes('@') ? id : `${id}@travellog.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: photoURL || null
      });
      return userCredential.user;
    } catch (error) {
      console.error("Error signing up", error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: { displayName?: string, photoFile?: File }) => {
    if (!user) return;

    try {
      let photoURL = user.photoURL;

      if (updates.photoFile) {
        const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${updates.photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, updates.photoFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      await updateProfile(user, {
        displayName: updates.displayName || user.displayName,
        photoURL: photoURL
      });

      // Firestore 동기화 (setDoc + merge: true로 문서 부재 시에도 오류 방지)
      await setDoc(doc(db, 'users', user.uid), {
        displayName: updates.displayName || user.displayName,
        photoURL: photoURL,
        lastUpdated: new Date()
      }, { merge: true });

      // 로컬 상태 업데이트 강제
      setUser({ ...auth.currentUser } as User);
    } catch (error) {
      console.error("Error updating profile", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return { user, loading, signInGoogle, signInId, signUpId, updateUserProfile, signOut };
};