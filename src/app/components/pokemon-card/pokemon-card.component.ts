import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import type { Pokemon } from '../../../types/Pokemon';

type CardState = 'empty' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-pokemon-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <article
      class="pixel-card relative flex flex-col items-center justify-center min-h-[260px] p-4 w-full"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-busy]="state() === 'loading'"
    >
      @if (state() === 'empty') {
        <div class="flex flex-col items-center gap-3 opacity-50" aria-hidden="true">
          <div
            class="w-20 h-20 border-4 border-dashed border-[var(--color-accent)] rounded-full flex items-center justify-center"
          >
            <span class="text-3xl select-none">?</span>
          </div>
          <p class="text-[0.45rem] text-[var(--color-text-muted)] text-center leading-loose">
            RANURA<br />VACÍA
          </p>
        </div>
      }

      @if (state() === 'loading') {
        <div class="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <div class="pokeball-spin" aria-hidden="true"></div>
          <p class="text-[0.5rem] text-[var(--color-accent)] blink">CARGANDO...</p>
        </div>
      }

      @if (state() === 'error') {
        <div
          class="flex flex-col items-center gap-3 text-center"
          role="alert"
          aria-live="assertive"
        >
          <span class="text-4xl" aria-hidden="true">✕</span>
          <p class="text-[0.5rem] text-[var(--color-red)] leading-loose">ERROR AL<br />CARGAR</p>
        </div>
      }

      @if (state() === 'loaded' && pokemon()) {
        <div class="flex flex-col items-center gap-2 w-full">
          <p class="text-[0.45rem] text-[var(--color-text-muted)] self-end">
            #{{ pokemon()!.id.toString().padStart(3, '0') }}
          </p>

          <div class="relative w-24 h-24 flex items-center justify-center scanlines">
            @if (spriteUrl()) {
              <img
                [src]="spriteUrl()!"
                [alt]="pokemon()!.name"
                width="96"
                height="96"
                class="object-contain w-24 h-24"
                style="image-rendering: pixelated;"
              />
            } @else {
              <div class="w-24 h-24 flex items-center justify-center opacity-30">
                <span class="text-5xl" aria-hidden="true">?</span>
              </div>
            }
          </div>

          <h2
            class="text-[0.55rem] text-[var(--color-accent)] uppercase tracking-widest text-center mt-1 leading-relaxed"
          >
            {{ pokemon()!.name }}
          </h2>

          <div
            class="flex gap-1 flex-wrap justify-center mt-1"
            role="list"
            [attr.aria-label]="'Tipos de ' + pokemon()!.name"
          >
            @for (t of pokemon()!.types; track t.slot) {
              <span
                role="listitem"
                class="type-{{
                  t.type.name
                }} text-white text-[0.4rem] px-2 py-1 uppercase font-bold tracking-wider"
                style="font-family: 'Press Start 2P', monospace; border: 2px solid rgba(0,0,0,0.3);"
                >{{ t.type.name }}</span
              >
            }
          </div>

          <div class="w-full mt-2 flex flex-col gap-1" role="list" aria-label="Estadísticas base">
            @for (stat of compactStats(); track stat.name) {
              <div class="flex items-center gap-1" role="listitem">
                <span class="text-[0.4rem] text-[var(--color-text-muted)] w-6 uppercase shrink-0">{{
                  stat.abbr
                }}</span>
                <div class="stat-bar-track flex-1">
                  <div
                    class="stat-bar-fill {{ stat.color }}"
                    [style.width.%]="stat.pct"
                    [attr.aria-label]="stat.name + ': ' + stat.value"
                    role="img"
                  ></div>
                </div>
                <span
                  class="text-[0.4rem] text-[var(--color-text-primary)] w-6 text-right shrink-0"
                  >{{ stat.value }}</span
                >
              </div>
            }
          </div>
        </div>
      }

      <div
        class="absolute top-1 left-2 text-[0.4rem] text-[var(--color-text-muted)] opacity-60"
        aria-hidden="true"
      >
        P{{ slotNumber() }}
      </div>
    </article>
  `,
})
export class PokemonCardComponent {
  readonly pokemon = input<Pokemon | null>(null);
  readonly state = input<CardState>('empty');
  readonly slotNumber = input<number>(1);

  readonly ariaLabel = computed(() => {
    const s = this.state();
    const p = this.pokemon();
    if (s === 'empty') return `Ranura ${this.slotNumber()} vacía`;
    if (s === 'loading') return `Cargando Pokémon en ranura ${this.slotNumber()}`;
    if (s === 'error') return `Error al cargar ranura ${this.slotNumber()}`;
    return `Ranura ${this.slotNumber()}: ${p?.name ?? 'Pokémon'}`;
  });

  readonly spriteUrl = computed(() => {
    const p = this.pokemon();
    if (!p) return null;
    return (
      p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || null
    );
  });

  readonly compactStats = computed(() => {
    const p = this.pokemon();
    if (!p) return [];

    const statMap: Record<string, { abbr: string; color: string }> = {
      hp: { abbr: 'HP', color: 'bg-[#ff5959]' },
      attack: { abbr: 'AT', color: 'bg-[#f5ac78]' },
      defense: { abbr: 'DF', color: 'bg-[#fae078]' },
      'special-attack': { abbr: 'SA', color: 'bg-[#9db7f5]' },
      'special-defense': { abbr: 'SD', color: 'bg-[#a7db8d]' },
      speed: { abbr: 'SP', color: 'bg-[#fa92b2]' },
    };

    return p.stats.map((s) => {
      const meta = statMap[s.stat.name] ?? {
        abbr: s.stat.name.slice(0, 2).toUpperCase(),
        color: 'bg-[var(--color-accent)]',
      };
      return {
        name: s.stat.name,
        abbr: meta.abbr,
        color: meta.color,
        value: s.base_stat,
        pct: Math.min(100, Math.round((s.base_stat / 255) * 100)),
      };
    });
  });
}
