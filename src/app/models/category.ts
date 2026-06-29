/**
 * Interface représentant une Catégorie de plante.
 * Compatible avec les types Doctrine définis dans Category.php.
 */
export interface Category {
  // L'ID est optionnel lors de la création d'une nouvelle catégorie
  id?: number;

  // Nom de la catégorie (ex: "Intérieur", "Tropicale")
  name: string;

  /**
   * Dans API Platform, le parent est souvent reçu sous forme d'IRI
   * (ex: "/api/categories/5") ou d'objet complet.
   */
  parent?: string | Category | null;

  /**
   * Propriété utilitaire pour les formulaires Angular (ngModel).
   * Permet de stocker l'ID du parent sélectionné dans le <select>[cite: 8].
   */
  parentId?: number | null;

  /**
   * Liste des sous-catégories associées.
   */
  children?: Category[];

  /**
   * Liste des plantes appartenant à cette catégorie (optionnel).
   */
  plants?: string[];

  impliedCategoryIds?: number[];
}
