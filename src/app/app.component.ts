import { Component } from '@angular/core';
// 💡 Ajout des directives de navigation dans l'import
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  // 💡 Ajout de RouterLink et RouterLinkActive pour le HTML
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Herbier';
}
