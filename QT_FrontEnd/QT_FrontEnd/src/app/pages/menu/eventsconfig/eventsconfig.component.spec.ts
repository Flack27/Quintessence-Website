import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventsconfigComponent } from './eventsconfig.component';

describe('EventsconfigComponent', () => {
  let component: EventsconfigComponent;
  let fixture: ComponentFixture<EventsconfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventsconfigComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EventsconfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
