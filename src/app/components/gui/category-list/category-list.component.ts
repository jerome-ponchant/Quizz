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

    if (event.target.checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }

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
  this.selectionChange.emit(ids);
}
}
