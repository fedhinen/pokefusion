import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import type { PokemonFusion } from '../../../types/Fusion';

type ImageState = 'idle' | 'loading' | 'done' | 'error';

@Component({
  selector: 'app-fusion-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="pixel-card glow-pulse slide-up relative w-full p-6 flex flex-col gap-6"
      aria-label="Resultado de fusión"
      aria-live="polite"
    >
      <div class="flex flex-col items-center gap-3">
        <p class="text-[0.45rem] text-[var(--color-text-muted)] uppercase tracking-widest">
          Fusión creada
        </p>
        <h2
          class="text-[0.7rem] text-[var(--color-accent)] uppercase tracking-widest text-center leading-loose"
        >
          {{ fusion().name }}
        </h2>

        <div
          class="flex flex-wrap gap-2 justify-center items-center"
          role="list"
          aria-label="Pokémon fuente"
        >
          @for (src of fusion().sources; track src; let last = $last) {
            <span
              role="listitem"
              class="text-[0.4rem] px-2 py-1 border-2 border-[var(--color-accent)] text-[var(--color-accent)] uppercase"
              >{{ src }}</span
            >
            @if (!last) {
              <span class="text-[0.45rem] text-[var(--color-text-muted)]" aria-hidden="true"
                >+</span
              >
            }
          }
          <span class="text-[0.45rem] text-[var(--color-text-muted)]" aria-hidden="true">▶</span>
          <span class="text-[0.5rem] text-[var(--color-accent)] font-bold uppercase">{{
            fusion().name
          }}</span>
        </div>
      </div>

      <div class="w-full h-[4px] bg-[var(--color-accent)] opacity-40"></div>

      <div class="flex flex-col lg:flex-row gap-6 w-full">
        <div class="flex flex-col gap-4 flex-1 min-w-0">
          <div class="flex flex-wrap items-start gap-4">
            <div class="flex gap-1 flex-wrap" role="list" aria-label="Tipos de la fusión">
              @for (t of fusion().types; track t.slot) {
                <span
                  role="listitem"
                  class="type-{{
                    t.name
                  }} text-white text-[0.45rem] px-3 py-1 uppercase font-bold tracking-wider"
                  style="font-family: 'Press Start 2P', monospace; border: 2px solid rgba(0,0,0,0.3);"
                  >{{ t.name }}</span
                >
              }
            </div>

            <div class="flex gap-4 ml-auto">
              <div>
                <p class="text-[0.4rem] text-[var(--color-text-muted)] uppercase">ALT</p>
                <p class="text-[0.45rem] text-[var(--color-text-primary)]">
                  {{ (fusion().height / 10).toFixed(1) }}m
                </p>
              </div>
              <div>
                <p class="text-[0.4rem] text-[var(--color-text-muted)] uppercase">PESO</p>
                <p class="text-[0.45rem] text-[var(--color-text-primary)]">
                  {{ (fusion().weight / 10).toFixed(1) }}kg
                </p>
              </div>
            </div>
          </div>

          <div class="w-full h-[2px] bg-[var(--color-text-muted)] opacity-20"></div>

          <div class="flex flex-col gap-2" role="list" aria-label="Estadísticas de la fusión">
            @for (stat of fusionStats(); track stat.name) {
              <div class="flex items-center gap-2" role="listitem">
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
                  class="text-[0.4rem] text-[var(--color-text-primary)] w-7 text-right shrink-0"
                  >{{ stat.value }}</span
                >
              </div>
            }
          </div>

          <div class="w-full h-[2px] bg-[var(--color-text-muted)] opacity-20"></div>

          <div class="flex flex-col gap-1">
            <p class="text-[0.4rem] text-[var(--color-text-muted)] uppercase tracking-widest">
              Habilidad
            </p>
            <p class="text-[0.45rem] text-[var(--color-accent)]">
              {{ fusion().ability.name }}
              @if (fusion().ability.is_hidden) {
                <span class="text-[0.4rem] text-[var(--color-text-muted)] ml-2">(oculta)</span>
              }
            </p>
          </div>

          <div class="flex flex-col gap-1">
            <p class="text-[0.4rem] text-[var(--color-text-muted)] uppercase tracking-widest">
              Movimientos
            </p>
            <div class="flex flex-wrap gap-1" role="list" aria-label="Movimientos">
              @for (move of fusion().moves; track move.name) {
                <span
                  role="listitem"
                  class="text-[0.4rem] text-[var(--color-text-primary)] px-2 py-1 border border-[rgba(248,201,72,0.3)] bg-[rgba(248,201,72,0.05)] uppercase"
                  >{{ move.name }}</span
                >
              }
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center gap-3 lg:w-56 shrink-0">
          <p class="text-[0.4rem] text-[var(--color-text-muted)] uppercase tracking-widest">
            Sprite IA
          </p>

          <div
            class="pixel-card w-full aspect-square flex items-center justify-center relative overflow-hidden scanlines"
            style="border-color: rgba(248,201,72,0.4); min-height: 160px;"
            [attr.aria-label]="imageAriaLabel()"
            [attr.aria-busy]="imageState() === 'loading'"
          >
            @if (imageState() === 'loading') {
              <div class="flex flex-col items-center gap-3 p-4" role="status" aria-live="polite">
                <div class="pokeball-spin" aria-hidden="true"></div>
                <p class="text-[0.45rem] text-[var(--color-accent)] blink text-center">
                  GENERANDO...
                </p>
                <p class="text-[0.4rem] text-[var(--color-text-muted)] text-center leading-loose">
                  Pintando<br />pixel a pixel
                </p>
              </div>
            }

            @if (imageState() === 'done' && imageUrl()) {
              <img
                [src]="imageUrl()!"
                [alt]="'Sprite de ' + fusion().name + ' generado por IA'"
                class="w-full h-full object-contain"
                style="image-rendering: pixelated;"
              />
            }

            @if (imageState() === 'error') {
              <div
                class="flex flex-col items-center gap-2 p-4 text-center"
                role="alert"
                aria-live="assertive"
              >
                <span class="text-2xl" aria-hidden="true">&#9888;</span>
                <p class="text-[0.4rem] text-[var(--color-red)] leading-loose">
                  ERROR AL<br />GENERAR
                </p>
                @if (imageError()) {
                  <p class="text-[0.35rem] text-[var(--color-text-muted)] leading-loose">
                    {{ imageError() }}
                  </p>
                }
              </div>
            }

            @if (imageState() === 'idle') {
              <div class="flex flex-col items-center gap-2 opacity-30" aria-hidden="true">
                <div
                  class="w-16 h-16 border-4 border-dashed border-[var(--color-accent)] rounded-full flex items-center justify-center"
                >
                  <span class="text-2xl">?</span>
                </div>
              </div>
            }
          </div>

          @if (imageState() === 'done') {
            <p
              class="text-[0.4rem] text-[var(--color-green)] uppercase tracking-widest text-center"
            >
              &#10003; LISTO
            </p>
          }
          @if (imageState() === 'loading') {
            <p
              class="text-[0.4rem] text-[var(--color-accent)] uppercase tracking-widest text-center blink"
            >
              IA TRABAJANDO...
            </p>
          }
        </div>
      </div>
    </section>
  `,
})
export class FusionResultComponent {
  readonly fusion = input.required<PokemonFusion>();
  readonly imageState = input<ImageState>('idle');
  readonly imageUrl = input<string | null>(null);
  readonly imageError = input<string | null>(null);

  readonly imageAriaLabel = computed(() => {
    const s = this.imageState();
    const name = this.fusion().name;
    if (s === 'loading') return `Generando imagen de ${name}...`;
    if (s === 'done') return `Imagen de ${name} generada`;
    if (s === 'error') return `Error al generar imagen de ${name}`;
    return `Imagen de ${name}`;
  });

  readonly fusionStats = computed(() => {
    const statMap: Record<string, { abbr: string; color: string }> = {
      hp: { abbr: 'HP', color: 'bg-[#ff5959]' },
      attack: { abbr: 'AT', color: 'bg-[#f5ac78]' },
      defense: { abbr: 'DF', color: 'bg-[#fae078]' },
      'special-attack': { abbr: 'SA', color: 'bg-[#9db7f5]' },
      'special-defense': { abbr: 'SD', color: 'bg-[#a7db8d]' },
      speed: { abbr: 'SP', color: 'bg-[#fa92b2]' },
    };

    return this.fusion().stats.map((s) => {
      const meta = statMap[s.name] ?? {
        abbr: s.name.slice(0, 2).toUpperCase(),
        color: 'bg-[var(--color-accent)]',
      };
      return {
        name: s.name,
        abbr: meta.abbr,
        color: meta.color,
        value: Math.ceil(s.base_stat),
        pct: Math.min(100, Math.round((s.base_stat / 255) * 100)),
      };
    });
  });
}
