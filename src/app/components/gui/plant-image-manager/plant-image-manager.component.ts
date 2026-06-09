import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { UploadService } from '../../../services/upload.service';
import { PlantImageService } from '../../../services/plant-image.service';
import { PlantImage } from '../../../models/plant-image';

@Component({
  selector: 'app-plant-image-manager',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './plant-image-manager.component.html',
  styleUrls: ['./plant-image-manager.component.css']
})
export class PlantImageManagerComponent {
  // L'unique source de vérité : l'objet plante complet
  @Input() plant!: any;

  // Nouveaux Inputs clairs et découplés
  @Input() readOnly: boolean = true;
  @Input() displayMode: 'carousel' | 'mosaic' = 'carousel';
  @Input() prefix: string = '';

  currentCarouselIndex = 0;

  constructor(
    private uploadService: UploadService,
    private plantImageService: PlantImageService
  ) {}

  // Getter utilitaire pour le template HTML
  get images(): PlantImage[] {
    return this.plant?.images || [];
  }

  // 1. Gestion du Drag & Drop + PATCH
  onDrop(event: CdkDragDrop<PlantImage[]>) {
    if (this.readOnly || !this.plant?.images) return;

    moveItemInArray(this.plant.images, event.previousIndex, event.currentIndex);

    // Recalcul des index de position
    this.plant.images = this.plant.images.map((img: PlantImage, index: number) => ({ ...img, position: index }));

    // Persistance des positions modifiées en BDD
    this.plant.images.forEach((img: PlantImage) => {
      if (img.id) {
        this.plantImageService.updatePlantImage(img.id, { position: img.position }).subscribe({
          error: (err) => console.error(`Erreur réordonnancement [ID ${img.id}]:`, err)
        });
      }
    });
  }

  // 2. Upload fichier + POST de l'image
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.plant || this.readOnly) return;

    const file = input.files[0];
    const plantName = this.plant.name || 'plante';
    const cleanPlantName = plantName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now();
    const relativePath = `quiz/${cleanPlantName}-${timestamp}`;

    this.uploadService.uploadPlantImage(file, relativePath).subscribe({
      next: (uploadResponse) => {
        const newImageData = {
          url: uploadResponse.path,
          position: this.images.length,
          plant: `/api/plants/${this.plant.id}`
        };

        this.plantImageService.createPlantImage(newImageData).subscribe({
          next: (persistedImage) => {
            if (!this.plant.images) this.plant.images = [];
            this.plant.images.push(persistedImage);
            input.value = '';
          },
          error: (err) => console.error("Erreur lors du POST de l'image :", err)
        });
      },
      error: (err) => console.error("Erreur lors de l'upload physique :", err)
    });
  }

  // 3. Suppression d'une image + DELETE
  removeImage(index: number, event: MouseEvent) {
    event.stopPropagation();
    if (!this.plant?.images || this.readOnly) return;

    const imageToDelete = this.plant.images[index];

    if (!imageToDelete.id) {
      this.plant.images.splice(index, 1);
      this.reindexImages();
      return;
    }

    this.plantImageService.deletePlantImage(imageToDelete.id).subscribe({
      next: () => {
        this.plant.images.splice(index, 1);
        this.reindexImages();

        if (this.currentCarouselIndex >= this.plant.images.length && this.plant.images.length > 0) {
          this.currentCarouselIndex = this.plant.images.length - 1;
        }
      },
      error: (err) => console.error(`Erreur lors du DELETE [ID ${imageToDelete.id}]:`, err)
    });
  }

  private reindexImages() {
    this.plant.images = this.plant.images.map((img: PlantImage, index: number) => ({ ...img, position: index }));

    this.plant.images.forEach((img: PlantImage) => {
      if (img.id) {
        this.plantImageService.updatePlantImage(img.id, { position: img.position }).subscribe();
      }
    });
  }

  prevSlide() {
    this.currentCarouselIndex = (this.currentCarouselIndex === 0) ? this.images.length - 1 : this.currentCarouselIndex - 1;
  }

  nextSlide() {
    this.currentCarouselIndex = (this.currentCarouselIndex === this.images.length - 1) ? 0 : this.currentCarouselIndex + 1;
  }
}
