import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { QUTIE_APPLY_URL } from '../../qutie.config';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavComponent implements OnInit {
  isDropdownVisible = false;
  isMobileMenuOpen = false;
  user: any = null;

  // Apply lives on Qutie - the navbar links straight there (no intermediate page).
  readonly applyUrl = QUTIE_APPLY_URL;

  constructor(public authService: AuthService) { }

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.user = user;
    });
  }

  toggleDropdown(): void {
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Prevent body scrolling when mobile menu is open
    document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
    }
  }

  logout(): void {
    this.authService.logout();
    this.isDropdownVisible = false;
    this.closeMobileMenu();
  }

  // Close mobile menu when window is resized to desktop size
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (window.innerWidth > 768 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }
}
