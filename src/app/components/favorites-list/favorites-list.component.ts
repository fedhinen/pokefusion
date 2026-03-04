import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { SavedFusion } from '../../../types/Favorite';

@Component({
  selector: 'app-favorites-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './favorites-list.component.html',
})
export class FavoritesListComponent {
  readonly favorites = input<SavedFusion[]>([]);
  readonly selectedId = input<string | null>(null);

  readonly selected = output<SavedFusion>();
  readonly newFusion = output<void>();
}
