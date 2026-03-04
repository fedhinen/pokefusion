import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import type { PokemonFusion } from '../../../types/Fusion';

type ImageState = 'idle' | 'loading' | 'done' | 'error';

@Component({
  selector: 'app-fusion-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fusion-result.component.html',
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
