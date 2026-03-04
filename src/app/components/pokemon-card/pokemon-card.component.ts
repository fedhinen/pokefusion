import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import type { Pokemon } from '../../../types/Pokemon';

type CardState = 'empty' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-pokemon-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './pokemon-card.component.html',
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
