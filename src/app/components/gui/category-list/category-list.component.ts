import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Category } from '../../../models/category';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css'
})
export class CategoryListComponent {
  @Input() allCategories: Category[] = [];
  @Input() parentId: number | null = null;
// On stocke les IDs sélectionnés dans un Set pour éviter de modifier le modèle
  @Input() selectedIds = new Set<number>();
  @Input() isDropdownMode: boolean = false; // Mode d'affichage demandé
  @Input() singleSelection: boolean = false;

  @Output() selectionChange = new EventEmitter<number[]>();

// Set local pour mémoriser les IDs des catégories dépliées
  expandedIds = new Set<number>();
  isOpen = false; // Pilote l'ouverture du menu flottant

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  clickOut(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target) && this.parentId === null) {
      this.isOpen = false;
    }
  }

  get selectedLabels(): string {
    const selectedNames = this.allCategories
      .filter(c => c.id !== undefined && this.selectedIds.has(c.id))
      .map(c => c.name);

    if (selectedNames.length === 0) return 'Choisir les catégories...';
    if (selectedNames.length > 2) return `${selectedNames.length} catégories sélectionnées`;
    return selectedNames.join(', ');
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  isSelected(id?: number): boolean {
    return id !== undefined && this.selectedIds.has(id);
  }

  toggleSelection(id: number | undefined, event: any) {
    if (id === undefined) return;

    // 1. On vérifie si l'élément était DÉJÀ sélectionné avant le clic
    const wasAlreadySelected = this.selectedIds.has(id);

    if (this.singleSelection) {
      // En mode sélection unique :
      if (wasAlreadySelected) {
        // Si on clique sur l'élément déjà coché, on vide tout (désélection)
        this.selectedIds.clear();
        // On force l'élément HTML (radio) à se décocher visuellement
        event.target.checked = false;
      } else {
        // Sinon, on vide l'ancienne sélection et on ajoute la nouvelle
        this.selectedIds.clear();
        this.selectedIds.add(id);
      }
    } else {
      // Mode multi-sélection (comportement d'origine inchangé)
      const isChecked = event.target.checked;
      if (isChecked) {
        this.selectedIds.add(id);
      } else {
        this.selectedIds.delete(id);
      }
    }

    // On émet le tableau (vide si désélectionné, ou avec le nouvel ID)
    this.selectionChange.emit(Array.from(this.selectedIds));
  }

  // Vérifie si la sous-arborescence doit être visible
  isExpanded(id: number | undefined): boolean {
    return id !== undefined && this.expandedIds.has(id);
  }

  // Inverse l'état (ouvert/fermé) d'une catégorie
  toggleExpand(id: number | undefined) {
    if (id === undefined) return;
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }
// Extrait proprement un ID numérique depuis une propriété parent (Objet ou IRI string)
private getParentId(cat: Category): number | null {
  if (!cat.parent) return null;
  if (typeof cat.parent === 'object') return cat.parent.id ?? null;
  if (typeof cat.parent === 'string') {
    const parts = cat.parent.split('/');
    const id = parts[parts.length - 1];
    return id ? +id : null;
  }
  return null;
}

// Retourne uniquement les catégories qui appartiennent au niveau actuel
get rootCategories() {
  return this.allCategories.filter(c => this.getParentId(c) === this.parentId);
}

// Vérifie dynamiquement si une catégorie possède des enfants dans le tableau plat
hasChildren(cat: Category): boolean {
  if (!cat.id) return false;
  return this.allCategories.some(c => this.getParentId(c) === cat.id);
}

// Pour que les composants enfants notifient aussi le parent racine
onChildSelectionChange(ids: number[]) {
  // CORRECTION : On reconstruit le Set avec les nouvelles valeurs reçues de l'enfant
  // pour forcer la détection de changement Angular sur l'instance courante
  this.selectedIds = new Set<number>(ids);

  // On remonte l'info au composant parent supérieur
  this.selectionChange.emit(ids);
}
}
