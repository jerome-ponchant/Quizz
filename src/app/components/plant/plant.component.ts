import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlantService } from '../../services/plant.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category';
import { CategoryListComponent } from '../gui/category-list/category-list.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-plant',
  standalone: true,
  imports: [CommonModule, FormsModule,CategoryListComponent],
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
  floriscopeUrl?: string = '';
  wikipediaUrl?: string =''
  searchTerm: string = '';
  selectedFilterCategoryIds: number[] = [];
  filterCategoryIdsSet = new Set<number>();
  // Formulaire avec gestion multi-catégories
  plantForm: any = { id: null, name: '', commonName:'', imageUrl: '', categories: [] };

  selectedCategoryIds = new Set<number>();

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
    this.currentPage = page;
    this.plantService.findAll(page,this.searchTerm, this.selectedFilterCategoryIds).subscribe({
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
    this.plantForm = { ...plant, commonName: plant.commonName || '',categories: categoryIds };
    this.floriscopeUrl =environment.floriscopeUrl + plant.name.replaceAll(' ', '+')
    this.wikipediaUrl = environment.wikipediaUrl+ plant.name.replaceAll(' + ', '+').replaceAll(' ', '+');
    this.selectedCategoryIds = new Set<number>(categoryIds);
  // Étape C : Propulsez l'écran vers le haut avec un effet fluide !
  setTimeout(() => {
    this.formTopElement.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, 50); // Le léger timeout garantit que le DOM s'est bien mis à jour

  }

  deletePlant(id: number) {
    if (confirm('Supprimer cette plante ?')) {
      this.plantService.delete(id).subscribe(() => {
        this.plants = this.plants.filter((p) => p.id !== id);
      });
    }
  }

// Dans plant.component.ts

onCategorySelectionChange(ids: number[]) {
  const updatedSelections = new Set<number>();

  // Pour chaque catégorie cochée par l'utilisateur, on applique la remontée
  ids.forEach(id => {
    this.selectCategoryWithParents(id, updatedSelections);
  });

  // On met à jour l'état du composant
  this.selectedCategoryIds = updatedSelections;

  // On met à jour le formulaire pour API Platform
  this.plantForm.categories = Array.from(this.selectedCategoryIds);
}

  private completeAction() {
    this.cacheBuster = '?t=' + new Date().getTime(); // Génère un jeton unique (ex: ?t=171664123456)
    this.loadData(); // Recharge toujours l'inventaire mis à jour depuis l'API
    this.isEditing = false;
    this.plantForm = { id: null, name: '', commonName:'',imageUrl: '', categories: [] };
    this.selectedCategoryIds.clear(); // Pensez aussi à vider le Set des catégories sélectionnées
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

// Dans plant.component.ts

/**
 * Parcourt l'arbre à l'envers pour cocher tous les parents d'une catégorie
 */
private selectCategoryWithParents(categoryId: number, allSelected: Set<number>) {
  allSelected.add(categoryId);

  // Trouver la catégorie courante dans la liste globale
  const currentCategory = this.categories.find(c => c.id === categoryId);

  if (currentCategory) {
    // Extraire l'ID du parent (qu'il soit un objet ou une chaîne IRI)
    const parentId = this.extractIdFromParent(currentCategory.parent);

    // S'il y a un parent, on l'ajoute et on remonte récursivement
    if (parentId !== null) {
      this.selectCategoryWithParents(parentId, allSelected);
    }
  }
}

/**
 * Utilitaire pour extraire l'ID numérique du parent de l'entité
 */
private extractIdFromParent(parent: any): number | null {
  if (!parent) return null;
  if (typeof parent === 'object') return parent.id ?? null;
  if (typeof parent === 'string') {
    const parts = parent.split('/');
    const id = parts[parts.length - 1];
    return id ? +id : null;
  }
  return null;
}

/**
 * Annule l'édition en cours et réinitialise le formulaire pour une nouvelle saisie
 */
cancelEdition() {
  this.isEditing = false;
  this.plantForm = { id: null, name: '', commonName: '',imageUrl: '', categories: [] };
  this.selectedCategoryIds.clear();
  this.selectedFile = null; // Optionnel : nettoie le fichier en mémoire si nécessaire
}

onFilterCategoryChange(ids: number[]) {
  // On stocke tous les IDs sélectionnés
  this.selectedFilterCategoryIds = ids || [];
  this.filterCategoryIdsSet = new Set<number>(this.selectedFilterCategoryIds);

  this.loadData(1); // Relance la recherche à la page 1
}

clearFilters() {
  this.searchTerm = '';
  this.selectedFilterCategoryIds = [];
  this.filterCategoryIdsSet.clear();
  this.loadData(1);
}

}
