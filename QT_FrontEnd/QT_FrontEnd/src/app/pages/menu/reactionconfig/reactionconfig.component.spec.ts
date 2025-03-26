import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionconfigComponent } from './reactionconfig.component';

describe('ReactionconfigComponent', () => {
  let component: ReactionconfigComponent;
  let fixture: ComponentFixture<ReactionconfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReactionconfigComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReactionconfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
