import { inject, Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Observable, from, switchMap } from 'rxjs';

import { firebaseApp } from '../../environments/firebase.config';
import { UserIdentityService } from './user-identity.service';
import type { SavedFusion, SavedFusionData } from '../../types/Favorite';
import type { PokemonFusion } from '../../types/Fusion';

const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

function toSavedFusion(docSnap: QueryDocumentSnapshot<DocumentData>): SavedFusion {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data['userId'] as string,
    fusion: data['fusion'] as SavedFusionData,
    imageUrl: data['imageUrl'] as string,
    imagePath: data['imagePath'] as string,
    createdAt: data['createdAt'] as number,
  };
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly userIdentity = inject(UserIdentityService);

  private get userId(): string {
    return this.userIdentity.userId;
  }

  private itemsCollection() {
    return collection(firestore, `favorites/${this.userId}/items`);
  }

  private uploadSprite(blob: Blob, fusionName: string): Observable<{ url: string; path: string }> {
    const uuid = crypto.randomUUID();
    const path = `sprites/${this.userId}/${uuid}.png`;
    const storageRef = ref(storage, path);
    return from(
      uploadBytes(storageRef, blob, {
        contentType: 'image/png',
        customMetadata: { fusionName },
      }).then(async () => ({ url: await getDownloadURL(storageRef), path })),
    );
  }

  saveFavorite(fusion: PokemonFusion, imageBlob: Blob): Observable<SavedFusion> {
    // Strip moves — can be 100+ entries, not needed for display
    const { moves: _moves, ...fusionData } = fusion;
    return this.uploadSprite(imageBlob, fusion.name).pipe(
      switchMap(({ url: imageUrl, path: imagePath }) => {
        const payload = {
          userId: this.userId,
          fusion: fusionData,
          imageUrl,
          imagePath,
          createdAt: Date.now(),
        };
        return from(
          addDoc(this.itemsCollection(), payload).then((docRef) => ({
            id: docRef.id,
            ...payload,
          })),
        );
      }),
    );
  }

  listFavorites(): Observable<SavedFusion[]> {
    const q = query(this.itemsCollection(), orderBy('createdAt', 'desc'));

    return new Observable<SavedFusion[]>((observer) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map(toSavedFusion);
          observer.next(items);
        },
        (error) => observer.error(error),
      );
      return () => unsubscribe();
    });
  }

  getFavorite(id: string): Observable<SavedFusion> {
    const docRef = doc(firestore, `favorites/${this.userId}/items/${id}`);
    return from(
      getDoc(docRef).then((snap) => {
        if (!snap.exists()) {
          throw new Error(`Favorito ${id} no encontrado`);
        }
        return toSavedFusion(snap as QueryDocumentSnapshot<DocumentData>);
      }),
    );
  }

  deleteFavorite(id: string): Observable<void> {
    return this.getFavorite(id).pipe(
      switchMap((saved) => {
        const docRef = doc(firestore, `favorites/${this.userId}/items/${id}`);
        const deleteStorage = saved.imagePath
          ? deleteObject(ref(storage, saved.imagePath)).catch(() => {
              // Storage delete failure is non-fatal — proceed to remove the doc
            })
          : Promise.resolve();
        return from(deleteStorage.then(() => deleteDoc(docRef)));
      }),
    );
  }
}
