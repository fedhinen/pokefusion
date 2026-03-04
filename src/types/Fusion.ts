import type { Stat4, Type4 } from './Pokemon';

export interface FusionStat {
  name: Stat4['name'];
  base_stat: number;
}

export interface FusionType {
  name: Type4['name'];
  slot: number;
}

export interface FusionAbility {
  name: string;
  is_hidden: boolean;
}

export interface FusionMove {
  name: string;
  url: string;
}

export interface PokemonFusion {
  name: string;
  height: number;
  weight: number;
  types: FusionType[];
  stats: FusionStat[];
  moves: FusionMove[];
  ability: FusionAbility;
  sources: [string, string, string];
}
