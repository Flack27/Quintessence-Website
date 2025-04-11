import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone, Renderer2, QueryList, ViewChildren, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('aboutVideo') aboutVideoElement!: ElementRef<HTMLVideoElement>;
  @ViewChildren('joinProcessVideo') joinProcessVideos!: QueryList<ElementRef<HTMLVideoElement>>;

  private aboutVideoObserver: IntersectionObserver | null = null;
  private joinVideoObservers: IntersectionObserver[] = [];
  private userInteracted = false;
  private refreshAttempts = 0;
  private maxRefreshAttempts = 3;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private el: ElementRef,
    private renderer: Renderer2
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)).subscribe(() => {
        sessionStorage.setItem('wasNavigation', 'true');
      });
  }

  ngAfterViewInit() {
    this.initFaqAccordion();
    this.initSmoothScrolling();
    this.initBackToTopButton();

    this.setupAboutVideoObserver();
    this.setupJoinProcessVideoObservers();
    this.handleVisibilityChange();
    this.setupUserInteractionTracking();
    this.setupAnimationListeners();

    // Check if this was a refresh or navigation
    const wasNavigation = sessionStorage.getItem('wasNavigation') === 'true';

    if (!wasNavigation) {
      // This was likely a page refresh - try periodically to play the videos
      this.attemptPlayOnRefresh();
    }

    // Reset for next page load detection
    sessionStorage.setItem('wasNavigation', 'false');
  }

  ngOnDestroy() {
    // Clean up the observers when the component is destroyed
    if (this.aboutVideoObserver) {
      this.aboutVideoObserver.disconnect();
    }

    this.joinVideoObservers.forEach(observer => {
      observer.disconnect();
    });

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

    // Once we know the user has interacted, try playing all videos that are visible
    if (this.isVideoInViewport(this.aboutVideoElement?.nativeElement) &&
      this.aboutVideoElement?.nativeElement?.paused) {
      this.playVideo(this.aboutVideoElement?.nativeElement);
    }

    // Check and play join process videos if visible
    this.joinProcessVideos.forEach(videoRef => {
      if (this.isVideoInViewport(videoRef.nativeElement) &&
        videoRef.nativeElement?.paused) {
        this.playVideo(videoRef.nativeElement);
      }
    });
  }

  private attemptPlayOnRefresh() {
    // Only try a few times to avoid infinite loops
    if (this.refreshAttempts >= this.maxRefreshAttempts) return;

    this.refreshAttempts++;

    // Use setTimeout to attempt playback after a short delay
    setTimeout(() => {
      this.ngZone.run(() => {
        // Try to play about video if visible
        if (this.isVideoInViewport(this.aboutVideoElement?.nativeElement) &&
          this.aboutVideoElement?.nativeElement?.paused) {
          console.log(`Attempt ${this.refreshAttempts}: Trying to autoplay about video after refresh`);
          this.playVideo(this.aboutVideoElement?.nativeElement);
        }

        // Try to play all join process videos if visible
        this.joinProcessVideos.forEach((videoRef, index) => {
          if (this.isVideoInViewport(videoRef.nativeElement) &&
            videoRef.nativeElement?.paused) {
            console.log(`Attempt ${this.refreshAttempts}: Trying to autoplay join process video ${index + 1} after refresh`);
            this.playVideo(videoRef.nativeElement);
          }
        });

        // If videos are still paused, try again with a slightly longer delay
        setTimeout(() => {
          const aboutStillPaused = this.aboutVideoElement?.nativeElement?.paused;
          const joinVideosPaused = this.joinProcessVideos.some(ref => ref.nativeElement?.paused);

          if ((aboutStillPaused || joinVideosPaused) && this.refreshAttempts < this.maxRefreshAttempts) {
            this.attemptPlayOnRefresh();
          }
        }, 500);
      });
    }, 500 * this.refreshAttempts); // Increasing delay with each attempt
  }

  private isVideoInViewport(video: HTMLVideoElement | undefined): boolean {
    if (!video) return false;

    const rect = video.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  private setupAnimationListeners(): void {
    const heroLogo = this.el.nativeElement.querySelector('.hero-logo');
    const scrollIndicator = this.el.nativeElement.querySelector('.scroll-indicator');

    if (heroLogo) {
      heroLogo.addEventListener('animationend', (event: AnimationEvent) => {
        // Use includes instead of exact match to handle Angular's name transformations
        if (event.animationName.includes('fadeInUp')) {
          console.log('Logo animation completed:', event.animationName);
          this.renderer.addClass(heroLogo, 'loaded');
        }
      });
    }

    if (scrollIndicator) {
      scrollIndicator.addEventListener('animationend', (event: AnimationEvent) => {
        // Use includes instead of exact match to handle Angular's name transformations
        if (event.animationName.includes('fadeInUpArrow')) {
          console.log('Arrow animation completed:', event.animationName);
          this.renderer.addClass(scrollIndicator, 'loaded');
        }
      });
    }

    // Backup approach with timeouts - in case the event listeners fail
    setTimeout(() => {
      if (heroLogo && !heroLogo.classList.contains('loaded')) {
        console.log('Adding loaded class to logo via timeout fallback');
        this.renderer.addClass(heroLogo, 'loaded');
      }
    }, 2000); // Ensure this is longer than fadeInUp duration + delay

    setTimeout(() => {
      if (scrollIndicator && !scrollIndicator.classList.contains('loaded')) {
        console.log('Adding loaded class to scroll indicator via timeout fallback');
        this.renderer.addClass(scrollIndicator, 'loaded');
      }
    }, 3000); // Ensure this is longer than fadeInUpArrow duration + delay
  }

  private setupAboutVideoObserver() {
    const options = {
      threshold: 0.2 // 20% of the element must be visible
    };

    this.aboutVideoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.playVideo(entry.target as HTMLVideoElement);
        } else {
          this.pauseVideo(entry.target as HTMLVideoElement);
        }
      });
    }, options);

    // Start observing the about video element
    if (this.aboutVideoElement?.nativeElement) {
      this.aboutVideoObserver.observe(this.aboutVideoElement.nativeElement);
    }
  }

  private setupJoinProcessVideoObservers() {
    // Wait for the ViewChildren to be initialized
    setTimeout(() => {
      this.joinProcessVideos.forEach((videoRef, index) => {
        const options = {
          threshold: 0.2 // 20% of the element must be visible
        };

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.playVideo(entry.target as HTMLVideoElement);
            } else {
              this.pauseVideo(entry.target as HTMLVideoElement);
            }
          });
        }, options);

        if (videoRef.nativeElement) {
          observer.observe(videoRef.nativeElement);
          this.joinVideoObservers.push(observer);
        }
      });
    }, 200); // Small delay to ensure DOM is ready
  }

  private handleVisibilityChange = () => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Check and play about video if visible
        if (this.isVideoInViewport(this.aboutVideoElement?.nativeElement)) {
          this.playVideo(this.aboutVideoElement?.nativeElement);
        }

        // Check and play join process videos if visible
        this.joinProcessVideos.forEach(videoRef => {
          if (this.isVideoInViewport(videoRef.nativeElement)) {
            this.playVideo(videoRef.nativeElement);
          }
        });
      } else {
        // Pause all videos when tab is not visible
        this.pauseVideo(this.aboutVideoElement?.nativeElement);

        this.joinProcessVideos.forEach(videoRef => {
          this.pauseVideo(videoRef.nativeElement);
        });
      }
    });
  }

  private playVideo(video: HTMLVideoElement | undefined) {
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

  private pauseVideo(video: HTMLVideoElement | undefined) {
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
