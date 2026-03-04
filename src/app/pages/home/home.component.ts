import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { forkJoin } from 'rxjs';

import { PokemonService } from '../../services/pokemon.service';
import { PolimerizationService } from '../../services/polimerization.service';
import { FavoritesService } from '../../services/favorites.service';
import { PokemonCardComponent } from '../../components/pokemon-card/pokemon-card.component';
import { FusionResultComponent } from '../../components/fusion-result/fusion-result.component';
import { FavoritesListComponent } from '../../components/favorites-list/favorites-list.component';
import type { Pokemon } from '../../../types/Pokemon';
import type { PokemonFusion } from '../../../types/Fusion';
import type { SavedFusion } from '../../../types/Favorite';

type SlotState = 'empty' | 'loading' | 'loaded' | 'error';
type FusionState = 'idle' | 'loading' | 'done' | 'error';
type ImageState = 'idle' | 'loading' | 'done' | 'error';
type ViewMode = 'fusion' | 'favorite';

interface PokemonSlot {
  state: SlotState;
  pokemon: Pokemon | null;
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PokemonCardComponent, FusionResultComponent, FavoritesListComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly pokemonService = inject(PokemonService);
  private readonly polimerizationService = inject(PolimerizationService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly slots = signal<PokemonSlot[]>([
    { state: 'empty', pokemon: null },
    { state: 'empty', pokemon: null },
    { state: 'empty', pokemon: null },
  ]);

  readonly fusion = signal<PokemonFusion | null>(null);
  readonly fusionState = signal<FusionState>('idle');
  readonly fusionError = signal<string | null>(null);
  readonly selectionError = signal<string | null>(null);

  readonly imageState = signal<ImageState>('idle');
  readonly imageUrl = signal<string | null>(null);
  readonly imageBlob = signal<Blob | null>(null);
  readonly imageError = signal<string | null>(null);

  readonly isFavorite = signal<boolean>(false);
  readonly isSavingFavorite = signal<boolean>(false);
  readonly isDeletingFavorite = signal<boolean>(false);
  readonly currentFavoriteId = signal<string | null>(null);

  readonly viewMode = signal<ViewMode>('fusion');
  readonly selectedFavorite = signal<SavedFusion | null>(null);

  readonly favoritesList = signal<SavedFusion[]>([]);

  readonly allLoaded = computed(() => this.slots().every((s) => s.state === 'loaded'));
  readonly anyLoading = computed(() => this.slots().some((s) => s.state === 'loading'));

  readonly loadedPokemons = computed(() => {
    const loaded = this.slots()
      .filter((s) => s.state === 'loaded' && s.pokemon !== null)
      .map((s) => s.pokemon!);
    return loaded.length === 3 ? (loaded as [Pokemon, Pokemon, Pokemon]) : null;
  });

  readonly statusAnnouncement = computed(() => {
    const fs = this.fusionState();
    const is = this.imageState();
    if (fs === 'loading') return 'Polimerizando, por favor espera...';
    if (is === 'loading') return 'Generando imagen de la fusión...';
    if (is === 'done') return 'Imagen de la fusión generada.';
    if (fs === 'done') return `Fusión completada: ${this.fusion()?.name ?? ''}`;
    if (fs === 'error') return 'Error al fusionar. Intenta de nuevo.';
    if (this.anyLoading()) return 'Cargando Pokémon...';
    if (this.allLoaded()) return 'Tres Pokémon cargados. Puedes fusionarlos.';
    return '';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.favoritesService.listFavorites().subscribe({
        next: (list) => this.favoritesList.set(list),
        error: () => {},
      });
    }
  }

  selectRandom(): void {
    this.selectionError.set(null);
    this.slots.set([
      { state: 'loading', pokemon: null },
      { state: 'loading', pokemon: null },
      { state: 'loading', pokemon: null },
    ]);
    this.resetFusion();

    forkJoin([
      this.pokemonService.getPokemon(),
      this.pokemonService.getPokemon(),
      this.pokemonService.getPokemon(),
    ]).subscribe({
      next: ([p1, p2, p3]) => {
        this.slots.set([
          { state: 'loaded', pokemon: p1 },
          { state: 'loaded', pokemon: p2 },
          { state: 'loaded', pokemon: p3 },
        ]);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'No se pudo cargar los Pokémon';
        this.selectionError.set(msg);
        this.slots.set([
          { state: 'error', pokemon: null },
          { state: 'error', pokemon: null },
          { state: 'error', pokemon: null },
        ]);
      },
    });
  }

  resetSelection(): void {
    this.slots.set([
      { state: 'empty', pokemon: null },
      { state: 'empty', pokemon: null },
      { state: 'empty', pokemon: null },
    ]);
    this.selectionError.set(null);
    this.resetFusion();
    this.selectRandom();
  }

  fuse(): void {
    const pokemons = this.loadedPokemons();
    if (!pokemons) return;

    this.fusionState.set('loading');
    this.fusionError.set(null);
    this.resetImage();
    this.isFavorite.set(false);
    this.currentFavoriteId.set(null);

    this.polimerizationService.fuse(pokemons).subscribe({
      next: (result) => {
        this.fusion.set(result);
        this.fusionState.set('done');
        this.generateImage(result);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error al contactar el servicio de fusión';
        this.fusionError.set(msg);
        this.fusionState.set('error');
      },
    });
  }

  refuse(): void {
    this.fuse();
  }

  private generateImage(fusion: PokemonFusion): void {
    this.imageState.set('loading');
    this.imageError.set(null);

    const prev = this.imageUrl();
    if (prev) {
      URL.revokeObjectURL(prev);
      this.imageUrl.set(null);
    }
    this.imageBlob.set(null);

    this.polimerizationService.generateImage(fusion).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.imageBlob.set(blob);
        this.imageUrl.set(url);
        this.imageState.set('done');
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'No se pudo generar la imagen';
        this.imageError.set(msg);
        this.imageState.set('error');
      },
    });
  }

  toggleFavorite(): void {
    if (!this.isFavorite()) {
      const fusion = this.fusion();
      const blob = this.imageBlob();
      if (!fusion || !blob) return;

      this.isSavingFavorite.set(true);
      this.favoritesService.saveFavorite(fusion, blob).subscribe({
        next: (saved) => {
          this.isFavorite.set(true);
          this.currentFavoriteId.set(saved.id);
          this.isSavingFavorite.set(false);
        },
        error: (err: unknown) => {
          console.error('[FavoritesService] saveFavorite error:', err);
          this.isSavingFavorite.set(false);
        },
      });
    } else {
      const id = this.currentFavoriteId();
      if (!id) return;
      if (!confirm('¿Eliminar esta fusión de tus favoritos?')) return;

      this.isDeletingFavorite.set(true);
      this.favoritesService.deleteFavorite(id).subscribe({
        next: () => {
          this.isFavorite.set(false);
          this.currentFavoriteId.set(null);
          this.isDeletingFavorite.set(false);
        },
        error: (err: unknown) => {
          console.error('[FavoritesService] deleteFavorite error:', err);
          this.isDeletingFavorite.set(false);
        },
      });
    }
  }

  toggleFavoriteFromView(): void {
    const fav = this.selectedFavorite();
    if (!fav) return;
    if (!confirm('¿Eliminar esta fusión de tus favoritos?')) return;

    this.isDeletingFavorite.set(true);
    this.favoritesService.deleteFavorite(fav.id).subscribe({
      next: () => {
        this.isDeletingFavorite.set(false);
        this.selectedFavorite.set(null);
        this.viewMode.set('fusion');
      },
      error: (err: unknown) => {
        console.error('[FavoritesService] deleteFavorite error:', err);
        this.isDeletingFavorite.set(false);
      },
    });
  }

  selectFavorite(fav: SavedFusion): void {
    this.selectedFavorite.set(fav);
    this.viewMode.set('favorite');
  }

  startNewFusion(): void {
    this.selectedFavorite.set(null);
    this.viewMode.set('fusion');
  }

  private resetFusion(): void {
    this.fusionState.set('idle');
    this.fusion.set(null);
    this.fusionError.set(null);
    this.isFavorite.set(false);
    this.currentFavoriteId.set(null);
    this.resetImage();
  }

  private resetImage(): void {
    const prev = this.imageUrl();
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    this.imageUrl.set(null);
    this.imageBlob.set(null);
    this.imageState.set('idle');
    this.imageError.set(null);
  }
}
