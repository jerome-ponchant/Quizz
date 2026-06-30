import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlantDetailSandboxComponent } from './plant-detail-sandbox.component';

describe('PlantDetailSandboxComponent', () => {
  let component: PlantDetailSandboxComponent;
  let fixture: ComponentFixture<PlantDetailSandboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantDetailSandboxComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlantDetailSandboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
