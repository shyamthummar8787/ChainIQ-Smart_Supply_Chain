document.addEventListener('DOMContentLoaded', function () {
  // Check if the user has already seen the welcome page in this session
  const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');

  if (hasSeenWelcome === 'true') {
    // If the flag exists and is set to true, do not show the welcome page
    return;
  }

  // HTML for the welcome page
  const welcomeHtml = `
    <div class="welcome-overlay">
      <div class="welcome-container">
        <section class="welcome-section" id="intro">
          <img src="/static/images/chainiq-logo.svg" class="welcome-logo" alt="Chain IQ Logo">
          <h1 class="welcome-title">Welcome to Chain IQ</h1>
          <p class="welcome-text">Your intelligent supply chain assistant powered by AI</p>
          <div class="scroll-indicator">
            <span>Scroll to learn more</span>
            <i class="fas fa-chevron-down"></i>
          </div>
        </section>
        <section class="welcome-section" id="get-started">
          <h2 class="section-title">Ready to Transform Your Supply Chain?</h2>
          <button class="welcome-button">Get Started</button>
        </section>
      </div>
    </div>
  `;

  // Insert the welcome page into the DOM
  document.body.insertAdjacentHTML('beforeend', welcomeHtml);

  // Animate sections on scroll
  const sections = document.querySelectorAll('.welcome-section');
  const observerOptions = {
    threshold: 0.2,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-visible');
      }
    });
  }, observerOptions);

  sections.forEach((section) => {
    observer.observe(section);
  });

  // Handle welcome page dismiss
  document.querySelector('.welcome-button').addEventListener('click', function () {
    document.querySelector('.welcome-overlay').style.animation = 'fadeOut 0.5s ease-out forwards';
    setTimeout(() => {
      document.querySelector('.welcome-overlay').remove();
      // Set the sessionStorage flag to indicate the welcome page has been seen
      sessionStorage.setItem('hasSeenWelcome', 'true');

      // Trigger the onboarding tour after the welcome page
      const event = new Event('startOnboardingTour');
      document.dispatchEvent(event);
    }, 500);
  });
});