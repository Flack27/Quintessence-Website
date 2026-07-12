import { Component, OnInit } from '@angular/core';

/**
 * Hidden admin entrance: there is no login button anywhere on the site,
 * admins simply visit /login to go through Discord OAuth.
 */
@Component({
  selector: 'app-login',
  template: `
    <div class="login-redirect">
      <p>Redirecting to Discord login&hellip;</p>
    </div>
  `,
  styles: [`
    .login-redirect {
      text-align: center;
      padding: 120px 20px;
      color: #cfcfcf;
    }
  `]
})
export class LoginComponent implements OnInit {
  ngOnInit(): void {
    window.location.href = '/api/accounts/login/home';
  }
}
