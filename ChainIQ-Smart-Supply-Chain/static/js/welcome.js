document.addEventListener('DOMContentLoaded', function() {
  // Check if user has already seen welcome page
  if (localStorage.getItem('hasSeenWelcome')) {
    return;
  }

  // Add scroll and mousemove event listeners for parallax effects
  window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    document.querySelectorAll('.welcome-section').forEach((section, index) => {
      const speed = index * 0.1;
      section.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });

  // Mouse parallax effect
  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;

    document.querySelectorAll('.feature-card').forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardX = rect.left + rect.width / 2;
      const cardY = rect.top + rect.height / 2;

      const moveX = (mouseX * 20).toFixed(2);
      const moveY = (mouseY * 20).toFixed(2);

      card.style.transform = `translate(${moveX}px, ${moveY}px) translateY(-10px)`;
    });
  });

  // Staggered animations for benefit items
  const benefitItems = document.querySelectorAll('.benefit-item');
  benefitItems.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    item.style.transition = 'all 0.5s ease';
    item.style.transitionDelay = `${index * 0.2}s`;
  });

  const benefitsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateX(0)';
      }
    });
  }, { threshold: 0.5 });

  benefitItems.forEach(item => benefitsObserver.observe(item));

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

  document.body.insertAdjacentHTML('beforeend', welcomeHtml);

  // Animate sections on scroll
  const sections = document.querySelectorAll('.welcome-section');
  const observerOptions = {
    threshold: 0.2
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-visible');
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });

  // Handle welcome page dismiss
  document.querySelector('.welcome-button').addEventListener('click', function() {
    document.querySelector('.welcome-overlay').style.animation = 'fadeOut 0.5s ease-out forwards';
    setTimeout(() => {
      document.querySelector('.welcome-overlay').remove();
      // Set localStorage flag when user clicks "Get Started"
      localStorage.setItem('hasSeenWelcome', 'true');
    }, 500);
  });
});