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
    parent: this.categoryForm.parentId ? `/api/categories/${this.categoryForm.parentId}` : null
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

    // Extraction de l'ID du parent (qu'il soit un objet ou une chaîne IRI)
    let extractedParentId: number | null = null;
    if (cat.parent) {
      extractedParentId = typeof cat.parent === 'object'
        ? (cat.parent.id ?? null)
        : +cat.parent.split('/').pop()!;
    }
    this.categoryForm = {
      id: cat.id,
      name: cat.name,
      parentId: extractedParentId
    };
    this.parentCategoryIds.clear();
    if (this.categoryForm.parentId){
      this.parentCategoryIds.add(this.categoryForm.parentId)
    }
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

  private resetForm() {
    this.categoryForm = { id: undefined, name: '', parentId: null }; // Ajoutez id: undefined ou null
    this.selectedCategoryIds = new Set<number>();
    this.parentCategoryIds = new Set<number>();
    this.isEditing = false;
  }

// category.component.ts

// Appelé lorsque l'arbre émet un changement de sélection
onAdminCategorySelect(ids: number[]) {
  this.selectedCategoryIds = new Set(ids);

  if (ids.length > 0) {
    // On récupère la dernière catégorie cochée pour l'éditer automatiquement
    const targetId = ids[ids.length - 1];
    const targetCategory = this.categories.find(c => c.id === targetId);

    if (targetCategory) {
      this.editCategory(targetCategory);
    }
  } else {
    this.resetForm();
  }
}

// Appelé par l'arbre
onCategorySelectionChange(ids: number[]) {
  // 1. Mise à jour de la référence locale pour l'interface (Set)
  this.selectedCategoryIds = new Set(ids);
  this.categoryForm.parentId= ids.length >0 ? ids[ids.length - 1] : null;

}

onParentCategorySelect($event: number[]) {
  // 1. Mise à jour de la référence locale pour l'interface (Set)
  this.selectedCategoryIds = new Set($event);
  this.categoryForm.parentId= $event.length >0 ? $event[$event.length - 1] : null;
}

}
