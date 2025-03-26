import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XpconfigComponent } from './xpconfig.component';

describe('XpconfigComponent', () => {
  let component: XpconfigComponent;
  let fixture: ComponentFixture<XpconfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [XpconfigComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(XpconfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
