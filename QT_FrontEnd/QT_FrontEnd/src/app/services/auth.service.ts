import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  private isAdminSubject = new BehaviorSubject<boolean | null>(null);
  public isAdmin$: Observable<boolean | null> = this.isAdminSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean | null>(null);
  public isAuthenticated$: Observable<boolean | null> = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.fetchUserInfo(); 
  }

  fetchUserInfo() {
    const cachedUser = localStorage.getItem('userInfo');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      this.userSubject.next(user);
      this.updateAdminStatus(user);
      this.updateAuthenticatedStatus(user);
    }

    this.http.get('api/accounts/info', { withCredentials: true }).subscribe({
      next: (userInfo: any) => {
        this.userSubject.next(userInfo);
        this.updateAdminStatus(userInfo);
        this.updateAuthenticatedStatus(userInfo);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      },
      error: () => {
        this.userSubject.next(null);
        this.isAdminSubject.next(false);
        this.updateAuthenticatedStatus(false);
        localStorage.removeItem('userInfo');
      },
    });
  }

  refreshUserInfo(): void {
    this.fetchUserInfo(); 
  }

  private updateAdminStatus(user: any): void {
    const isAdmin = user?.claims?.is_admin === 'true';
    this.isAdminSubject.next(isAdmin); 
  }

  private updateAuthenticatedStatus(user: any): void {
    const isAuthenticated = user?.isAuthenticated === true;
    this.isAuthenticatedSubject.next(isAuthenticated);
  }

  logout(): void {
    this.http.post('api/accounts/logout', { withCredentials: true }).subscribe({
      next: () => {
        this.userSubject.next(null);
        this.isAdminSubject.next(false);
        this.updateAuthenticatedStatus(false);
        localStorage.removeItem('userInfo');

      },
      error: () => {
        console.error('Logout failed');
      },
    });
  }
}
