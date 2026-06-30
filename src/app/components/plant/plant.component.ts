import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlantService } from '../../services/plant.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category';
import { CategoryListComponent } from '../gui/category-list/category-list.component';
import { environment } from '../../../environments/environment';
import { PlantImageManagerComponent } from '../gui/plant-image-manager/plant-image-manager.component';
import { PlantDetailComponent } from './plant-detail/plant-detail.component';

@Component({
  selector: 'app-plant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategoryListComponent,
    PlantImageManagerComponent,
    PlantDetailComponent
  ],
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
  // Sous tes autres propriétés de classe
  cacheBuster: string = '';
  uploadPrefix$ = this.plantService.getPrefix();

  searchTerm: string = '';
  selectedFilterCategoryIds: Set<number> = new Set<number>();
  filterCategoryIdsSet = new Set<number>();
  // Formulaire avec gestion multi-catégories
  plantForm: any = {
    id: null,
    name: '',
    commonName: '',
    images: [],
    categories: [],
  };

  selectedCategoryIds = signal<Set<number>>(new Set<number>());

  selectedFile: File | null = null;
  uploading = false;

  // Attrapez le repère HTML #formTop
  @ViewChild('formTop') formTopElement!: ElementRef;

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
    const idsArray = Array.from(this.selectedFilterCategoryIds);
    this.currentPage = page;

    this.plantService.findAll(page, this.searchTerm, idsArray).subscribe({
      next: (result) => {
        console.log('--- Données reçues du service :', result);
        // Le service renvoie déjà un objet propre
        this.plants = result.plants;
        this.totalItems = result.total;
      },
      error: (err) => {
        console.error('Erreur', err);
        this.plants = [];
      },
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
      error: (err) => console.error('Erreur lors du chargement', err),
    });
  }

  onPlantImagesChanged(updatedImages: any[]) {
    this.plantForm.images = updatedImages;
  }

  savePlant() {
    // Transformation des IDs de catégories en IRIs pour API Platform
    const payload = {
      ...this.plantForm,
      categories: this.plantForm.categories.map(
        (id: number) => `/api/categories/${id}`
      ),
      // On remplace le tableau d'objets d'images par un tableau de chaînes (IRI) attendu par API Platform
      images: this.plantForm.images.map(
        (img: any) => img['@id'] || `/api/images/${img.id}`
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
    this.plantForm = { ...plant };

    // CORRECTION SÉCURISÉE : convertit le tableau de l'API en Set d'IDs numériques
    const categoryIds = plant.categories
      ? plant.categories.map((c: any) => typeof c === 'object' ? c.id : +c.split('/').pop())
      : [];

    this.selectedCategoryIds.set(new Set<number>(categoryIds));

    if (plant.images && plant.images.length > 0) {
      this.plantForm.images = [...plant.images];
    } else {
      this.plantForm.images = [];
    }

    if (this.formTopElement) {
      this.formTopElement.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  deletePlant(id: number) {
    if (confirm('Supprimer cette plante ?')) {
      this.plantService.delete(id).subscribe(() => {
        this.plants = this.plants.filter((p) => p.id !== id);
      });
    }
  }


  private completeAction() {
    this.cacheBuster = '?t=' + new Date().getTime();
    this.loadData();
    this.isEditing = false;
    this.plantForm = {
      id: null,
      name: '',
      commonName: '',
      images: [],
      categories: [],
    };
    this.selectedCategoryIds.set(new Set<number>());
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
          this.cacheBuster = '?t=' + new Date().getTime();
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

  onSearch() {
    this.loadData(1); // On repart à la page 1 pour la recherche
  }


  /**
   * Annule l'édition en cours et réinitialise le formulaire pour une nouvelle saisie
   */
  cancelEdition() {
    this.isEditing = false;
    this.plantForm = { id: null, name: '', commonName: '', images: [], categories: [] };

    // Nettoyage via l'API des Signaux
    this.selectedCategoryIds.set(new Set<number>());
    this.selectedFile = null;
  }

  onFilterCategoryChange(ids: Set<number>) {
    // CORRECTION : Utiliser un Set vide si ids est falsy
    this.selectedFilterCategoryIds = ids || new Set<number>();
    this.filterCategoryIdsSet = new Set<number>(this.selectedFilterCategoryIds);

    this.loadData(1);
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedFilterCategoryIds = new Set<number>(); // OK
    this.filterCategoryIdsSet.clear();
    this.loadData(1);
  }

  /**
   * Applique les implications de catégories au formulaire de la plante en déléguant
   * le calcul de fermeture transitive au CategoryService.
   */
  applyInvolvedCategoriesToForm(): void {
    // 1. On appelle le service pour obtenir le Set complet mis à jour
    const resultSet = this.categoryService.findImpliedCategories(
      this.selectedCategoryIds(), // Notre signal actuel
      this.categories // La liste globale disponible dans le composant
    );

    // 2. On met à jour le signal pour rafraîchir l'arbre des catégories visuellement
    this.selectedCategoryIds.set(resultSet);
  }

// Réception du formulaire enfant validé
savePlantFromDetail(localFormPayload: any) {
  // Transformation finale des IDs numériques plats pour API Platform
  const payload = {
    ...localFormPayload,
    categories: localFormPayload.categories.map((id: number) => `/api/categories/${id}`),
    images: localFormPayload.images.map((img: any) => img['@id'] || `/api/images/${img.id}`),
  };

  if (this.isEditing) {
    this.plantService.update(localFormPayload.id, payload).subscribe(() => this.completeAction());
  } else {
    delete payload.id;
    this.plantService.create(payload).subscribe((newPlant) => {
      this.plants.unshift(newPlant);
      this.completeAction();
    });
  }
}

// Calcul de la fermeture transitive des catégories
handleImplicationsFromDetail(currentIdsSet: Set<number>, detailComponent: any) {
  const resultSet = this.categoryService.findImpliedCategories(currentIdsSet, this.categories);
  // On réinjecte le Set calculé directement dans le signal du sous-composant
  detailComponent.selectedCategoryIds.set(resultSet);
}

onPlantActionCompleted() {
  this.isEditing = false;
  this.plantForm = { id: null, name: '', commonName: '', images: [], categories: [] };
  this.loadData(this.currentPage); // Recharge l'inventaire mis à jour
}

}
