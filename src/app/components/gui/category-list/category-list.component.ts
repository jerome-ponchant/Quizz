import { Component, ElementRef, EventEmitter, HostListener, Input, Output, model, output } from '@angular/core';
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

// Crée automatiquement l'input 'selectedIds' ET l'output 'selectedIdsChange'
  selectedIds = model<Set<number>>(new Set());
  @Input() isDropdownMode: boolean = false; // Mode d'affichage demandé
  @Input() singleSelection: boolean = false;

  selectionChange = output<Set<number>>();

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
    const currentIds = this.selectedIds();

    // SÉCURITÉ : Si ce n'est pas un Set (ou s'il est vide), on retourne une chaîne vide
    if (!currentIds || !(currentIds instanceof Set) || currentIds.size === 0) {
      return 'Choisir les catégories...';
    }

    const labels = this.allCategories
      .filter(c => c.id !== undefined && currentIds.has(c.id)) // Plus de crash ici !
      .map(c => c.name);

    return labels.length > 0 ? labels.join(', ') : 'Choisir les catégories...';
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  isSelected(id?: number): boolean {
    return id !== undefined && this.selectedIds().has(id);
  }

  toggleSelection(catId: number, event: Event): void {
    // Évite les doubles déclenchements si le clic provient du label
    event.stopPropagation();

    // On travaille sur une copie pour conserver l'immutabilité
    let nextSelection = new Set<number>(this.selectedIds());

    if (this.singleSelection) {
      nextSelection.clear();
      nextSelection.add(catId);
      // Optionnel : Sélectionner les parents aussi en mode unique si désiré
      this.selectParents(catId, nextSelection);
    } else {
      // Mode Checkbox (Multi-sélection)
      if (nextSelection.has(catId)) {
        nextSelection.delete(catId);
        // Note : On ne décoche pas forcément les parents car d'autres enfants peuvent en dépendre
      } else {
        nextSelection.add(catId);
        // REMISE EN APPLI : On remonte la chaîne pour cocher tous les parents
        this.selectParents(catId, nextSelection);
      }
    }

    this.selectedIds.set(new Set(nextSelection));

    // On émet le tableau mis à jour au composant parent
    this.selectionChange.emit(this.selectedIds());
  }

  /**
   * Fonction utilitaire privée pour remonter l'arbre généalogique des catégories
   */
/**
 * Fonction utilitaire privée pour remonter l'arbre généalogique des catégories
 */
private selectParents(catId: number, selectedSet: Set<number>): void {
  let currentCat = this.allCategories.find(c => c.id === catId);

  // Tant qu'on trouve la catégorie, on extrait son parent avec le helper
  while (currentCat) {
    const parentId = this.getParentId(currentCat);

    // Si la catégorie n'a plus de parent, on s'arrête
    if (parentId === null) {
      break;
    }

    // On ajoute le parent à la sélection
    selectedSet.add(parentId);

    // On passe au parent supérieur pour continuer à remonter
    currentCat = this.allCategories.find(c => c.id === parentId);
  }
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
onChildSelectionChange(ids: Set<number>) {
  // CORRECTION : On reconstruit le Set avec les nouvelles valeurs reçues de l'enfant
  // pour forcer la détection de changement Angular sur l'instance courante
  this.selectedIds.set(new Set<number>(ids));

  // On remonte l'info au composant parent supérieur
  this.selectionChange.emit(this.selectedIds());
}
}
