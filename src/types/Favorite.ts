import type { PokemonFusion } from './Fusion';

/** Subset of PokemonFusion stored in Firestore — moves excluded to keep doc small */
export type SavedFusionData = Omit<PokemonFusion, 'moves'>;

export interface SavedFusion {
  id: string;
  userId: string;
  fusion: SavedFusionData;
  imageUrl: string;
  /** Storage path (gs:// relative) used to delete the sprite */
  imagePath: string;
  createdAt: number;
}
