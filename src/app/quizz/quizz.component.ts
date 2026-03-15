import { Component, OnInit } from '@angular/core';
import { PlantService } from '../services/plant.service';
import { Plant } from '../models/plant';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-quizz',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './quizz.component.html',
  styleUrl: './quizz.component.css'
})
export class QuizzComponent implements OnInit {
  currentPlant?: Plant;
  floriscopeUrl?: string='';
  userAnswer: string = '';
  isLoading: boolean = false;
  apiUrl = environment.apiUrl;
  // Statistiques
  totalCorrect: number = 0;
  currentStreak: number = 0;
  bestStreak: number = 0;
  isNewRecord: boolean = false;

  // Gestion des plantes difficiles (ID -> nombre d'échecs)
  failedPlants: Map<number, Plant> = new Map();

  feedback: { message: string, status: 'success' | 'error' | 'record' } | null = null;

  constructor(private quizzService: PlantService) { }

  ngOnInit(): void {
    this.loadFromStorage();
    this.loadNextPlant();
  }

  loadNextPlant(): void {
    this.isLoading = true;
    this.feedback = null;
    this.userAnswer = '';
    this.isNewRecord = false;

    // Logique de sélection : 80% de chance de rejouer une plante ratée si la liste n'est pas vide
    if (this.failedPlants.size > 0 && Math.random() < 0.8) {
      const entries = Array.from(this.failedPlants.values());
      this.currentPlant = entries[Math.floor(Math.random() * entries.length)];
      this.floriscopeUrl=environment.floriscopeUrl+this.currentPlant?.name.replaceAll(" ","+");
      this.isLoading = false;
    } else {
      this.fetchRandomPlant();
    }
  }

  private fetchRandomPlant() {
    this.quizzService.getRandomPlant().subscribe({
      next: (plant: Plant | undefined) => {
        this.currentPlant = plant;
        this.floriscopeUrl=environment.floriscopeUrl+this.currentPlant?.name.replaceAll(" ","+");
        this.isLoading = false;
      }
    });
  }

  // Simulation d'une méthode pour récupérer une plante précise
  private fetchSpecificPlant(id: number) {
    // ... appel service ...
    this.fetchRandomPlant(); // fallback pour l'exemple
  }

  checkAnswer(): void {

    if (!this.currentPlant) return;

    const isCorrect = this.userAnswer.trim().toLowerCase() === this.currentPlant.name.toLowerCase();

    if (isCorrect) {
      // Succès : On la supprime de la liste des échecs si elle y était
      this.failedPlants.delete(this.currentPlant.id);

      this.totalCorrect++;
      this.currentStreak++;
      this.feedback = { message: `C'était bien  ${this.currentPlant.name}`, status: 'success' };
      if(this.currentStreak>this.bestStreak){
        this.bestStreak = this.currentStreak;
        this.feedback.status='record';
      }
      // ... reste de la logique de score ...

    } else {
      // Échec : On ajoute l'objet complet à notre Map
      this.failedPlants.set(this.currentPlant.id, this.currentPlant);

      this.currentStreak = 0;
      this.feedback = { message: `C'était : ${this.currentPlant.name}`, status: 'error' };
    }
    setTimeout(() => this.loadNextPlant(), 5000);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    // On transforme la Map en tableau pour pouvoir la sérialiser en JSON
    const failedPlantsArray = Array.from(this.failedPlants.entries());

    const dataToSave = {
      totalCorrect: this.totalCorrect,
      bestStreak: this.bestStreak,
      failedPlants: failedPlantsArray
    };

    localStorage.setItem('botanica_game_data', JSON.stringify(dataToSave));
  }

  private loadFromStorage(): void {
    const savedData = localStorage.getItem('botanica_game_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      this.totalCorrect = parsed.totalCorrect || 0;
      this.bestStreak = parsed.bestStreak || 0;

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
      status: 'error'
    };

    // 4. On laisse l'utilisateur voir la réponse avant de passer à la suite
    // On ne le force pas à cliquer, on attend 3 secondes
    setTimeout(() => this.loadNextPlant(), 3500);

  }

  resetStats(): void {
    if (confirm("Voulez-vous vraiment effacer vos records et révisions ?")) {
      localStorage.removeItem('botanica_game_data');
      this.totalCorrect = 0;
      this.bestStreak = 0;
      this.currentStreak = 0;
      this.failedPlants.clear();
    }
  }
}
