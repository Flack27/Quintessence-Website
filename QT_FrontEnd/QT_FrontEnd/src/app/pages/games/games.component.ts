import { Component, OnInit, AfterViewInit, ViewEncapsulation } from '@angular/core';

interface Achievement {
  icon: string;
  title: string;
  description: string;
}


interface GalleryItem {
  type: 'image' | 'video';
  src: string;
  alt: string;
  youtubeId?: string;
}

interface GameDetails {
  id: string;
  title: string;
  image: string;
  period: string;
  players: string;
  description: string;
  achievements: Achievement[];
  gallery: GalleryItem[];
}

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  encapsulation: ViewEncapsulation.None
})

export class GamesComponent implements OnInit, AfterViewInit {

  // Game details database
  gameDetails: { [key: string]: GameDetails } = {
    'template': {
      id: '',
      title: '',
      image: '',
      period: '',
      players: '',
      description: `
        <p></p>
      `,
      achievements: [
        {
          icon: 'fa-flag',
          title: 'Territory Lords',
          description: 'Controlled Everfall for over 6 months continuously'
        },
        {
          icon: 'fa-shield-alt',
          title: 'Unbreakable',
          description: 'Successfully defended our territory in 15 consecutive wars'
        },
        {
          icon: 'fa-coins',
          title: 'Economic Power',
          description: 'Generated over 10 million gold in territory revenue'
        },
        {
          icon: 'fa-users',
          title: 'Community Builder',
          description: 'Grew to become the largest active guild on the server'
        }
      ],
      gallery: [
        { type: 'image', src: '/assets/games/new-world-gallery-1.jpg', alt: 'Territory control celebration' },
        { type: 'image', src: '/assets/games/new-world-gallery-2.jpg', alt: 'Guild war formation' },
        { type: 'image', src: '/assets/games/new-world-gallery-3.jpg', alt: 'Invasion defense' },
        { type: 'image', src: '/assets/games/new-world-gallery-4.jpg', alt: 'Guild meeting in Everfall' },
        { type: 'video', src: '/assets/games/thumbnails/new-world-war.jpg', alt: 'New World War Highlights', youtubeId: 'dQw4w9WgXcQ' }
      ]
    },
    'throne-and-liberty': {
      id: 'throne-and-liberty',
      title: 'Throne and Liberty',
      image: '/assets/games/TL/Throne_and_Liberty_Banner.png',
      period: '2024-2025',
      players: '100+',
      description: `
        <p>Through our knowledge, optimized builds, and collective experience, we stayed ahead of the curve during the game's early stages. We are proud to have achieved multiple siege victories, dominated the top 15 kill rankings, and secured rank 1 in both activity and the guild leaderboard for an extended period in Throne and Liberty. </p>

        <p>Furthermore, Quintessence had the privilege of attending & ultimately winning the Amazon games' "Siege the Day" live Twitch event in front of thousands of people. During our time within Throne & Liberty, we've also gained invaluable leadership and management experience, which we are looking forward to implementing in our next priority MMO. </p>
      `,
      achievements: [
        {
          icon: 'fa-crown',
          title: 'Siege the Day',
          description: 'Winners of the AGS "Siege the Day" event'
        },
        {
          icon: 'fa-skull',
          title: 'Top kill ranking',
          description: 'dominated the top 15 kill rankings'
        },
        {
          icon: 'fa-medal',
          title: 'Rank 1 guild',
          description: 'Rank 1 guild leaderboard for an extended period of time'
        }
      ],
      gallery: [
        { type: 'image', src: '/assets/games/TL/Throne_and_Liberty_Kills.png', alt: 'Kill ranking' },
        { type: 'image', src: '/assets/games/TL/Throne_and_Liberty_GuildRank.png', alt: 'Guild ranking' },
        { type: 'image', src: '/assets/games/TL/Throne_and_Liberty_Siege.png', alt: 'Siege ranking' },
        { type: 'image', src: '/assets/games/TL/Throne_and_Liberty_Attendance.png', alt: 'Attendance Sheet' },
        { type: 'image', src: '/assets/games/TL/Throne_and_Liberty_Roster.png', alt: 'Roster Sheet' },
        { type: 'video', src: '/assets/games/TL/Throne_and_Liberty_Thumbnail.jpg', alt: 'Throne and Liberty - Siege the Day', youtubeId: 'z03gNmZfAnI' }
      ]
    }
  };

  constructor() { }

  ngOnInit(): void {
    // Initialize component
  }

  ngAfterViewInit(): void {
    // Set up tab functionality
    this.setupTabs();
    // Set up timeline animation
    this.setupTimelineAnimation();
    // Set up modal close on outside click
    this.setupModalCloseOnOutsideClick();
  }

  /**
   * Set up tab switching functionality with timeline animation support
   */
  setupTabs(): void {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Get tab to show
        const tabToShow = button.getAttribute('data-tab');
        if (!tabToShow) return;

        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
          tab.setAttribute('style', 'display: none');
        });

        // Show selected tab
        const tabElement = document.getElementById(`${tabToShow}-tab`);
        if (tabElement) {
          tabElement.setAttribute('style', 'display: block');

          // When switching to "prior" tab, we'll reset the visibility classes
          // so entries can animate when scrolled into view
          if (tabToShow === 'prior') {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
              // Reset all timeline entries to not be visible
              document.querySelectorAll('.timeline-entry').forEach(entry => {
                entry.classList.remove('visible');
              });

              // Now we'll only animate those that are already in the viewport
              this.handleTimelineAnimation();
            }, 50);
          }
        }
      });
    });
  }

  /**
   * Handle timeline animation by checking which elements are in viewport
   */
  handleTimelineAnimation(): void {
    const timelineEntries = document.querySelectorAll('.timeline-entry');
    const priorTabVisible = document.getElementById('prior-tab')?.style.display !== 'none';

    // Only proceed if the prior tab is visible
    if (!priorTabVisible) return;

    timelineEntries.forEach(entry => {
      if (this.isInViewport(entry)) {
        entry.classList.add('visible');
      }
    });
  }

  /**
   * Check if element is in viewport
   * @param element Element to check
   * @returns boolean indicating if element is in viewport
   */
  isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.75 &&
      rect.bottom >= 0
    );
  }

  /**
   * Set up timeline animation for scrolling
   */
  setupTimelineAnimation(): void {
    // Handle scroll event
    window.addEventListener('scroll', () => {
      this.handleTimelineAnimation();
    });

    // We're not automatically triggering the animation on page load anymore
    // This way elements will only animate when they come into view during scrolling
    // or when the "prior" tab is clicked
  }

  /**
   * Set up functionality to close modal when clicking outside content
   */
  setupModalCloseOnOutsideClick(): void {
    const modal = document.getElementById('game-details-modal');

    if (modal) {
      modal.addEventListener('click', (event) => {
        // Check if the click was directly on the modal background (not on its children)
        if (event.target === modal) {
          this.closeGameDetails();
        }
      });
    }
  }

  /**
   * Open external link in new tab
   * @param url URL to open
   */
  openExternalLink(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Open game details modal
   * @param gameId ID of the game to display
   */
  viewGameDetails(gameId: string): void {
    const game = this.gameDetails[gameId];
    if (!game) return;

    // Set modal content
    const modalImage = document.getElementById('modal-image') as HTMLImageElement;
    const modalTitle = document.getElementById('modal-title');
    const gamePeriod = document.getElementById('game-period');
    const gamePlayers = document.getElementById('game-players');
    const gameDescription = document.getElementById('game-description-full');
    const achievementsGrid = document.getElementById('achievements-grid');
    const galleryGrid = document.getElementById('gallery-grid');
    const modal = document.getElementById('game-details-modal');

    // Safety checks
    if (!modalImage || !modalTitle || !gamePeriod ||
      !gamePlayers || !gameDescription || !achievementsGrid || !galleryGrid || !modal) {
      console.error('One or more DOM elements not found');
      return;
    }

    // Set image attributes
    modalImage.src = game.image;
    modalImage.alt = game.title;

    // Set text content
    modalTitle.textContent = game.title;
    gamePeriod.textContent = game.period;
    gamePlayers.textContent = game.players;

    // Set HTML content
    gameDescription.innerHTML = game.description;

    // Clear and populate achievements grid
    achievementsGrid.innerHTML = '';

    game.achievements.forEach(achievement => {
      const achievementEl = document.createElement('div');
      achievementEl.className = 'achievement-card';
      achievementEl.innerHTML = `
      <div class="achievement-wrap">
        <div class="achievement-medal">
          <i class="fas ${achievement.icon}"></i>
        </div>
        <div class="achievement-title">${achievement.title}</div>
                </div>
        <div class="achievement-description">${achievement.description}</div>
      `;
      achievementsGrid.appendChild(achievementEl);
    });

    // Clear and populate gallery
    galleryGrid.innerHTML = '';

    game.gallery.forEach(item => {
      const galleryItem = document.createElement('div');
      galleryItem.className = 'gallery-item';

      if (item.type === 'image') {
        galleryItem.innerHTML = `
          <img src="${item.src}" alt="${item.alt}" class="gallery-image">
          <div class="gallery-overlay">
            <i class="fas fa-search-plus"></i>
          </div>
        `;
        galleryItem.addEventListener('click', () => this.openImageModal(item.src, item.alt));
      } else if (item.type === 'video' && item.youtubeId) {
        galleryItem.innerHTML = `
          <div class="video-thumbnail">
            <img src="${item.src}" alt="${item.alt}" class="gallery-image">
            <div class="play-button">
              <i class="fas fa-play"></i>
            </div>
          </div>
          <div class="gallery-overlay">
            <i class="fab fa-youtube"></i>
          </div>
        `;
        galleryItem.addEventListener('click', () => this.openVideoModal(item.youtubeId as string, item.alt));
      }

      galleryGrid.appendChild(galleryItem);
    });

    // Show modal
    modal.classList.add('open');
  }

  /**
   * Close game details modal
   */
  closeGameDetails(): void {
    const modal = document.getElementById('game-details-modal');
    if (modal) {
      modal.classList.remove('open');
    }
  }

  /**
 * Open image modal to show larger version of an image
 * @param src Image source
 * @param alt Image alt text
 */
  openImageModal(src: string, alt: string): void {
    // Create modal if it doesn't exist
    let imageModal = document.getElementById('image-modal');

    if (!imageModal) {
      imageModal = document.createElement('div');
      imageModal.id = 'image-modal';
      imageModal.className = 'fullscreen-modal';
      imageModal.style.position = 'fixed'; // Ensure it stays fixed
      imageModal.innerHTML = `
        <div class="modal-content fullscreen-content">
          <img src="" alt="" id="fullscreen-image" class="fullscreen-image">
        </div>
      `;
      document.body.appendChild(imageModal);

      // Add close event listener - completely remove the modal
      const closeButton = document.getElementById('image-modal-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.closeImageModal();
        });
      }

      // Close on click outside image
      imageModal.addEventListener('click', (event) => {
        if (event.target === imageModal) {
          this.closeImageModal();
        }
      });
    }

    // Set image source and alt
    const fullscreenImage = document.getElementById('fullscreen-image') as HTMLImageElement;
    if (fullscreenImage) {
      fullscreenImage.src = src;
      fullscreenImage.alt = alt;
    }

    // Open modal
    imageModal.classList.add('open');
  }

  /**
   * Close the image modal and clean up
   */
  closeImageModal(): void {
    const imageModal = document.getElementById('image-modal');
    if (imageModal) {
      // First remove the open class (for animation)
      imageModal.classList.remove('open');

      // Clean up - remove src attribute from image
      const fullscreenImage = document.getElementById('fullscreen-image') as HTMLImageElement;
      if (fullscreenImage) {
        fullscreenImage.src = '';
        fullscreenImage.alt = '';
      }

      // Remove the modal from DOM after animation completes
      setTimeout(() => {
        if (imageModal.parentNode) {
          imageModal.parentNode.removeChild(imageModal);
        }
      }, 300); // Match transition time from CSS
    }
  }

  /**
   * Open video modal to play YouTube video
   * @param youtubeId YouTube video ID
   * @param title Video title
   */
  openVideoModal(youtubeId: string, title: string): void {
    // Create modal if it doesn't exist
    let videoModal = document.getElementById('video-modal');

    if (!videoModal) {
      videoModal = document.createElement('div');
      videoModal.id = 'video-modal';
      videoModal.className = 'fullscreen-modal';
      videoModal.style.position = 'fixed'; // Ensure it stays fixed
      videoModal.innerHTML = `
        <div class="modal-content video-content">
          <div class="video-container">
            <iframe id="youtube-iframe" src="" frameborder="0" allowfullscreen></iframe>
          </div>
          <h3 id="video-title" class="video-title"></h3>
        </div>
      `;
      document.body.appendChild(videoModal);

      // Add close event listener
      const closeButton = document.getElementById('video-modal-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.closeVideoModal();
        });
      }

      // Add click outside to close
      videoModal.addEventListener('click', (event) => {
        if (event.target === videoModal) {
          this.closeVideoModal();
        }
      });
    }

    // Set video source and title
    const videoIframe = document.getElementById('youtube-iframe') as HTMLIFrameElement;
    const videoTitleEl = document.getElementById('video-title');

    if (videoIframe) {
      videoIframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
    }

    if (videoTitleEl) {
      videoTitleEl.textContent = title;
    }

    // Open modal
    videoModal.classList.add('open');
  }

  /**
   * Close the video modal and clean up
   */
  closeVideoModal(): void {
    const videoModal = document.getElementById('video-modal');
    if (videoModal) {
      // First remove the open class (for animation)
      videoModal.classList.remove('open');

      // Stop video playback
      const iframe = document.getElementById('youtube-iframe') as HTMLIFrameElement;
      if (iframe && iframe.src) {
        iframe.src = '';
      }

      // Remove the modal from DOM after animation completes
      setTimeout(() => {
        if (videoModal.parentNode) {
          videoModal.parentNode.removeChild(videoModal);
        }
      }, 300); // Match transition time from CSS
    }
  }
}
