// Dans un fichier models/api-response.ts ou directement dans le service
export interface HydraCollection<T> {
  'member'?: T[];
  'hydra:member'?: T[];
  'totalItems'?: number;
  'hydra:totalItems'?: number;
  'view'?: {
    '@id': string;
    'next'?: string;
    'last'?: string;
  };
}
