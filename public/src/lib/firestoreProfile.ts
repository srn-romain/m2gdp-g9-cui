import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from './types';

/**
 * Miroir Firestore du profil, dans `users/{uid}`.
 *
 * La source de vérité reste D1 (`GET`/`PATCH /me` par le Worker) : c'est le choix de
 * la partie B de la spec, qui autorise en plus Firestore « si besoin transitoire
 * profil ». Respecte `firestore.rules` : chacun n'écrit que son propre document, et
 * le Worker ne touche jamais Firestore.
 */
export async function syncProfileToFirestore(uid: string, profil: User): Promise<void> {
  if (!db || !uid) return;
  const reference = doc(db, 'users', uid);
  const existant = await getDoc(reference);
  await setDoc(
    reference,
    {
      uid,
      email: profil.email,
      firstName: profil.firstName,
      lastName: profil.lastName,
      neighborhood: profil.neighborhood,
      city: profil.city,
      coordinates: profil.coordinates ?? null,
      dietaryPreferences: profil.dietaryPreferences ?? [],
      avatarUrl: profil.avatarUrl ?? null,
      createdAt: existant.exists() ? existant.data()['createdAt'] : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
