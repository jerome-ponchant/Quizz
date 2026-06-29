import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- Importez ceci
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category';
import { CategoryListComponent } from '../gui/category-list/category-list.component';



@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategoryListComponent // <-- Ajoutez-le ici
  ],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit {

  url = environment.apiUrl+'/categories';
  categories: Category[] = [];
  isEditing = false;
  categoryForm : Category = { name: '', parentId: null };
  selectedCategoryIds = new Set<number>();
  parentCategoryIds= new Set<number>();
  // À placer sous parentCategoryIds
impliedCategoryIds = new Set<number>();

  constructor(private categoryService: CategoryService) {}

  ngOnInit() {
    this.loadCategories();
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

saveCategory() {
  if (!this.categoryForm.name || this.categoryForm.name.trim() === '') {
    alert('Le nom de la catégorie est obligatoire.');
    return;
  }

  // Préparation du payload pour l'API Symfony (IRI pour la relation parent)
  const payload: any = {
    name: this.categoryForm.name,
    parent: this.categoryForm.parentId ? `/api/categories/${this.categoryForm.parentId}` : null,
    impliedCategories: Array.from(this.impliedCategoryIds).map(id => `/api/categories/${id}`)
  };

  if (this.isEditing && this.categoryForm.id) {
    // Mode Édition : Appel au service update
    this.categoryService.update(this.categoryForm.id, payload).subscribe({
      next: () => {
        alert('Catégorie mise à jour avec succès !');
        this.resetForm();
        this.loadCategories(); // Recharger la liste
      },
      error: (err) => console.error('Erreur lors de la mise à jour', err)
    });
  } else {
    // Mode Ajout : Appel au service create
    this.categoryService.create(payload).subscribe({
      next: () => {
        alert('Catégorie ajoutée avec succès !');
        this.resetForm();
        this.loadCategories();
      },
      error: (err) => console.error('Erreur lors de l\'ajout', err)
    });
  }
}

/**
 * Annule l'édition en cours et remet le formulaire à zéro
 */
cancelEdition() {
  this.resetForm();                  // Remet le formulaire à blanc (name: '', parentId: null)
  this.selectedCategoryIds.clear();  // Décoche la sélection dans l'arbre pour éviter les confusions
}


editCategory(cat: Category) {
  this.isEditing = true;

  // Extraction propre des relations
  const { parentId, impliedIds } = this.extractRelations(cat);

  this.categoryForm = {
    id: cat.id,
    name: cat.name,
    parentId: parentId
  };

  // Forcer la mise à jour des composants arbres[cite: 1]
  this.parentCategoryIds = new Set(parentId ? [parentId] : []);
  this.impliedCategoryIds = new Set(impliedIds);
}

  deleteCategory(id: number) {
    if (id && confirm('Supprimer cette catégorie ?')) {
      this.categoryService.delete(id).subscribe(() => {
        this.categories = this.categories.filter(c => c.id !== id);
      });
    }
  }

  getCategoryName(iri: string) {
    return iri.split('/').pop(); // Extraction simple pour l'exemple
  }

  resetForm(): void {
    this.isEditing = false;
    this.categoryForm = { name: '' };

    // FIX : On réassigne des Set complètement NEUFS pour casser les références
    // et forcer l'arbre des catégories impliquées à se décocher entièrement
    this.parentCategoryIds = new Set<number>();
    this.impliedCategoryIds = new Set<number>();
    this.selectedCategoryIds = new Set<number>();
  }

// category.component.ts

// Appelé lorsque l'arbre d'administration émet un changement
onAdminCategorySelect(ids: Set<number>): void {
  this.selectedCategoryIds = ids;

  if (ids.size === 0) return;

  const selectedId = Array.from(ids)[0];
  const catToEdit = this.categories.find(c => c.id === selectedId);

  if (catToEdit) {
    this.isEditing = true;

    // Extraction propre des relations
    const { parentId, impliedIds } = this.extractRelations(catToEdit);

    // Initialisation du formulaire avec le parentId plat
    this.categoryForm = {
      id: catToEdit.id,
      name: catToEdit.name,
      parentId: parentId
    };

    // Forcer la mise à jour des composants arbres (nouvelles instances de Set)[cite: 1]
    this.parentCategoryIds = new Set(parentId ? [parentId] : []);
    this.impliedCategoryIds = new Set(impliedIds);
  }
}

// Appelé par l'arbre
onCategorySelectionChange(ids: Set<number>) {
// On extrait la première (et unique) valeur du Set
const [selectedId] = ids;

// Si selectedId existe, on l'affecte, sinon on met null
this.categoryForm.parentId = selectedId !== undefined ? selectedId : null;

}



/**
 * Filtre la liste pour éviter qu'une catégorie puisse s'impliquer elle-même
 */
filterCurrentCategory(allCats: Category[]): Category[] {
  if (!this.categoryForm.id) {
    return allCats;
  }
  return allCats.filter(cat => cat.id !== this.categoryForm.id);
}



/**
 * Extrait les IDs numériques du parent et des catégories impliquées
 */
private extractRelations(cat: Category): { parentId: number | null, impliedIds: number[] } {
  // 1. Extraction du parentId
  let parentId: number | null = null;
  if (cat.parent) {
    parentId = typeof cat.parent === 'object'
      ? (cat.parent.id ?? null)
      : +cat.parent.split('/').pop()!;
  }

  // 2. Extraction des IDs impliqués (depuis 'impliedCategories' de l'API)
  const impliedIds: number[] = [];
  const rawImplied = (cat as any).impliedCategories; // On cible la propriété de l'API

  if (rawImplied && Array.isArray(rawImplied)) {
    rawImplied.forEach((item: any) => {
      if (typeof item === 'object' && item !== null && item.id) {
        impliedIds.push(item.id);
      } else if (typeof item === 'string') {
        const id = +item.split('/').pop()!;
        if (!isNaN(id)) impliedIds.push(id);
      }
    });
  }

  return { parentId, impliedIds };
}

}
