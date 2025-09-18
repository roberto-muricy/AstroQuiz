/**
 * 🎮 AstroQuiz Design System - Interactive Components
 * JavaScript para componentes interativos do design system
 * 
 * @version 1.0.0
 * @author AstroQuiz Team
 */

class AstroQuizComponents {
  constructor() {
    this.init();
  }

  init() {
    this.initProgressBars();
    this.initTabBar();
    this.initCards();
    this.initButtons();
    this.initRatingStars();
    this.initAnimations();
    this.initAccessibility();
    
    console.log('🎨 AstroQuiz Design System initialized');
  }

  /* ========================================
     📊 PROGRESS BAR COMPONENTS
     ======================================== */

  initProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar-container');
    
    progressBars.forEach(progressBar => {
      const fill = progressBar.querySelector('.progress-bar-fill');
      const percentage = progressBar.dataset.progress || 0;
      
      if (fill) {
        this.animateProgress(fill, percentage);
      }
    });

    // Circular progress bars
    const circularProgress = document.querySelectorAll('.circular-progress');
    circularProgress.forEach(progress => {
      const percentage = progress.dataset.progress || 0;
      this.animateCircularProgress(progress, percentage);
    });
  }

  animateProgress(fill, percentage) {
    fill.style.setProperty('--progress-width', `${percentage}%`);
    
    // Animate with CSS
    setTimeout(() => {
      fill.style.width = `${percentage}%`;
      fill.classList.add('animate');
    }, 100);

    // Update thumb position
    const thumb = fill.querySelector('.progress-bar-thumb');
    if (thumb && percentage > 0) {
      setTimeout(() => {
        thumb.style.right = `-8px`;
      }, 600);
    }
  }

  animateCircularProgress(progress, percentage) {
    const fill = progress.querySelector('.circular-progress-fill');
    const text = progress.querySelector('.circular-progress-text');
    
    if (fill) {
      const radius = 37; // Radius of the circle
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percentage / 100) * circumference;
      
      fill.style.strokeDasharray = circumference;
      fill.style.strokeDashoffset = circumference;
      
      setTimeout(() => {
        fill.style.strokeDashoffset = offset;
      }, 100);
    }
    
    if (text) {
      this.countUp(text, 0, percentage, 1000);
    }
  }

  countUp(element, start, end, duration) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      
      element.textContent = `${current}%`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /* ========================================
     🔽 TAB BAR COMPONENTS
     ======================================== */

  initTabBar() {
    const tabItems = document.querySelectorAll('.tab-item');
    
    tabItems.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(tab);
      });

      // Keyboard navigation
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.switchTab(tab);
        }
      });
    });
  }

  switchTab(activeTab) {
    const tabBar = activeTab.closest('.tab-bar');
    const allTabs = tabBar.querySelectorAll('.tab-item');
    
    // Remove active state from all tabs
    allTabs.forEach(tab => {
      tab.classList.remove('tab-item-active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    // Add active state to clicked tab
    activeTab.classList.add('tab-item-active');
    activeTab.setAttribute('aria-selected', 'true');
    
    // Trigger custom event
    const event = new CustomEvent('tabChanged', {
      detail: {
        activeTab: activeTab.dataset.tab,
        element: activeTab
      }
    });
    document.dispatchEvent(event);
    
    // Add ripple effect
    this.addRippleEffect(activeTab);
  }

  /* ========================================
     🃏 CARD COMPONENTS
     ======================================== */

  initCards() {
    const cards = document.querySelectorAll('.card, .level-card-individual, .daily-challenge-card');
    
    cards.forEach(card => {
      // Add hover effects
      card.addEventListener('mouseenter', () => {
        this.addCardHoverEffect(card);
      });
      
      card.addEventListener('mouseleave', () => {
        this.removeCardHoverEffect(card);
      });
      
      // Add click effects
      card.addEventListener('click', (e) => {
        if (!card.classList.contains('level-card-locked')) {
          this.addCardClickEffect(card);
        }
      });

      // Keyboard support
      if (card.hasAttribute('tabindex')) {
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
          }
        });
      }
    });

    // Question cards with options
    const questionOptions = document.querySelectorAll('.question-card .option');
    questionOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.selectQuestionOption(option);
      });
    });
  }

  addCardHoverEffect(card) {
    card.style.transform = 'translateY(-4px)';
    card.style.transition = 'all 0.25s ease-out';
  }

  removeCardHoverEffect(card) {
    card.style.transform = 'translateY(0)';
  }

  addCardClickEffect(card) {
    card.style.transform = 'scale(0.98)';
    setTimeout(() => {
      card.style.transform = 'translateY(-4px)';
    }, 150);
  }

  selectQuestionOption(option) {
    const questionCard = option.closest('.question-card');
    const allOptions = questionCard.querySelectorAll('.option');
    
    // Remove selected state from all options
    allOptions.forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-selected', 'false');
    });
    
    // Add selected state to clicked option
    option.classList.add('selected');
    option.setAttribute('aria-selected', 'true');
    
    // Trigger custom event
    const event = new CustomEvent('optionSelected', {
      detail: {
        option: option.dataset.option,
        element: option,
        questionCard
      }
    });
    document.dispatchEvent(event);
  }

  /* ========================================
     🔘 BUTTON COMPONENTS
     ======================================== */

  initButtons() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
      // Add ripple effect on click
      button.addEventListener('click', (e) => {
        if (!button.disabled) {
          this.addRippleEffect(button, e);
        }
      });

      // Loading state management
      if (button.dataset.loading === 'true') {
        this.setButtonLoading(button, true);
      }
    });
  }

  addRippleEffect(element, event = null) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    
    let x, y;
    if (event) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else {
      x = rect.width / 2;
      y = rect.height / 2;
    }
    
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      width: ${size}px;
      height: ${size}px;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      z-index: 1;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  setButtonLoading(button, loading) {
    if (loading) {
      button.classList.add('btn-loading');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
    }
  }

  /* ========================================
     ⭐ RATING STARS
     ======================================== */

  initRatingStars() {
    const ratingContainers = document.querySelectorAll('.rating-stars');
    
    ratingContainers.forEach(container => {
      const stars = container.querySelectorAll('.rating-star');
      const currentRating = parseInt(container.dataset.rating) || 0;
      
      // Set initial rating
      this.setRating(container, currentRating);
      
      // Add interactive behavior if not readonly
      if (!container.hasAttribute('readonly')) {
        stars.forEach((star, index) => {
          star.addEventListener('click', () => {
            this.setRating(container, index + 1);
            this.triggerRatingChange(container, index + 1);
          });
          
          star.addEventListener('mouseenter', () => {
            this.previewRating(container, index + 1);
          });
        });
        
        container.addEventListener('mouseleave', () => {
          const rating = parseInt(container.dataset.rating) || 0;
          this.setRating(container, rating);
        });
      }
    });
  }

  setRating(container, rating) {
    const stars = container.querySelectorAll('.rating-star');
    
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
    
    container.dataset.rating = rating;
  }

  previewRating(container, rating) {
    const stars = container.querySelectorAll('.rating-star');
    
    stars.forEach((star, index) => {
      if (index < rating) {
        star.style.transform = 'scale(1.1)';
        star.style.background = 'var(--warning-yellow)';
      } else {
        star.style.transform = 'scale(1)';
        star.style.background = 'var(--stars-white)';
      }
    });
  }

  triggerRatingChange(container, rating) {
    const event = new CustomEvent('ratingChanged', {
      detail: { rating, container }
    });
    document.dispatchEvent(event);
  }

  /* ========================================
     🎭 ANIMATIONS
     ======================================== */

  initAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.triggerScrollAnimation(entry.target);
        }
      });
    }, observerOptions);

    // Observe elements with animation classes
    const animatedElements = document.querySelectorAll(
      '.fade-in, .fade-in-up, .fade-in-down, .fade-in-left, .fade-in-right, ' +
      '.scale-in, .scale-in-bounce, .slide-in-up, .slide-in-down, .stagger-children'
    );

    animatedElements.forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  triggerScrollAnimation(element) {
    element.style.opacity = '1';
    
    if (element.classList.contains('stagger-children')) {
      const children = element.children;
      Array.from(children).forEach((child, index) => {
        child.style.animationDelay = `${(index + 1) * 0.1}s`;
      });
    }
  }

  /* ========================================
     ♿ ACCESSIBILITY
     ======================================== */

  initAccessibility() {
    // Add ARIA labels where missing
    this.addAriaLabels();
    
    // Keyboard navigation
    this.initKeyboardNavigation();
    
    // Focus management
    this.initFocusManagement();
    
    // Reduced motion support
    this.handleReducedMotion();
  }

  addAriaLabels() {
    // Progress bars
    document.querySelectorAll('.progress-bar-container').forEach(progress => {
      if (!progress.hasAttribute('aria-label')) {
        const percentage = progress.dataset.progress || 0;
        progress.setAttribute('aria-label', `Progress: ${percentage}%`);
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuenow', percentage);
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
      }
    });

    // Tab items
    document.querySelectorAll('.tab-item').forEach(tab => {
      if (!tab.hasAttribute('aria-label')) {
        const label = tab.dataset.tab || 'Tab';
        tab.setAttribute('aria-label', label);
        tab.setAttribute('role', 'tab');
        tab.setAttribute('tabindex', '0');
      }
    });

    // Cards
    document.querySelectorAll('.card[tabindex]').forEach(card => {
      if (!card.hasAttribute('aria-label')) {
        const title = card.querySelector('.card-title')?.textContent || 'Card';
        card.setAttribute('aria-label', title);
      }
    });
  }

  initKeyboardNavigation() {
    // Arrow key navigation for tabs
    document.addEventListener('keydown', (e) => {
      const activeTab = document.querySelector('.tab-item:focus');
      if (!activeTab) return;

      const tabBar = activeTab.closest('.tab-bar');
      const tabs = Array.from(tabBar.querySelectorAll('.tab-item'));
      const currentIndex = tabs.indexOf(activeTab);

      let nextIndex;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      }

      if (nextIndex !== undefined) {
        tabs[nextIndex].focus();
      }
    });
  }

  initFocusManagement() {
    // Focus visible polyfill
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Skip to main content link
    this.addSkipLink();
  }

  addSkipLink() {
    if (!document.querySelector('.skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.className = 'skip-link sr-only';
      skipLink.textContent = 'Skip to main content';
      skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--primary-accent);
        color: var(--black-text);
        padding: 8px;
        border-radius: 4px;
        text-decoration: none;
        z-index: 9999;
        transition: top 0.3s;
      `;
      
      skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
        skipLink.classList.remove('sr-only');
      });
      
      skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
        skipLink.classList.add('sr-only');
      });
      
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
  }

  handleReducedMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('theme-reduced-motion');
    }
  }

  /* ========================================
     🎮 GAME-SPECIFIC METHODS
     ======================================== */

  showCorrectAnswer(optionElement) {
    optionElement.classList.add('correct', 'answer-correct');
    
    // Play success sound (if available)
    this.playSound('correct');
    
    // Trigger celebration animation
    this.triggerCelebration();
  }

  showWrongAnswer(optionElement, correctElement) {
    optionElement.classList.add('incorrect', 'answer-wrong');
    
    if (correctElement) {
      setTimeout(() => {
        correctElement.classList.add('correct');
      }, 300);
    }
    
    // Play error sound (if available)
    this.playSound('wrong');
  }

  unlockLevel(levelCard) {
    levelCard.classList.remove('level-card-locked');
    levelCard.classList.add('level-card-active', 'level-unlock');
    
    // Play unlock sound
    this.playSound('unlock');
    
    // Add unlock animation
    setTimeout(() => {
      levelCard.classList.remove('level-unlock');
    }, 1000);
  }

  triggerCelebration() {
    // Create celebration particles
    const celebration = document.createElement('div');
    celebration.className = 'celebration-particles';
    celebration.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    
    // Add particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 6px;
        height: 6px;
        background: var(--warning-yellow);
        border-radius: 50%;
        top: 50%;
        left: 50%;
        animation: celebrate 1s ease-out forwards;
        animation-delay: ${Math.random() * 0.5}s;
      `;
      celebration.appendChild(particle);
    }
    
    document.body.appendChild(celebration);
    
    setTimeout(() => {
      celebration.remove();
    }, 1500);
  }

  playSound(type) {
    // Placeholder for sound system
    console.log(`🔊 Playing ${type} sound`);
  }

  /* ========================================
     🛠️ UTILITY METHODS
     ======================================== */

  updateProgress(selector, percentage) {
    const progressBar = document.querySelector(selector);
    if (progressBar) {
      progressBar.dataset.progress = percentage;
      const fill = progressBar.querySelector('.progress-bar-fill');
      if (fill) {
        this.animateProgress(fill, percentage);
      }
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--bg-card-gradient);
      color: var(--white);
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 9999;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  destroy() {
    // Cleanup method for removing event listeners
    console.log('🎨 AstroQuiz Design System destroyed');
  }
}

// CSS for dynamic animations
const dynamicStyles = `
  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
  
  @keyframes celebrate {
    to {
      transform: translate(${Math.random() * 400 - 200}px, ${Math.random() * 400 - 200}px) rotate(720deg);
      opacity: 0;
    }
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .keyboard-navigation *:focus {
    outline: 2px solid var(--primary-accent);
    outline-offset: 2px;
  }
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AstroQuiz = new AstroQuizComponents();
  });
} else {
  window.AstroQuiz = new AstroQuizComponents();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AstroQuizComponents;
}
