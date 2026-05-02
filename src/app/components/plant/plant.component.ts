import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlantService } from '../../services/plant.service';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-plant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plant.component.html',
  styleUrls: ['./plant.component.css']
})
export class PlantComponent implements OnInit {
  plants: any[] = [];
  categories: any[] = [];
  isEditing = false;

  // Formulaire avec gestion multi-catégories
  plantForm: any = { id: null, name: '', imageUrl: '', categories: [] };

  constructor(
    private plantService: PlantService,
    private categoryService: CategoryService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.plantService.findAll().subscribe({
      next: (data: any) => {
        // Si API Platform (JSON-LD) est activé, on cherche 'hydra:member'
        // Sinon, on prend directement data si c'est du JSON brut
        if (data['hydra:member']) {
          this.plants = data['hydra:member']; // C'est ici que se trouve l'Iterable (Array)
        } else {
          this.plants = data; // Cas où vous seriez en JSON pur
      }},
      error: (err) => console.error("Erreur de chargement des plantes", err)});
    this.categoryService.findAll().subscribe(data => this.categories = data['hydra:member'] || data);
  }

  savePlant() {
    // Transformation des IDs de catégories en IRIs pour API Platform
    const payload = {
      ...this.plantForm,
      categories: this.plantForm.categories.map((id: number) => `/api/categories/${id}`)
    };

    if (this.isEditing) {
      this.plantService.update(this.plantForm.id, payload).subscribe(() => this.completeAction());
    } else {
      delete payload.id;
      this.plantService.create(payload).subscribe(newPlant => {
        this.plants.unshift(newPlant);
        this.completeAction();
      });
    }
  }

  editPlant(plant: any) {
    this.isEditing = true;
    // On extrait les IDs des IRIs reçus pour le multi-select
    const categoryIds = plant.categories.map((c: any) => typeof c === 'string' ? +c.split('/').pop()! : c.id);
    this.plantForm = { ...plant, categories: categoryIds };
  }

  deletePlant(id: number) {
    if (confirm('Supprimer cette plante ?')) {
      this.plantService.delete(id).subscribe(() => {
        this.plants = this.plants.filter(p => p.id !== id);
      });
    }
  }

  private completeAction() {
    this.isEditing = false;
    this.plantForm = { id: null, name: '', imageUrl: '', categories: [] };
    if (this.isEditing) this.loadData(); // Rafraîchir pour l'update
  }
}
