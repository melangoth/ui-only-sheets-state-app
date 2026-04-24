import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the navbar brand', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.navbar-brand')?.textContent).toContain('Color Toggle App');
  });

  it('should call initializeSignIn after view init with the google-sign-in-button element id', async () => {
    vi.useFakeTimers();
    const auth = TestBed.inject(AuthService);
    const spy = vi.spyOn(auth, 'initializeSignIn').mockResolvedValue();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // triggers ngAfterViewInit

    expect(spy).not.toHaveBeenCalled(); // not yet — deferred with setTimeout
    await vi.runAllTimersAsync(); // flush the setTimeout(0)
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('google-sign-in-button');

    vi.useRealTimers();
  });
});
