import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
// 💡 Ajout de OnInit dans les imports Angular
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Plant } from '../../../models/plant';
import { Category } from '../../../models/category';
import { CategoryListComponent } from '../../gui/category-list/category-list.component';
import { PlantImageManagerComponent } from '../../gui/plant-image-manager/plant-image-manager.component';
import { PlantService } from '../../../services/plant.service';
import { PlantImageService } from '../../../services/plant-image.service';
// 💡 Importation du CategoryService
import { CategoryService } from '../../../services/category.service';

@Component({
  selector: 'app-plant-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryListComponent, PlantImageManagerComponent],
  templateUrl: './plant-detail.component.html',
  styleUrls: ['./plant-detail.component.css']
})
export class PlantDetailComponent implements OnChanges, OnInit { // 💡 Implémentation de OnInit
  // Injections de dépendances modernes via inject()
  private plantService = inject(PlantService);
  private plantImageService = inject(PlantImageService);
  private categoryService = inject(CategoryService); // 💡 Injection du CategoryService

  @Input() plant: Plant | null | undefined = null;
  @Input() uploadPrefix: string = '';

  // 💡 allCategories n'est plus forcément une entrée obligatoire du parent, on l'initialise à vide
  @Input() allCategories: Category[] = [];

  // Événement pour avertir le parent qu'un changement majeur a eu lieu (pour recharger la liste principale)
  @Output() actionCompleted = new EventEmitter<void>();
  @Output() applyImplications = new EventEmitter<Set<number>>();

  localPlant: any = this.createEmptyPlant();
  selectedCategoryIds = signal<Set<number>>(new Set<number>());

  floriscopeUrl?: string = '';
  wikipediaUrl?: string = '';

  // 💡 Cycle de vie à l'initialisation du composant
  ngOnInit(): void {
    this.loadAllCategories();
  }

  /**
   * 💡 Chargement autonome des catégories depuis le service
   */
  private loadAllCategories(): void {
    this.categoryService.findAll().subscribe({
      next: (categories) => {
        // Ajustez le ciblage selon la structure de votre retour API (ex: categories.items ou res.categories)
        this.allCategories = categories;
      },
      error: (err) => {
        console.error('Erreur lors du chargement autonome des catégories dans PlantDetail:', err);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['plant']) {
      if (this.plant) {
        this.localPlant = { ...this.plant };

        // Extraction des IDs numériques des catégories pour le composant d'arbre graphique
        const categoryIds = this.localPlant.categories
          ? this.localPlant.categories.map((c: any) => typeof c === 'object' ? c.id : +c.split('/').pop())
          : [];
        this.selectedCategoryIds.set(new Set<number>(categoryIds));

        this.floriscopeUrl = 'https://www.floriscope.io/search?q=' + this.plant.name.replaceAll(' ', '+'); // Exemple adaptatif
        this.wikipediaUrl = 'https://fr.wikipedia.org/wiki/' + this.plant.name.replaceAll(' ', '+');
      } else {
        this.localPlant = this.createEmptyPlant();
        this.selectedCategoryIds.set(new Set<number>());
      }
    }
  }

  private createEmptyPlant() {
    return {
      name: '',
      commonName: '',
      description: '',
      images: [],
      categories: []
    };
  }

  get isValid(): boolean {
    return !!(this.localPlant.name && this.localPlant.name.trim() !== '');
  }

  onApplyInvolvedCategories(): void {
    this.applyImplications.emit(this.selectedCategoryIds());
  }

  /**
   * Sauvegarde globale (Création intégrale OU Mise à jour)
   */
  onSave() {
    if (!this.isValid) return;

    // Préparation des catégories pour l'API
    const categoriesIri = Array.from(this.selectedCategoryIds()).map(id => `/api/categories/${id}`);

    if (this.localPlant.id) {
      // --- MODE ÉDITION ---
      const payload = {
        ...this.localPlant,
        categories: categoriesIri
      };
      this.plantService.update(this.localPlant.id, payload).subscribe({
        next: () => {
          this.actionCompleted.emit();
        },
        error: (err) => console.error('Erreur lors de la modification:', err)
      });

    } else {
      // --- MODE CRÉATION ---
      const { images, ...plantPayload } = this.localPlant;
      const payload = {
        ...plantPayload,
        categories: categoriesIri,
        images: []
      };

      this.plantService.create(payload).pipe(
        switchMap((newPlant: any) => {
          const plantIri = newPlant['@id'] || `/api/plants/${newPlant.id}`;

          if (images && images.length > 0) {
            const imageRequests = images.map((img: any) => {
              return this.plantImageService.createPlantImage({
                url: img.url,
                position: img.position,
                plant: plantIri
              });
            });
            return forkJoin(imageRequests);
          }
          return of([]);
        })
      ).subscribe({
        next: (imagesSaved) => {
          console.log('Plante et images associées avec succès !', imagesSaved);

          this.localPlant = this.createEmptyPlant();
          this.selectedCategoryIds.set(new Set<number>());
          this.actionCompleted.emit();
        },
        error: (err) => {
          console.error('Erreur dans la séquence de création de la plante ou des images:', err);
        }
      });
    }
  }

  /**
   * Suppression de la plante
   */
  onDelete() {
    if (!this.localPlant.id) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la plante "${this.localPlant.name}" ?`)) {
      this.plantService.delete(this.localPlant.id).subscribe({
        next: () => {
          console.log('Plante supprimée avec succès');
          this.localPlant = this.createEmptyPlant();
          this.selectedCategoryIds.set(new Set<number>());
          this.actionCompleted.emit();
        },
        error: (err) => console.error('Erreur lors de la suppression de la plante:', err)
      });
    }
  }
}
