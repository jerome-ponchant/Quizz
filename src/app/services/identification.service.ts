import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UploadService } from './upload.service';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IdentificationResult {
  analysis: string;
  scientificName: string;
  vernacularName: string | null;
  familyName: string;
}

@Injectable({
  providedIn: 'root'
})
export class IdentificationService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private uploadService: UploadService) { }

    /**
   * Envoie une ou plusieurs images au service d'identification
   * Redimensionne automatiquement les images lourdes avant l'envoi
   */
    identifyPlantFromImages(files: File[]): Observable<IdentificationResult> {
      const formData = new FormData();

      // On transforme le tableau de fichiers en promesses de compression Canvas
      const resizePromises = files.map((file) => this.compressImage(file));

      return from(Promise.all(resizePromises)).pipe(
        switchMap((compressedBlobs: Blob[]) => {
          // Ajout de toutes les images optimisées sous la clé attendue par Symfony
          compressedBlobs.forEach((blob, index) => {
            formData.append('images[]', blob, `scan_part_${index}.jpg`);
          });

          return this.http.post<IdentificationResult>(
            `${this.apiUrl}/identify`,
            formData
          );
        })
      );
    }

    /**
     * Réduit la taille des photos (max 1200px) et convertit en JPEG léger (80%)
     * pour éviter d'envoyer des Mo inutiles de Base64 à l'API.
     */
    private compressImage(
      file: File,
      maxDimension: number = 1200
    ): Promise<Blob> {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event: any) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                resolve(blob || file);
              },
              'image/jpeg',
              0.8
            );
          };
        };
      });
    }
}
