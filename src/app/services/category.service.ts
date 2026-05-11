import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    return this.http.patch<Category>(`${this.apiUrl}/${id}`, category);
  }
}
