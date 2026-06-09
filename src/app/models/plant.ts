import { PlantImage } from "./plant-image";

export interface Plant {
  id: number;
  name: string;
  images: PlantImage[];
  commonName:string;
}
