import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { Pokemon } from '../../types/Pokemon';
import type { PokemonFusion } from '../../types/Fusion';
import { WorkerAiRequest, WorkerAiResponse } from '../../types/Cloudflare';

@Injectable({ providedIn: 'root' })
export class PolimerizationService {
  private readonly http = inject(HttpClient);

  fuse(pokemons: [Pokemon, Pokemon, Pokemon]): Observable<PokemonFusion> {
    const prompt = this.buildFusionPrompt(pokemons);

    const body: WorkerAiRequest = {
      messages: [
        {
          role: 'system',
          content:
            'You are a Pokémon fusion expert. You always respond with raw valid JSON only, no markdown, no explanation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    return this.http.post<WorkerAiResponse>('/api/fuse', body).pipe(
      map((response) => {
        const raw = response.result.choices[0].message.content.trim();
        return JSON.parse(raw) as PokemonFusion;
      }),
    );
  }

  generateImage(fusion: PokemonFusion): Observable<Blob> {
    const prompt = this.buildImagePrompt(fusion);
    return this.http.post('/api/generate-image', { prompt }, { responseType: 'blob' });
  }

  buildPokemonSummary(pokemon: Pokemon): string {
    const types = pokemon.types.map((t) => t.type.name).join(', ');
    const stats = pokemon.stats.map((s) => `${s.stat.name}: ${s.base_stat}`).join(', ');
    const abilities = pokemon.abilities
      .map((a) => `${a.ability.name}${a.is_hidden ? ' (hidden)' : ''}`)
      .join(', ');
    const moves = pokemon.moves
      .slice(0, 5)
      .map((m) => m.move.name)
      .join(', ');

    return `
Name: ${pokemon.name}
Height: ${pokemon.height}
Weight: ${pokemon.weight}
Types: ${types}
Stats: ${stats}
Abilities: ${abilities}
Sample moves: ${moves}`.trim();
  }

  buildFusionPrompt(pokemons: [Pokemon, Pokemon, Pokemon]): string {
    const [p1, p2, p3] = pokemons;

    return `Given the data of three Pokémon, create a new fused Pokémon that combines traits from all three.

Here are the three source Pokémon:

--- Pokémon 1 ---
${this.buildPokemonSummary(p1)}

--- Pokémon 2 ---
${this.buildPokemonSummary(p2)}

--- Pokémon 3 ---
${this.buildPokemonSummary(p3)}

Create a fusion and respond ONLY with a valid JSON object matching this TypeScript interface (no explanation, no markdown, no code block, just raw JSON):

{
  "name": string,           // creative fusion name: blend syllables from the three Pokémon names only (e.g. snorlax+incineroar+duosion → "Snociron"). MUST be a single invented word. Do NOT use type names, move names, ability names, or any word other than a syllable blend of the source names.
  "height": number,         // average height of the three, in decimetres
  "weight": number,         // average weight of the three, in hectograms
  "types": [                // 1 or 2 types, chosen from the source Pokémon types
    { "name": string, "slot": number }
  ],
  "stats": [                // exactly these 6 stats with averaged/blended base_stat values
    { "name": "hp", "base_stat": number },
    { "name": "attack", "base_stat": number },
    { "name": "defense", "base_stat": number },
    { "name": "special-attack", "base_stat": number },
    { "name": "special-defense", "base_stat": number },
    { "name": "speed", "base_stat": number }
  ],
  "moves": [                // 4 to 8 moves picked from the source Pokémon moves
    { "name": string, "url": string }
  ],
  "ability": {              // one ability from the source Pokémon
    "name": string,
    "is_hidden": boolean
  },
  "sources": ["${p1.name}", "${p2.name}", "${p3.name}"]
}`;
  }

  buildImagePrompt(fusion: PokemonFusion): string {
    const sourceNames = fusion.sources.join(', ');
    const types = fusion.types.map((t) => t.name).join(' and ');

    return `16-bit pixel art style Pokémon sprite of a fusion creature named "${fusion.name}". 
    It is a fusion of the original Pokémon: ${sourceNames}. 
    It has ${types} typing. 
    The art style should resemble classic Game Boy Color or GBA Pokémon sprites: 
    limited color palette, pixel-perfect details, white background, centered pose, full body visible.`;
  }
}
