import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category } from '../models/category';


@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = environment.apiUrl+'/categories';

  constructor(private http: HttpClient) {}

  /** Récupère la liste des catégories[cite: 6] */
  findAll(): Observable<Category[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(data => {
        // On extrait le tableau de la réponse API Platform
        return data['member'] || data['hydra:member'] || (Array.isArray(data) ? data : [] || []);
      })
    );
  }

  /** Crée une nouvelle catégorie[cite: 6] */
  create(category: Category): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category);
  }

  /** Supprime une catégorie par ID[cite: 6] */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Met à jour une catégorie existante */
  update(id: number, category: Category): Observable<Category> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/merge-patch+json'
    });
    return this.http.patch<Category>(`${this.apiUrl}/${id}`, category,{headers});
  }

  /**
 * Calcule la fermeture transitive (toutes les implications logiques et leurs parents)
 * à partir d'un ensemble de catégories sélectionnées, en évitant les cycles.
 * * @param selectedIds L'ensemble des IDs initialement sélectionnés
 * @param allCategories La liste globale de toutes les catégories pour la recherche
 * @returns Un nouveau Set contenant tous les IDs impliqués et leurs parents
 */
  findImpliedCategories(selectedIds: Set<number>, allCategories: Category[]): Set<number> {
    // SÉCURITÉ : On filtre immédiatement pour enlever 'undefined' ou 'null' du Set de départ
    const cleanIds = Array.from(selectedIds).filter(id => id !== undefined && id !== null);
    const visited = new Set<number>(cleanIds);
    const queue: number[] = Array.from(visited);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentCat = allCategories.find(c => c.id === currentId);
      if (!currentCat) continue;

      // --- CORRECTION DE L'EXTRACTION DES IMPLICATIONS ---
      // On récupère la propriété brute renvoyée par Doctrine/API Platform
      const rawImplied = currentCat.impliedCategoryIds || (currentCat as any).impliedCategories || [];
      const impliedIds: number[] = [];

      if (Array.isArray(rawImplied)) {
        for (const item of rawImplied) {
          if (typeof item === 'number') {
            impliedIds.push(item);
          } else if (typeof item === 'object' && item !== null && item.id) {
            impliedIds.push(item.id);
          } else if (typeof item === 'string') {
            // Si c'est un IRI du type "/api/categories/5", on extrait le numéro final
            const idFromIri = +item.split('/').pop()!;
            if (!isNaN(idFromIri)) {
              impliedIds.push(idFromIri);
            }
          }
        }
      }

      // On applique les implications trouvées
      for (const impliedId of impliedIds) {
        if (!visited.has(impliedId)) {
          visited.add(impliedId);
          queue.push(impliedId);
        }
      }

      // 2. Gestion des parents (Ascendants)
      const parentId = this.extractIdFromParent(currentCat.parent);
      if (parentId !== null && !visited.has(parentId)) {
        visited.add(parentId);
        queue.push(parentId);
      }
    }

    return visited;
  }

/**
 * Utilitaire pour extraire l'ID numérique du parent (Objet ou chaîne IRI)
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
}
