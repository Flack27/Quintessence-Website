import { Component } from '@angular/core';
import { QUTIE_APPLY_URL } from '../../qutie.config';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  // Apply lives on Qutie - link straight there (same as the navbar).
  readonly applyUrl = QUTIE_APPLY_URL;
  readonly year = new Date().getFullYear();
}
