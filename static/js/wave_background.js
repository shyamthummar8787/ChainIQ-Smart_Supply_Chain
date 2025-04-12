/**
 * Wave Background Interactive Effects
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create a subtle parallax effect for the background on mouse move
    document.addEventListener('mousemove', function(e) {
        const moveX = (e.clientX / window.innerWidth) * 5 - 2.5;
        const moveY = (e.clientY / window.innerHeight) * 5 - 2.5;
        
        document.documentElement.style.setProperty('--mouse-x', moveX + 'px');
        document.documentElement.style.setProperty('--mouse-y', moveY + 'px');
    });
    
    // Add a gentle pulse effect to cards when hovered
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('pulse-hover');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('pulse-hover');
        });
    });
    
    // Add subtle glow to buttons on hover
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.filter = 'drop-shadow(0 0 10px rgba(100, 150, 255, 0.5))';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.filter = '';
        });
    });
    
    // Add a glint animation effect to the navbar brand
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
        navbarBrand.addEventListener('mouseenter', function() {
            this.classList.add('glint-animation');
            setTimeout(() => {
                this.classList.remove('glint-animation');
            }, 1000);
        });
    }
    
    // Apply subtle adjustment to background on scroll
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const scrollEffect = Math.min(scrollPosition / 1000, 0.2);
        
        document.documentElement.style.setProperty('--scroll-effect', scrollEffect);
    });
    
    // Enhance interactivity with wave ripple effect on click
    document.addEventListener('click', function(e) {
        // Create ripple element
        const ripple = document.createElement('div');
        ripple.classList.add('wave-ripple');
        
        // Set position
        ripple.style.left = e.clientX + 'px';
        ripple.style.top = e.clientY + 'px';
        
        // Add to body
        document.body.appendChild(ripple);
        
        // Remove after animation
        setTimeout(() => {
            ripple.remove();
        }, 1000);
    });
    
    // Initialize custom CSS variables for animations
    document.documentElement.style.setProperty('--mouse-x', '0px');
    document.documentElement.style.setProperty('--mouse-y', '0px');
    document.documentElement.style.setProperty('--scroll-effect', '0');
});