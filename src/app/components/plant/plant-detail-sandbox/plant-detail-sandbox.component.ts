import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Plant } from '../../../models/plant';
import { Category } from '../../../models/category';
import { CategoryService } from '../../../services/category.service';
import { PlantService } from '../../../services/plant.service';
import { PlantDetailComponent } from '../plant-detail/plant-detail.component';

@Component({
  selector: 'app-plant-detail-sandbox',
  standalone: true,
  imports: [CommonModule, PlantDetailComponent],
  templateUrl: './plant-detail-sandbox.component.html',
  styleUrls: ['./plant-detail-sandbox.component.css']
})
export class PlantDetailSandboxComponent implements OnInit {

  // Liste locale simulant le Backend
  mockPlants: any[] = [
    {
      id: 1,
      name: 'Schefflera arboricola',
      commonName: 'Arbre-parapluie nain',
      description: 'Plante robuste aux feuilles palmées.',
      images: [],
      categories: ['/api/categories/1']
    },
    {
      id: 2,
      name: 'Monstera deliciosa',
      commonName: 'Faux philodendron',
      description: 'Grandes feuilles perforées caractéristiques.',
      images: [],
      categories: ['/api/categories/2']
    }
  ];

  categories: Category[] = [];
  uploadPrefix = 'uploads/'; // Simulé pour le test

  // L'état envoyé au composant PlantDetail
  selectedPlant: any | null = null;

  constructor(
    private categoryService: CategoryService,
    private plantService: PlantService // Optionnel si vous préférez mocker complètement le CRUD
  ) {}

  ngOnInit(): void {
    // Chargement des catégories pour alimenter l'arbre du composant enfant
    this.categoryService.findAll().subscribe({
      next: (data) => this.categories = data,
      error: (err) => console.error('Erreur catégories sandbox:', err)
    });
  }

  // Action : Forcer le mode "Création"
  prepareNewPlant() {
    this.selectedPlant = null;
    // Note : Si selectedPlant est null, PlantDetail doit afficher "Nouvelle fiche plante"
  }

  // Action : Sélectionner une plante existante (Simule le clic dans une liste)
  selectPlant(plant: any) {
    // On passe une copie profonde pour éviter de modifier la liste locale avant d'avoir cliqué sur Enregistrer
    this.selectedPlant = JSON.parse(JSON.stringify(plant));
  }

  // Action : Interception du bouton Enregistrer (Gère CREATE et UPDATE)
  handleSave(localFormPayload: any) {
    console.log('Sandbox - Payload reçu de PlantDetail:', localFormPayload);

    if (localFormPayload.id) {
      // --- MODE UPDATE ---
      const index = this.mockPlants.findIndex(p => p.id === localFormPayload.id);
      if (index !== -1) {
        this.mockPlants[index] = { ...localFormPayload };
        this.selectedPlant = JSON.parse(JSON.stringify(this.mockPlants[index]));
        alert(`Plante ID #${localFormPayload.id} mise à jour dans le backend fictif !`);
      }
    } else {
      // --- MODE CREATE ---
      const newId = this.mockPlants.length > 0 ? Math.max(...this.mockPlants.map(p => p.id ?? 0)) + 1 : 1;
      const newPlant = {
        ...localFormPayload,
        id: newId
      };
      this.mockPlants.push(newPlant);
      // On sélectionne la plante nouvellement créée
      this.selectedPlant = JSON.parse(JSON.stringify(newPlant));
      alert(`Nouvelle plante créée avec l'ID #${newId} !`);
    }
  }

  // Action : Bouton de suppression déclenché depuis le Sandbox (comme demandé)
  deleteCurrentPlant() {
    if (!this.selectedPlant || !this.selectedPlant.id) return;

    const idToDelete = this.selectedPlant.id;
    if (confirm(`Êtes-vous sûr de vouloir supprimer la plante active (ID: ${idToDelete}) ?`)) {
      // Simulation du DELETE backend
      this.mockPlants = this.mockPlants.filter(p => p.id !== idToDelete);

      // Remise à vide immédiate de la plante active
      this.selectedPlant = null;
      alert(`Plante #${idToDelete} supprimée. Le détail est repassé à vide.`);
    }
  }

  // Action : Calcul des implications de catégories à la volée
  handleImplications(currentIdsSet: Set<number>, detailComponent: PlantDetailComponent) {
    const resultSet = this.categoryService.findImpliedCategories(currentIdsSet, this.categories);
    // On réinjecte le résultat directement dans le signal du composant enfant
    detailComponent.selectedCategoryIds.set(resultSet);
  }
}
