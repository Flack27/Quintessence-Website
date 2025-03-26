import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('aboutVideo') videoElement!: ElementRef<HTMLVideoElement>;
  private observer: IntersectionObserver | null = null;
  private userInteracted = false;
  private refreshAttempts = 0;
  private maxRefreshAttempts = 3;

  constructor(
    private router: Router,
    private ngZone: NgZone
  ) {
    // Track if the page was loaded via navigation or refresh
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Set a flag indicating this was a navigation, not a refresh
      sessionStorage.setItem('wasNavigation', 'true');
    });
  }

  ngAfterViewInit() {
    this.initFaqAccordion();
    this.initSmoothScrolling();
    this.initBackToTopButton();

    this.setupVideoObserver();
    this.handleVisibilityChange();
    this.setupUserInteractionTracking();

    // Check if this was a refresh or navigation
    const wasNavigation = sessionStorage.getItem('wasNavigation') === 'true';

    if (!wasNavigation) {
      // This was likely a page refresh - try periodically to play the video
      this.attemptPlayOnRefresh();
    }

    // Reset for next page load detection
    sessionStorage.setItem('wasNavigation', 'false');
  }

  ngOnDestroy() {
    // Clean up the observer when the component is destroyed
    if (this.observer) {
      this.observer.disconnect();
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    // Remove interaction listeners
    document.removeEventListener('click', this.markUserInteraction);
    document.removeEventListener('keydown', this.markUserInteraction);
    document.removeEventListener('touchstart', this.markUserInteraction);
    document.removeEventListener('scroll', this.markUserInteraction);
  }

  private setupUserInteractionTracking() {
    this.markUserInteraction = this.markUserInteraction.bind(this);

    // Track various types of user interaction
    document.addEventListener('click', this.markUserInteraction);
    document.addEventListener('keydown', this.markUserInteraction);
    document.addEventListener('touchstart', this.markUserInteraction);
    document.addEventListener('scroll', this.markUserInteraction);
  }

  private markUserInteraction() {
    this.userInteracted = true;

    // Once we know the user has interacted, try playing the video if it's visible
    if (this.isVideoInViewport() && this.videoElement?.nativeElement?.paused) {
      this.playVideo();
    }
  }

  private attemptPlayOnRefresh() {
    // Only try a few times to avoid infinite loops
    if (this.refreshAttempts >= this.maxRefreshAttempts) return;

    this.refreshAttempts++;

    // Use setTimeout to attempt playback after a short delay
    setTimeout(() => {
      this.ngZone.run(() => {
        if (this.isVideoInViewport() && this.videoElement?.nativeElement?.paused) {
          console.log(`Attempt ${this.refreshAttempts}: Trying to autoplay video after refresh`);
          this.playVideo();

          // If still paused, try again with a slightly longer delay
          setTimeout(() => {
            if (this.videoElement?.nativeElement?.paused) {
              this.attemptPlayOnRefresh();
            }
          }, 500);
        }
      });
    }, 500 * this.refreshAttempts); // Increasing delay with each attempt
  }

  private isVideoInViewport(): boolean {
    const video = this.videoElement?.nativeElement;
    if (!video) return false;

    const rect = video.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  private setupVideoObserver() {
    const options = {
      threshold: 0.2 // 20% of the element must be visible
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.playVideo();
        } else {
          this.pauseVideo();
        }
      });
    }, options);

    // Start observing the video element
    if (this.videoElement?.nativeElement) {
      this.observer.observe(this.videoElement.nativeElement);
    }
  }

  private handleVisibilityChange = () => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (this.isVideoInViewport()) {
          this.playVideo();
        }
      } else {
        this.pauseVideo();
      }
    });
  }

  private playVideo() {
    const video = this.videoElement?.nativeElement;
    if (video) {
      // Add muted attribute explicitly - browsers are more likely to autoplay muted videos
      video.muted = true;

      video.play().catch(error => {
        console.error("Error playing the video:", error);

        // If error is related to autoplay policy, we need user interaction
        if (error.name === 'NotAllowedError') {
          console.log("Autoplay blocked - waiting for user interaction");
        }
      });
    }
  }

  private pauseVideo() {
    const video = this.videoElement?.nativeElement;
    if (video) {
      video.pause();
    }
  }


  private initFaqAccordion(): void {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
      question.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const answer = target.nextElementSibling as HTMLElement;
        const isActive = target.classList.contains('active');

        // Close all other answers
        document.querySelectorAll('.faq-question').forEach(q => {
          q.classList.remove('active');
          (q.nextElementSibling as HTMLElement).classList.remove('active');
        });

        // Toggle current answer
        if (!isActive) {
          target.classList.add('active');
          answer.classList.add('active');
        }
      });
    });
  }

  private initSmoothScrolling(): void {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        const target = event.currentTarget as HTMLAnchorElement;
        const targetId = target.getAttribute('href');

        // Special handling for back-to-top (href="#")
        if (targetId === '#') {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
          return;
        }

        // Regular anchor links
        if (targetId) {
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            const offset = 76;
            const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
              top: elementPosition - offset,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  }

  private initBackToTopButton(): void {
    const backToTopButton = document.querySelector('.back-to-top') as HTMLElement;

    if (backToTopButton) {
      window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
          backToTopButton.classList.add('visible');
        } else {
          backToTopButton.classList.remove('visible');
        }
      });
    }
  }
}
