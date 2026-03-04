import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'pokefusion_user_id';

@Injectable({ providedIn: 'root' })
export class UserIdentityService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly userId: string = this.resolveUserId();

  private resolveUserId(): string {
    if (!isPlatformBrowser(this.platformId))
      return '';


    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;

    const newId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  }
}
