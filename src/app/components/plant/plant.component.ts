import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlantService } from '../../services/plant.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category';

@Component({
  selector: 'app-plant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plant.component.html',
  styleUrls: ['./plant.component.css'],
})
export class PlantComponent implements OnInit {
  plants: any[] = [];
  currentPage = 1;
  totalItems = 0;
  itemsPerPage = 10;
  categories: any[] = [];
  isEditing = false;
  uploadPrefix$ = this.plantService.getPrefix();

  // Formulaire avec gestion multi-catégories
  plantForm: any = { id: null, name: '', imageUrl: '', categories: [] };

  selectedFile: File | null = null;
  uploading = false;

  constructor(
    private plantService: PlantService,
    private categoryService: CategoryService
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadCategories(); // Charge les catégories
  }



  // plant.component.ts
  loadData(page: number = 1) {
    this.currentPage = page;
    this.plantService.findAll(page).subscribe({
      next: (result) => {
        // Le service renvoie déjà un objet propre
        this.plants = result.plants;
        this.totalItems = result.total;
      },
      error: (err) => {
        console.error('Erreur', err);
        this.plants = [];
      }
    });
  }

  // Calcul du nombre de pages
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

// category.component.ts
loadCategories() {
  this.categoryService.findAll().subscribe({
    next: (data: Category[]) => {
      // 'data' est déjà le tableau extrait par le service
      this.categories = data;
    },
    error: (err) => console.error('Erreur lors du chargement', err)
  });
}

  savePlant() {
    // Transformation des IDs de catégories en IRIs pour API Platform
    const payload = {
      ...this.plantForm,
      categories: this.plantForm.categories.map(
        (id: number) => `/api/categories/${id}`
      ),
    };

    if (this.isEditing) {
      this.plantService
        .update(this.plantForm.id, payload)
        .subscribe(() => this.completeAction());
    } else {
      delete payload.id;
      this.plantService.create(payload).subscribe((newPlant) => {
        this.plants.unshift(newPlant);
        this.completeAction();
      });
    }
  }

  editPlant(plant: any) {
    this.isEditing = true;
    // On extrait les IDs des IRIs reçus pour le multi-select
    const categoryIds = plant.categories.map((c: any) =>
      typeof c === 'string' ? +c.split('/').pop()! : c.id
    );
    this.plantForm = { ...plant, categories: categoryIds };
  }

  deletePlant(id: number) {
    if (confirm('Supprimer cette plante ?')) {
      this.plantService.delete(id).subscribe(() => {
        this.plants = this.plants.filter((p) => p.id !== id);
      });
    }
  }

  private completeAction() {
    this.isEditing = false;
    this.plantForm = { id: null, name: '', imageUrl: '', categories: [] };
    if (this.isEditing) this.loadData(); // Rafraîchir pour l'update
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    // On vérifie que le fichier existe ET que l'utilisateur a saisi un nom
    if (file) {
      if (!this.plantForm.name || this.plantForm.name.trim() === '') {
        alert(
          'Veuillez saisir le nom de la plante avant de choisir une image.'
        );
        event.target.value = ''; // Reset l'input file
        return;
      }

      this.uploading = true;

      // On passe par PlantService qui gère la communication avec UploadService
      this.plantService.uploadPlantImage(file, this.plantForm.name).subscribe({
        next: (response) => {
          this.plantForm.imageUrl = response.path; // ex: "uploads/plants/ma-rose.jpg"
          this.uploading = false;
        },
        error: (err) => {
          console.error("Erreur d'upload", err);
          this.uploading = false;
        },
      });
    }
  }
}
