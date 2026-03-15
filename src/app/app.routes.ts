import { Routes } from '@angular/router';
import { QuizzComponent } from './quizz/quizz.component'; // Importez votre composant

export const routes: Routes = [
  { path: 'quizz', component: QuizzComponent }, // L'URL sera /quizz
  { path: '', redirectTo: '/quizz', pathMatch: 'full' } // Redirection par défaut (optionnel)
];
