import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment'; // Import dynamique
import { Plant } from '../models/plant'; // Import de l'interface
import { map } from 'rxjs/operators';
import { QuizzQuestion } from '../models/quizzQuestion';
import { UploadService } from './upload.service';
import { HydraCollection } from '../models/api-response';

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  private apiUrl = environment.apiUrl;
  private plantUrl = this.apiUrl + "/plants";
  private quizzUrl = this.apiUrl+"/quizz";
  private uploadUrl$ = this.uploadService.getUploadPrefix();

  constructor(private http: HttpClient,
    private uploadService: UploadService) {}

  /**
   * HttpClient s'occupe de mapper le JSON vers l'interface Plant automatiquement
   */
  async getRandomPlant(): Promise<Plant> {
    // On combine la récupération de la plante et du préfixe
    const obs$ = forkJoin({
      plant: this.http.get<Plant>(`${this.quizzUrl}/randomPlant`),
      prefix: this.uploadUrl$
    }).pipe(
      map(({ plant, prefix }) => {
        if (plant.imageUrl && !plant.imageUrl.startsWith('http')) {
          // Utilisation du préfixe dynamique (ex: http://localhost:8000/uploads/plants/)
          plant.imageUrl = `${prefix}${plant.imageUrl}`;
        }
        return plant;
      })
    );
    return await firstValueFrom(obs$);
  }

  findRandomPlant(n : number): Observable<Plant[]> {
    return this.http.get<Plant[]>(`${this.quizzUrl}/randomPlant/${n}`);
  }

  getNewQuestion(failedIds: number[], categoryIds: number[] = []): Observable<QuizzQuestion> {
    const body = { failedIds: failedIds, categoryIds: categoryIds };

    // Symfony attend du JSON, Angular l'envoie par défaut avec HttpClient.post
    return this.http.post(`${this.quizzUrl}/build-options`, body, {
      responseType: 'text' // On demande du texte pour éviter l'erreur de parsing
    }).pipe(
      map(res => {
        console.log('Réponse brute du serveur :', res);
        return JSON.parse(res); // On tente le parse manuellement pour voir où ça bloque
      })
    );
  }
  findAll(page: number = 1): Observable<{ plants: Plant[], total: number }> {
    const headers = new HttpHeaders({ 'Accept': 'application/ld+json' });

    return this.http.get<HydraCollection<Plant>>(`${this.plantUrl}?page=${page}`, { headers }).pipe(
      map(data => {
        return {
          // On gère les deux variantes de clés ici, une fois pour toutes
          plants: data['member'] || data['hydra:member'] || [],
          total: data['totalItems'] || data['hydra:totalItems'] || 0
        };
      })
    );
  }

  create(plant: any): Observable<any> {
    return this.http.post(`${this.plantUrl}`, plant, { headers: { 'Content-Type': 'application/json' }});
  }

  update(id: number, plant: any): Observable<any> {
    return this.http.patch(`${this.plantUrl}/${id}`, plant, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
  }

  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.plantUrl}/${id}`); }


/**
   * On délègue l'upload au service spécialisé.
   * Le composant n'appelle que cette méthode.
   */
uploadPlantImage(file: File, plantName: string): Observable<{ path: string }> {
  // Si tu veux ajouter une logique de dossier spécifique, c'est ici :
  const relativePath = `plants/${plantName}`;
  return this.uploadService.uploadPlantImage(file, relativePath);
}

// Cette méthode est utile pour le composant pour afficher l'image uploadée
getPrefix(): Observable<string> {
  return this.uploadService.getUploadPrefix();
}

}
