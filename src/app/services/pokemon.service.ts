import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pokemon } from '../../types/Pokemon';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/pokemon';

const POKEMON_COUNT = 1025;

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly http = inject(HttpClient);

  private randomPokemonId(): number {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return (buffer[0] % POKEMON_COUNT) + 1;
  }

  getPokemon(): Observable<Pokemon> {
    const id = this.randomPokemonId();
    return this.http.get<Pokemon>(`${POKEAPI_BASE_URL}/${id}`);
  }

}
