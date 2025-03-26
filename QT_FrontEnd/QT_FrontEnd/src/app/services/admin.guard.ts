import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

export const adminGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for isAdmin to resolve
  const isAdmin = await firstValueFrom(authService.isAdmin$);

  if (isAdmin) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
