import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- Importez ceci
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category';



@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule // <-- Ajoutez-le ici
  ],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit {
  url = environment.apiUrl+'/categories';
  categories: Category[] = [];
  isEditing = false;
  categoryForm : Category = { name: '', parentId: null };

  constructor(private categoryService: CategoryService) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.findAll().subscribe({
      next: (data) => {
        // TypeScript reconnaît maintenant 'hydra:member' grâce à l'interface
        this.categories = data['hydra:member'];
      },
      error: (err) => console.error('Erreur lors du chargement', err)
    });
  }

  saveCategory() {
    if (!this.categoryForm.name) return;

    if (this.isEditing && this.categoryForm.id) {
      this.categoryService.update(this.categoryForm.id, this.categoryForm)
        .subscribe(updated => {
          const index = this.categories.findIndex(c => c.id === updated.id);
          this.categories[index] = updated;
          this.resetForm();
        });
    } else {
      this.categoryService.create(this.categoryForm as Category)
        .subscribe(newCat => {
          // Ajout immédiat au tableau pour déclencher l'animation CSS[cite: 2, 8]
          this.categories.unshift(newCat);
          this.resetForm();
        });
    }
  }

  editCategory(cat: any) {
    this.isEditing = true;
    this.categoryForm = { ...cat };
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
    this.categoryForm = { name: '', parentId: null };
    this.isEditing = false;
  }


}
