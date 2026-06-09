import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PlantImage } from '../models/plant-image';

@Injectable({
  providedIn: 'root'
})
export class PlantImageService {
  private readonly apiUrl = `${environment.apiUrl}/images`;

  // En-têtes standards pour la récupération et la création (JSON-LD)
  private readonly defaultHeaders = new HttpHeaders({
    'Content-Type': 'application/ld+json',
    'Accept': 'application/ld+json'
  });

  // En-tête rendu valide grâce à l'ajout de patch_formats dans api_platform.yaml
  private readonly patchHeaders = new HttpHeaders({
    'Content-Type': 'application/merge-patch+json'
  });

  constructor(private http: HttpClient) {}

  /**
   * GET /api/images
   * Récupère la collection de toutes les images sous forme de PlantImage[]
   */
  getPlantImages(): Observable<PlantImage[]> {
    return this.http.get<any>(this.apiUrl, { headers: this.defaultHeaders }).pipe(
      map(response => response['hydra:member'] ? response['hydra:member'] : response)
    );
  }

  /**
   * GET /api/images/{id}
   * Récupère une image spécifique
   */
  getPlantImage(id: number): Observable<PlantImage> {
    return this.http.get<PlantImage>(`${this.apiUrl}/${id}`, { headers: this.defaultHeaders });
  }

  /**
   * POST /api/images
   * Crée une nouvelle ressource PlantImage
   * @param imageData Objet contenant l'url, la position et l'IRI de la plante (ex: "/api/plants/707")
   */
  createPlantImage(imageData: { url: string; position: number; plant: string }): Observable<PlantImage> {
    return this.http.post<PlantImage>(this.apiUrl, imageData, { headers: this.defaultHeaders });
  }

  /**
   * PATCH /api/images/{id}
   * Met à jour partiellement une image (ex: changement de position ou d'url seul)
   */
  updatePlantImage(id: number, imageData: Partial<{ url: string; position: number; plant: string }>): Observable<PlantImage> {
    return this.http.patch<PlantImage>(`${this.apiUrl}/${id}`, imageData, { headers: this.patchHeaders });
  }

  /**
   * DELETE /api/images/{id}
   * Supprime une image de la base de données
   */
  deletePlantImage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
