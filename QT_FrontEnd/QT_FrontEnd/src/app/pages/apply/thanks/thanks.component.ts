import { Component } from '@angular/core';

@Component({
  selector: 'app-thanks',
  templateUrl: './thanks.component.html',
  styleUrl: './thanks.component.css'
})
export class ThanksComponent {

  scrollToTop(): void {
    // Add a small timeout to ensure navigation completes first
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);
  }
}
