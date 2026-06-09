import { TestBed } from '@angular/core/testing';

import { PlantImageService } from './plant-image.service';

describe('PlantImageService', () => {
  let service: PlantImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlantImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
