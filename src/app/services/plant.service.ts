import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment'; // Import dynamique
import { Plant } from '../models/plant'; // Import de l'interface
import { map } from 'rxjs/operators';
import { QuizzQuestion } from '../models/quizzQuestion';

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  private apiUrl = environment.apiUrl+'/plants'

  constructor(private http: HttpClient) {}

  /**
   * HttpClient s'occupe de mapper le JSON vers l'interface Plant automatiquement
   */
  async getRandomPlant(): Promise<Plant> {
    const obs$ = this.http.get<Plant>(`${this.apiUrl}/randomPlant`).pipe(
      map(plant => {
        // Si l'URL de l'image ne commence pas déjà par "http"
        if (plant.imageUrl && !plant.imageUrl.startsWith('http')) {
          // On concatène l'URL de base du serveur PHP
          plant.imageUrl = `${environment.apiUrl}/${plant.imageUrl}`;
        }
        return plant;
      })
    );
    return await firstValueFrom(obs$);
  }

  findRandomPlant(n : number): Observable<Plant[]> {
    return this.http.get<Plant[]>(`${this.apiUrl}/randomPlant/${n}`);
  }

  getNewQuestion(failedIds: number[]): Observable<QuizzQuestion> {
    const body = { failedIds: failedIds };

    // Symfony attend du JSON, Angular l'envoie par défaut avec HttpClient.post
    return this.http.post<QuizzQuestion>(`${this.apiUrl}/build-options`, body).pipe(
      map(question => {
        // Si l'URL de l'image ne commence pas déjà par "http"
        if (question.target.imageUrl && !question.target.imageUrl.startsWith('http')) {
          // On concatène l'URL de base du serveur PHP
          question.target.imageUrl = `${environment.apiUrl}/${question.target.imageUrl}`;
        }
        return question;
      })
    );;
  }
  findAll(): Observable<Plant[]> {
    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });
    return this.http.get<Plant[]>(`${this.apiUrl}`,{headers: headers}); }

  create(plant: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, plant, { headers: { 'Content-Type': 'application/json' }});
  }

  update(id: number, plant: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, plant, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
  }

  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/${id}`); }

}
