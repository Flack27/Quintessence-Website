import { Component, HostListener } from '@angular/core';
import { QUTIE_APPLY_URL } from '../../qutie.config';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
// The navbar shows nothing about sign-in state. Admins reach /login directly, and
// the signed-in controls live on the Codex page where publishing happens - so this
// component no longer needs the auth service at all.
export class NavComponent {
  isMobileMenuOpen = false;

  // Apply lives on Qutie - the navbar links straight there (no intermediate page).
  readonly applyUrl = QUTIE_APPLY_URL;

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

  // Close mobile menu when window is resized to desktop size
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (window.innerWidth > 768 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }
}
