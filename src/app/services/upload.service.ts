import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly uploadUrl = `${environment.apiUrl}/upload`;

  // Cache pour éviter de rappeler l'API du préfixe inutilement
  private prefix$: Observable<string> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Récupère le préfixe configuré dans l'environnement Symfony
   */
  getUploadPrefix(): Observable<string> {
    if (!this.prefix$) {
      this.prefix$ = this.http.get<{ prefix: string }>(`${this.uploadUrl}/prefix`).pipe(
        map(res => res.prefix),
        shareReplay(1) // Garde le résultat en mémoire
      );
    }
    return this.prefix$;
  }

  /**
   * Upload un fichier avec un nom (chemin relatif)
   * @param file Le fichier issu de l'input HTML
   * @param relativePath Le chemin (ex: 'interieur/ma-plante')
   */
  uploadPlantImage(file: File, relativePath: string): Observable<{ path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', relativePath);

    return this.http.post<{ path: string }>(this.uploadUrl, formData);
  }
}
