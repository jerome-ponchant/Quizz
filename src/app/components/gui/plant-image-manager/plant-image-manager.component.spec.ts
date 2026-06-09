import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlantImageManagerComponent } from './plant-image-manager.component';

describe('PlantImageManagerComponent', () => {
  let component: PlantImageManagerComponent;
  let fixture: ComponentFixture<PlantImageManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantImageManagerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlantImageManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
