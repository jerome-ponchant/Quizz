import { Component, OnInit, afterNextRender } from '@angular/core';
import { PlantService } from '../services/plant.service';
import { Plant } from '../models/plant';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { CategoryListComponent } from '../components/gui/category-list/category-list.component';
import { CategoryService } from '../services/category.service';
import { Category } from '../models/category';
import { PlantImageManagerComponent } from '../components/gui/plant-image-manager/plant-image-manager.component';

enum AnswerType {
  QCM = 'QCM',
  TEXT = 'TEXT',
}

@Component({
  selector: 'app-quizz',
  standalone: true,
  imports: [FormsModule, CommonModule, CategoryListComponent, PlantImageManagerComponent],
  templateUrl: './quizz.component.html',
  styleUrl: './quizz.component.css',
})
export class QuizzComponent implements OnInit {
  public answerTypes = AnswerType;
  selectedType = AnswerType.TEXT;
  fetchedPlants: Plant[] = [];
  currentPlant?: Plant;
  floriscopeUrl?: string = '';
  userAnswer: string = '';
  isLoading: boolean = false;
  apiUrl = environment.apiUrl;
  uploadPrefix$ = this.quizzService.getPrefix();

  // Données de filtrage par catégories
  categories: Category[] = [];
  selectedCategoryIds = new Set<number>();

  // Statistiques
  totalCorrect: number = 0;
  currentStreak: number = 0;
  bestStreak: number = 0;
  isNewRecord: boolean = false;

  // Gestion des plantes difficiles (ID -> nombre d'échecs)
  failedPlants: Map<number, Plant> = new Map();

  feedback: { message: string; status: 'success' | 'error' | 'record' } | null =
    null;

  score: number = 0; // Nouveau : Système de points
  quizzOptions: Plant[] = []; // Nouveau : Les 6 choix du QCM

  constructor(private quizzService: PlantService, private categoryService: CategoryService) {
    afterNextRender(() => {
      this.loadFromStorage();
    });
  }

  ngOnInit(): void {
    this.loadFilterCategories();
    this.loadNextPlant();
  }

  // Charge le catalogue pour alimenter le sélecteur d'arborescence
  loadFilterCategories() {
    this.categoryService.findAll().subscribe({
      next: (data) => this.categories = data,
      error: (err) => console.error('Erreur chargement filtres', err)
    });
  }

  // Déclenché dès qu'on coche/décoche des catégories dans le dropdown
  onCategoryFilterChange(ids: Set<number>) {
    // On relance immédiatement une nouvelle question adaptée aux nouveaux filtres !
    this.selectedCategoryIds = ids;
    this.loadNextPlant();
  }

  loadNextPlant(): void {
    this.isLoading = true;
    this.feedback = null;
    this.userAnswer = '';
    this.isNewRecord = false;
    this.selectedType = AnswerType.TEXT;
    this.quizzOptions = []; // Reset des options

    const failedIds: number[] = Array.from(this.failedPlants.keys());
    const categoryIds: number[] = Array.from(this.selectedCategoryIds);

    this.quizzService.getNewQuestion(failedIds, categoryIds).subscribe((q) => {
      this.currentPlant = q.target;
      this.floriscopeUrl =
        environment.floriscopeUrl + this.currentPlant.name.replaceAll(' ', '+');
      this.quizzOptions = q.options;
      this.isLoading = false;
    });
  }

  checkAnswer(optionSelected?: Plant): void {
    if (!this.currentPlant || this.feedback?.status === 'success') return;

    let isCorrect = false;
    let pointsEarned = 0;

    if (this.selectedType == AnswerType.QCM) {
      // Mode QCM
      isCorrect = optionSelected?.id === this.currentPlant.id;
      pointsEarned = 1;
    } else {
      // Mode Saisie manuelle
      isCorrect =
        this.userAnswer
          .replaceAll(/['=‘’]/g, ' ')
          .replaceAll(/\s+/g, ' ')
          .toLowerCase() ===
        this.currentPlant.name
          .replaceAll(/['=’‘]/g, ' ')
          .replaceAll(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      this.failedPlants.delete(this.currentPlant.id);
      pointsEarned = 10;
    }

    if (isCorrect) {
      this.totalCorrect++;
      this.currentStreak++;
      this.score += pointsEarned; // Ajout des points

      this.feedback = {
        message: `Bravo ! +${pointsEarned}pt(s). C'était bien ${this.currentPlant.name}`,
        status: 'success',
      };

      if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
        this.feedback.status = 'record';
      }
    } else {
      this.failedPlants.set(this.currentPlant.id, this.currentPlant);
      this.currentStreak = 0;
      this.feedback = {
        message: `Hélas... C'était : ${this.currentPlant.name}`,
        status: 'error',
      };
    }
    setTimeout(() => this.loadNextPlant(), 5000);
    this.saveToStorage();
  }

  public selectType(type: AnswerType): void {
    // Logique "sans retour en arrière" : on ne change que si c'est la première fois
    if (this.selectedType == AnswerType.TEXT) {
      this.selectedType = type;
    }
  }

  private saveToStorage(): void {
    // On transforme la Map en tableau pour pouvoir la sérialiser en JSON
    const failedPlantsArray = Array.from(this.failedPlants.entries());

    const dataToSave = {
      totalCorrect: this.totalCorrect,
      bestStreak: this.bestStreak,
      score: this.score,
      failedPlants: failedPlantsArray,
    };

    localStorage.setItem('botanica_game_data', JSON.stringify(dataToSave));
  }

  private loadFromStorage(): void {
    const savedData = localStorage.getItem('botanica_game_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      this.totalCorrect = parsed.totalCorrect || 0;
      this.bestStreak = parsed.bestStreak || 0;
      this.score = parsed.score || 0;

      // On reconstruit la Map à partir du tableau sauvegardé
      if (parsed.failedPlants) {
        this.failedPlants = new Map(parsed.failedPlants);
      }
    }
  }

  giveUp(): void {
    if (!this.currentPlant) return;

    // 1. On casse la série de victoires (streak)
    this.currentStreak = 0;

    // 2. On ajoute la plante aux échecs pour qu'elle revienne plus tard
    this.failedPlants.set(this.currentPlant.id, this.currentPlant);
    this.saveToStorage();

    // 3. On affiche la réponse avec un statut spécifique
    this.feedback = {
      message: `C'était : ${this.currentPlant.name}. Elle est ajoutée à vos révisions.`,
      status: 'error',
    };

    // 4. On laisse l'utilisateur voir la réponse avant de passer à la suite
    // On ne le force pas à cliquer, on attend 3 secondes
    setTimeout(() => this.loadNextPlant(), 3500);
  }

  resetStats(): void {
    if (confirm('Voulez-vous vraiment effacer vos records et révisions ?')) {
      localStorage.removeItem('botanica_game_data');
      this.totalCorrect = 0;
      this.bestStreak = 0;
      this.currentStreak = 0;
      this.score = 0;
      this.failedPlants.clear();
    }
  }
}
