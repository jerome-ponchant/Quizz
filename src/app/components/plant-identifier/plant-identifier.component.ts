import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlantImageManagerComponent } from '../gui/plant-image-manager/plant-image-manager.component';
// 💡 Importation du composant de détail et du service de catégories si nécessaire
import { PlantDetailComponent } from '../plant/plant-detail/plant-detail.component';
import { IdentificationService, IdentificationResult } from '../../services/identification.service';
import { PlantService } from '../../services/plant.service';
import { Plant } from '../../models/plant';
import { Category } from '../../models/category'; // À ajuster selon votre architecture
import { CategoryService } from '../../services/category.service'; // Optionnel (voir remarque ci-dessous)

@Component({
  selector: 'app-plant-identifier',
  standalone: true,
  // 💡 Ajout de PlantDetailComponent dans les imports
  imports: [CommonModule, PlantImageManagerComponent, PlantDetailComponent],
  templateUrl: './plant-identifier.component.html',
  styleUrls: ['./plant-identifier.component.css']
})
export class PlantIdentifierComponent {
  private identificationService = inject(IdentificationService);
  private plantService = inject(PlantService);
  // private categoryService = inject(CategoryService); // Optionnel : si vous devez charger toutes les catégories

  uploadPrefix$ = this.plantService.getPrefix();

  // Remplacer par un vrai tableau vide ou charger via un service si requis par le formulaire
  allCategories: Category[] = [];

  temporaryPlant: any = {
    id: 0,
    name: 'identification-scan',
    images: []
  };

  // Signaux pour piloter l'état de l'interface
  isAnalyzing = signal<boolean>(false);
  analysisResult = signal<IdentificationResult | null>(null);
  errorMessage = signal<string | null>(null);
  matchingPlant = signal<Plant | null>(null);

  // 💡 Nouveaux signaux pour piloter le composant PlantDetail
  showDetailForm = signal<boolean>(false);
  plantToEdit = signal<any | null>(null);

  async identifyPlant() {
    const imagesArray = this.temporaryPlant.images;

    if (!imagesArray || imagesArray.length === 0) {
      this.errorMessage.set('Veuillez ajouter au moins une image avant de lancer l\'analyse.');
      return;
    }

    this.isAnalyzing.set(true);
    this.analysisResult.set(null);
    this.errorMessage.set(null);
    this.showDetailForm.set(false); // On cache un ancien formulaire si actif

    const filesToIdentify = imagesArray.map((img: any) => img.rawFile);

    this.identificationService.identifyPlantFromImages(filesToIdentify).subscribe({
      next: (result) => {
        this.analysisResult.set(result);
        if (result && result.scientificName) {
          this.checkIfPlantExists(result.scientificName);
        } else {
          this.isAnalyzing.set(false);
        }
      },
      error: (err) => {
        console.error("Erreur lors de l'identification :", err);
        this.errorMessage.set("Une erreur est survenue lors de l'analyse par l'IA.");
        this.isAnalyzing.set(false);
      }
    });
  }

  private checkIfPlantExists(scientificName: string) {
    this.plantService.findAll(1, scientificName).subscribe({
      next: (res) => {
        const found = res.plants.find(
          p => p.name?.toLowerCase() === scientificName.toLowerCase()
        );

        if (found) {
          this.matchingPlant.set(found);
        } else {
          this.matchingPlant.set(null);
        }
        this.isAnalyzing.set(false);
      },
      error: (err) => {
        console.error("Erreur lors de la vérification en BDD :", err);
        this.matchingPlant.set(null);
        this.isAnalyzing.set(false);
      }
    });
  }

  resetScanner() {
    this.temporaryPlant = {
      id: 0,
      name: 'identification-scan',
      images: []
    };
    this.analysisResult.set(null);
    this.errorMessage.set(null);
    this.matchingPlant.set(null);
    this.showDetailForm.set(false);
    this.plantToEdit.set(null);
  }

  /**
   * 💡 Action de création d'une nouvelle plante pré-remplie
   */
  createPlantFromAnalysis() {
    const result = this.analysisResult();
    if (!result) return;

    // Structure "fausse" plante (sans ID) attendue par PlantDetailComponent en mode création
    const newPlantData = {
      name: result.scientificName,
      commonName: result.vernacularName || '',
      description: result.analysis || '',
      categories: [],
      // Transfert des images chargées temporairement lors du scan
      images: [...this.temporaryPlant.images]
    };

    this.plantToEdit.set(newPlantData);
    this.showDetailForm.set(true);
  }

  /**
   * 💡 Action de mise à jour d'une plante existante trouvée en BDD
   */
  updatePlantFromAnalysis() {
    const currentMatching = this.matchingPlant();
    const result = this.analysisResult();
    if (!currentMatching || !result) return;

    // On clone l'entité de la base de données
    const updatedPlantData = { ...currentMatching };

    // Règle : Si la description existante est vide, on injecte l'analyse IA
    if (!updatedPlantData.description || updatedPlantData.description.trim() === '') {
      updatedPlantData.description = result.analysis || '';
    }

    // Règle : Ajouter les photos du scan actuel aux images déjà existantes de la plante
    const existingImages = updatedPlantData.images || [];
    updatedPlantData.images = [...existingImages, ...this.temporaryPlant.images];

    this.plantToEdit.set(updatedPlantData);
    this.showDetailForm.set(true);
  }

  /**
   * 💡 Gère la fin de l'action dans PlantDetail (fermeture et reset complet)
   */
  onDetailActionCompleted() {
    this.resetScanner();
  }
}
