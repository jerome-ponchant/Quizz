import { Routes } from '@angular/router';
import { QuizzComponent } from './quizz/quizz.component'; // Importez votre composant
import { CategoryComponent } from './components/category/category.component';
import { PlantComponent } from './components/plant/plant.component';
import { PlantIdentifierComponent } from './components/plant-identifier/plant-identifier.component';
import { PlantDetailSandboxComponent } from './components/plant/plant-detail-sandbox/plant-detail-sandbox.component';

export const routes: Routes = [
  { path: 'quizz', component: QuizzComponent }, // L'URL sera /quizz
  { path: '', redirectTo: '/quizz', pathMatch: 'full' }, // Redirection par défaut (optionnel)
  { path: 'category', component: CategoryComponent },
  { path: 'plant', component: PlantComponent },
  { path: 'identification', component: PlantIdentifierComponent }
];
