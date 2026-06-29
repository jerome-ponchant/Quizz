import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlantImageManagerComponent } from '../gui/plant-image-manager/plant-image-manager.component';
import { IdentificationService, IdentificationResult } from '../../services/identification.service';
import { PlantService } from '../../services/plant.service';

@Component({
  selector: 'app-plant-identifier',
  standalone: true,
  imports: [CommonModule, PlantImageManagerComponent],
  templateUrl: './plant-identifier.component.html',
  styleUrls: ['./plant-identifier.component.css']
})
export class PlantIdentifierComponent {
  private identificationService = inject(IdentificationService);
  private plantService = inject(PlantService);

  uploadPrefix$ = this.plantService.getPrefix();

  // Objet factice requis par le manager d'images.
  // L'id 0 évite d'impacter une vraie plante en BDD lors des requêtes d'upload imbriquées.
  temporaryPlant: any = {
    id: 0,
    name: 'identification-scan',
    images: []
  };

  // Signaux pour piloter l'état de l'interface
  isAnalyzing = signal<boolean>(false);
  analysisResult = signal<IdentificationResult | null>(null);
  errorMessage = signal<string | null>(null);

  /**
   * Lance l'analyse de la plante
   */
  async identifyPlant() {
    const imagesArray = this.temporaryPlant.images;

    if (!imagesArray || imagesArray.length === 0) {
      this.errorMessage.set('Veuillez ajouter au moins une image avant de lancer l\'analyse.');
      return;
    }

    this.isAnalyzing.set(true);
    this.analysisResult.set(null);
    this.errorMessage.set(null);

    // 🔥 Plus de fetch ! On extrait directement les fichiers File d'origine gardés en mémoire vive
    const filesToIdentify = imagesArray.map((img: any) => img.rawFile);

    this.identificationService.identifyPlantFromImages(filesToIdentify).subscribe({
      next: (result) => {
        this.analysisResult.set(result);
        this.isAnalyzing.set(false);
      },
      error: (err) => {
        console.error("Erreur lors de l'identification :", err);
        this.errorMessage.set("Une erreur est survenue lors de l'analyse par l'IA.");
        this.isAnalyzing.set(false);
      }
    });
  }

  /**
   * Réinitialise le scanneur pour une nouvelle analyse
   */
  resetScanner() {
    this.temporaryPlant = {
      id: 0,
      name: 'identification-scan',
      images: []
    };
    this.analysisResult.set(null);
    this.errorMessage.set(null);
  }
}
