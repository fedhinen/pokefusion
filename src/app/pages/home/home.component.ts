import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { PokemonService } from '../../services/pokemon.service';
import { PolimerizationService } from '../../services/polimerization.service';
import { PokemonCardComponent } from '../../components/pokemon-card/pokemon-card.component';
import { FusionResultComponent } from '../../components/fusion-result/fusion-result.component';
import type { Pokemon } from '../../../types/Pokemon';
import type { PokemonFusion } from '../../../types/Fusion';

type SlotState = 'empty' | 'loading' | 'loaded' | 'error';
type FusionState = 'idle' | 'loading' | 'done' | 'error';
type ImageState = 'idle' | 'loading' | 'done' | 'error';

interface PokemonSlot {
  state: SlotState;
  pokemon: Pokemon | null;
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PokemonCardComponent, FusionResultComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly pokemonService = inject(PokemonService);
  private readonly polimerizationService = inject(PolimerizationService);

  readonly slots = signal<PokemonSlot[]>([
    { state: 'empty', pokemon: null },
    { state: 'empty', pokemon: null },
    { state: 'empty', pokemon: null },
  ]);

  readonly fusionState = signal<FusionState>('idle');
  readonly fusion = signal<PokemonFusion | null>(null);
  readonly fusionError = signal<string | null>(null);
  readonly selectionError = signal<string | null>(null);

  readonly imageState = signal<ImageState>('idle');
  readonly imageUrl = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);

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

    // Liberar URL anterior para evitar memory leaks
    const prev = this.imageUrl();
    if (prev) {
      URL.revokeObjectURL(prev);
      this.imageUrl.set(null);
    }

    this.polimerizationService.generateImage(fusion).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
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

  private resetFusion(): void {
    this.fusionState.set('idle');
    this.fusion.set(null);
    this.fusionError.set(null);
    this.resetImage();
  }

  private resetImage(): void {
    const prev = this.imageUrl();
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    this.imageUrl.set(null);
    this.imageState.set('idle');
    this.imageError.set(null);
  }
}
