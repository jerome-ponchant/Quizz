import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // Import dynamique
import { Plant } from '../models/plant'; // Import de l'interface
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  private readonly BASE_URL = `${environment.apiUrl}/quizz`;

  constructor(private http: HttpClient) {}

  /**
   * HttpClient s'occupe de mapper le JSON vers l'interface Plant automatiquement
   */
  getRandomPlant(): Observable<Plant> {
    return this.http.get<Plant>(`${this.BASE_URL}/randomPlant`).pipe(
      map(plant => {
        // Si l'URL de l'image ne commence pas déjà par "http"
        if (plant.imageUrl && !plant.imageUrl.startsWith('http')) {
          // On concatène l'URL de base du serveur PHP
          plant.imageUrl = `${environment.apiUrl}/${plant.imageUrl}`;
        }
        return plant;
      })
    );
  }

}
