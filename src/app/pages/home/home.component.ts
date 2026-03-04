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
  template: `
    <div class="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header
        class="relative flex flex-col items-center justify-center px-4 py-6 border-b-4 border-[var(--color-accent)] bg-[var(--color-surface-2)] scanlines"
        role="banner"
      >
        <div
          class="absolute top-2 left-3 text-[0.5rem] text-[var(--color-accent)] opacity-50"
          aria-hidden="true"
        >
          ★
        </div>
        <div
          class="absolute top-2 right-3 text-[0.5rem] text-[var(--color-accent)] opacity-50"
          aria-hidden="true"
        >
          ★
        </div>

        <h1
          class="text-[clamp(0.8rem,3vw,1.3rem)] text-[var(--color-accent)] uppercase tracking-widest text-center leading-loose drop-shadow-[0_2px_8px_rgba(248,201,72,0.6)]"
          style="text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;"
        >
          Polimerizacion
        </h1>
        <p class="text-[0.45rem] text-[var(--color-text-muted)] mt-2 tracking-widest text-center">
          FUSIONA · COMBINA · CREA
        </p>

        <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {{ statusAnnouncement() }}
        </div>
      </header>

      <main
        class="flex-1 flex flex-col items-center gap-8 px-4 py-8 max-w-5xl mx-auto w-full"
        id="main-content"
      >
        <section class="w-full" aria-labelledby="pokemon-section-title">
          <h2 id="pokemon-section-title" class="sr-only">Pokémon seleccionados</h2>

          <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full"
            role="list"
            aria-label="Tres ranuras de Pokémon"
          >
            @for (slot of slots(); track $index) {
              <div role="listitem">
                <app-pokemon-card
                  [pokemon]="slot.pokemon"
                  [state]="slot.state"
                  [slotNumber]="$index + 1"
                />
              </div>
            }
          </div>
        </section>

        <section class="flex flex-col items-center gap-4 w-full" aria-label="Acciones">
          @if (!allLoaded()) {
            <button
              class="btn-pixel btn-primary"
              [disabled]="anyLoading()"
              (click)="selectRandom()"
              [attr.aria-busy]="anyLoading()"
              [attr.aria-label]="
                anyLoading() ? 'Cargando Pokémon...' : 'Seleccionar tres Pokémon al azar'
              "
            >
              @if (anyLoading()) {
                <span
                  class="pokeball-spin"
                  aria-hidden="true"
                  style="width:16px;height:16px;border-width:3px;"
                ></span>
                CARGANDO...
              } @else {
                &#9654; SELECCIONAR AL AZAR
              }
            </button>
          }

          @if (allLoaded()) {
            <div class="flex flex-wrap gap-4 justify-center">
              <button
                class="btn-pixel btn-danger"
                [disabled]="fusionState() === 'loading'"
                (click)="resetSelection()"
                aria-label="Desechar estos Pokémon y elegir otros tres al azar"
              >
                &#8635; VOLVER A ELEGIR
              </button>

              <button
                class="btn-pixel btn-success"
                [disabled]="fusionState() === 'loading'"
                [attr.aria-busy]="fusionState() === 'loading'"
                (click)="fuse()"
                [attr.aria-label]="
                  fusionState() === 'loading'
                    ? 'Fusionando Pokémon...'
                    : 'Fusionar los tres Pokémon seleccionados'
                "
              >
                @if (fusionState() === 'loading') {
                  <span
                    class="pokeball-spin"
                    aria-hidden="true"
                    style="width:16px;height:16px;border-width:3px;"
                  ></span>
                  FUSIONANDO...
                } @else {
                  &#9889; FUSIONAR
                }
              </button>
            </div>
          }

          @if (selectionError()) {
            <div
              role="alert"
              aria-live="assertive"
              class="flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-red)] bg-[rgba(230,57,70,0.1)] text-[var(--color-red)] text-[0.45rem] max-w-sm text-center"
            >
              <span aria-hidden="true">&#9888;</span>
              {{ selectionError() }}
            </div>
          }
        </section>

        @if (fusionState() !== 'idle') {
          <section class="w-full" aria-labelledby="fusion-section-title">
            <h2
              id="fusion-section-title"
              class="text-[0.5rem] text-[var(--color-text-muted)] uppercase tracking-widest text-center mb-4"
            >
              — Resultado de Fusión —
            </h2>

            @if (fusionState() === 'loading') {
              <div
                class="pixel-card flex flex-col items-center justify-center gap-4 p-10 max-w-lg mx-auto"
                role="status"
                aria-live="polite"
                aria-label="Generando fusión con inteligencia artificial"
              >
                <div class="pokeball-spin" aria-hidden="true"></div>
                <p class="text-[0.5rem] text-[var(--color-accent)] blink text-center">
                  POLIMERIZANDO...
                </p>
                <p class="text-[0.4rem] text-[var(--color-text-muted)] text-center leading-loose">
                  La IA está creando<br />tu nuevo Pokémon
                </p>
              </div>
            }

            @if (fusionState() === 'done' && fusion()) {
              <app-fusion-result
                [fusion]="fusion()!"
                [imageState]="imageState()"
                [imageUrl]="imageUrl()"
                [imageError]="imageError()"
              />

              <div class="flex justify-center mt-6">
                <button
                  class="btn-pixel btn-secondary"
                  [disabled]="fusionState() === 'loading' || imageState() === 'loading'"
                  [attr.aria-busy]="fusionState() === 'loading'"
                  (click)="refuse()"
                  aria-label="Volver a fusionar los mismos tres Pokémon con una nueva combinación"
                >
                  &#8635; REFUSIONAR
                </button>
              </div>
            }

            @if (fusionState() === 'error') {
              <div
                role="alert"
                aria-live="assertive"
                class="pixel-card flex flex-col items-center gap-3 p-6 max-w-lg mx-auto"
                style="border-color: var(--color-red);"
              >
                <span class="text-3xl" aria-hidden="true">&#10005;</span>
                <p class="text-[0.5rem] text-[var(--color-red)] text-center leading-loose">
                  ERROR AL FUSIONAR
                </p>
                <p class="text-[0.45rem] text-[var(--color-text-muted)] text-center leading-loose">
                  {{ fusionError() }}
                </p>
                <button
                  class="btn-pixel btn-danger mt-2"
                  (click)="fuse()"
                  aria-label="Reintentar la fusión"
                >
                  REINTENTAR
                </button>
              </div>
            }
          </section>
        }
      </main>

      <footer
        class="text-center px-4 py-4 border-t-4 border-[rgba(248,201,72,0.2)] text-[0.4rem] text-[var(--color-text-muted)] leading-loose"
        role="contentinfo"
      >
        POLIMERIZACION © 2026 · DATOS: POKEAPI · FUSIÓN: CLOUDFLARE AI
      </footer>
    </div>
  `,
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
