import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { firstValueFrom, timer, switchMap } from 'rxjs';

export const ApplyGuard = async () => {
  const authService = inject(AuthService);

  authService.fetchUserInfo();

  const isAuthenticated = await firstValueFrom(
    timer(100).pipe( 
      switchMap(() => authService.isAuthenticated$)
    )
  );

  if (isAuthenticated) {
    return true;
  }

  window.location.href = '/api/accounts/login/apply';
  return false;
};
