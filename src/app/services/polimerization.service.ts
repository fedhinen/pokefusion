import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { Pokemon } from '../../types/Pokemon';
import type { PokemonFusion } from '../../types/Fusion';

const CLOUDFLARE_AI_URL = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/ibm-granite/granite-4.0-h-micro`;

interface CloudflareMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CloudflareRequest {
  messages: CloudflareMessage[];
}

interface CloudflareResponse {
  result: {
    response: string;
  };
  success: boolean;
  errors: unknown[];
}

function buildPokemonSummary(pokemon: Pokemon): string {
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

function buildFusionPrompt(pokemons: [Pokemon, Pokemon, Pokemon]): string {
  const [p1, p2, p3] = pokemons;

  return `Given the data of three Pokémon, create a new fused Pokémon that combines traits from all three.

Here are the three source Pokémon:

--- Pokémon 1 ---
${buildPokemonSummary(p1)}

--- Pokémon 2 ---
${buildPokemonSummary(p2)}

--- Pokémon 3 ---
${buildPokemonSummary(p3)}

Create a fusion and respond ONLY with a valid JSON object matching this TypeScript interface (no explanation, no markdown, no code block, just raw JSON):

{
  "name": string,           // creative fusion name combining syllables from the source names
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

@Injectable({ providedIn: 'root' })
export class PolimerizationService {
  private readonly http = inject(HttpClient);

  private readonly accountId = process.env['CLOUDFLARE_ACCOUNT_ID'] ?? '';
  private readonly authToken = process.env['CLOUDFLARE_AUTH_TOKEN'] ?? '';

  fuse(pokemons: [Pokemon, Pokemon, Pokemon]): Observable<PokemonFusion> {
    const url = CLOUDFLARE_AI_URL(this.accountId);
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    });

    const body: CloudflareRequest = {
      messages: [
        {
          role: 'system',
          content:
            'You are a Pokémon fusion expert. You always respond with raw valid JSON only, no markdown, no explanation.',
        },
        {
          role: 'user',
          content: buildFusionPrompt(pokemons),
        },
      ],
    };

    return this.http.post<CloudflareResponse>(url, body, { headers }).pipe(
      map((response) => {
        const raw = response.result.response.trim();
        return JSON.parse(raw) as PokemonFusion;
      }),
    );
  }
}
