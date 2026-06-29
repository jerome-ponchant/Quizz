import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { UploadService } from '../../../services/upload.service';
import { PlantImageService } from '../../../services/plant-image.service';
import { PlantImage } from '../../../models/plant-image';

@Component({
  selector: 'app-plant-image-manager',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './plant-image-manager.component.html',
  styleUrls: ['./plant-image-manager.component.css'],
})
export class PlantImageManagerComponent {
  // L'unique source de vérité : l'objet plante complet
  @Input() plant!: any;

  // Inputs clairs et découplés
  @Input() readOnly: boolean = true;
  @Input() displayMode: 'carousel' | 'mosaic' = 'carousel';
  @Input() prefix: string = '';

  // 💡 Permet de savoir si on gère les images en local (Mémoire) ou sur le serveur (BDD)
  @Input() isVirtual: boolean = false;

  currentCarouselIndex = 0;
  lightboxImage: string | null = null;

  constructor(
    private uploadService: UploadService,
    private plantImageService: PlantImageService
  ) {}

  // Getter utilitaire pour le template HTML
  get images(): any[] {
    return this.plant?.images || [];
  }

  onDrop(event: CdkDragDrop<any[]>) {
    if (this.readOnly) return;

    // Mutation locale réactive
    const updatedImages = [...this.images];
    moveItemInArray(updatedImages, event.previousIndex, event.currentIndex);

    this.plant.images = updatedImages;
    this.reindexImages();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (this.isVirtual) {
        // 💡 ALTERNATIVE 1 : Mode Virtuel (Scan / Identification)
        // Création d'une URL locale temporaire pointant directement sur la mémoire du navigateur
        const localBlobUrl = URL.createObjectURL(file);

        const newLocalImage = {
          id: undefined, // Pas d'identifiant BDD
          url: localBlobUrl, // Sera interprété par le template
          position: this.images.length,
          rawFile: file // 🔥 IMPORTANT : Stockage du fichier binaire d'origine pour l'IA
        };

        if (!this.plant.images) this.plant.images = [];
        this.plant.images.push(newLocalImage);

      } else {
        // Mode Classique (Inventaire Réel) : Upload physique immédiat + Persistance BDD
        const plantName = this.plant.name || 'plante';
        const cleanPlantName = plantName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const timestamp = Date.now();
        const relativePath = `quiz/${cleanPlantName}-${timestamp}`;

        this.uploadService.uploadPlantImage(file, relativePath).subscribe({
          next: (uploadResponse) => {
            const newImageData = {
              url: uploadResponse.path,
              position: this.images.length,
              plant: `/api/plants/${this.plant.id}`,
            };

            this.plantImageService.createPlantImage(newImageData).subscribe({
              next: (persistedImage) => {
                if (!this.plant.images) this.plant.images = [];
                this.plant.images.push(persistedImage);
              },
              error: (err) => console.error("Erreur lors du POST de l'image :", err),
            });
          },
          error: (err) => console.error("Erreur lors de l'upload physique :", err),
        });
      }
    }
  }

  removeImage(index: number, event: Event) {
    event.stopPropagation();
    const imageToDelete = this.plant.images[index];

    // 💡 Si mode virtuel ou image pas encore enregistrée, on nettoie la mémoire et le tableau local
    if (this.isVirtual || !imageToDelete.id) {
      if (imageToDelete.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToDelete.url); // Libère les ressources mémoire du navigateur
      }
      this.plant.images.splice(index, 1);
      this.reindexImages();
      return;
    }

    // Mode Classique : Suppression en BDD
    this.plantImageService.deletePlantImage(imageToDelete.id).subscribe({
      next: () => {
        this.plant.images.splice(index, 1);
        this.reindexImages();

        if (
          this.currentCarouselIndex >= this.plant.images.length &&
          this.plant.images.length > 0
        ) {
          this.currentCarouselIndex = this.plant.images.length - 1;
        }
      },
      error: (err) =>
        console.error(`Erreur lors du DELETE [ID ${imageToDelete.id}]:`, err),
    });
  }

  private reindexImages() {
    this.plant.images = this.plant.images.map(
      (img: any, index: number) => ({ ...img, position: index })
    );

    // 💡 On n'envoie les patchs de réindexation que si on est sur de vraies entités BDD
    if (!this.isVirtual) {
      this.plant.images.forEach((img: any) => {
        if (img.id) {
          this.plantImageService
            .updatePlantImage(img.id, { position: img.position })
            .subscribe();
        }
      });
    }
  }

  prevSlide() {
    this.currentCarouselIndex =
      this.currentCarouselIndex === 0
        ? this.images.length - 1
        : this.currentCarouselIndex - 1;
  }

  nextSlide() {
    this.currentCarouselIndex =
      this.currentCarouselIndex === this.images.length - 1
        ? 0
        : this.currentCarouselIndex + 1;
  }

  openLightbox(imageUrl: string) {
    this.lightboxImage = imageUrl;
  }

  closeLightbox() {
    this.lightboxImage = null;
  }
}
