/**
 * Interactive Onboarding Tour with Tooltips
 * Chain IQ Smart Supply Chain Chatbot
 */

document.addEventListener('DOMContentLoaded', function () {
    // Reset the onboarding tour flag when the app restarts
    localStorage.removeItem('hasSeenChainIQTour');

    // Listen for the event to start the onboarding tour
    document.addEventListener('startOnboardingTour', function () {
        // Check if the user has already seen the onboarding tour
        const hasSeenTour = localStorage.getItem('hasSeenChainIQTour');

        // Skip the tour if the user has already seen it
        if (hasSeenTour) {
            return;
        }

        // Create tour overlay container
        const tourOverlay = document.createElement('div');
        tourOverlay.className = 'tour-overlay';
        document.body.appendChild(tourOverlay);

        // Create tour modal
        const tourModal = document.createElement('div');
        tourModal.className = 'tour-modal';
        tourModal.innerHTML = `
            <div class="tour-header">
                <h3>Welcome to Chain IQ Smart Supply Chain!</h3>
                <p>Let us show you around our AI-powered platform.</p>
            </div>
            <div class="tour-content">
                <p>This quick tour will help you understand how to make the most of our intelligent supply chain assistant.</p>
            </div>
            <div class="tour-actions">
                <button class="btn btn-outline-secondary" id="skipTourBtn">Skip Tour</button>
                <button class="btn btn-primary" id="startTourBtn">Start Tour</button>
            </div>
        `;
        document.body.appendChild(tourModal);

        // Define the steps of the tour
        const tourSteps = [
            {
                element: '.top-right-buttons', // Selector for the top-right buttons
                tooltip: 'These are the main navigation buttons. Use them to access key features.',
            },
            {
                element: '.chat-section', // Selector for the chat section
                tooltip: 'This is the AI Chat Assistant. Ask questions about your documents here.',
            },
            {
                element: '.upload-section', // Selector for the upload section
                tooltip: 'Upload your supply chain documents here for analysis.',
            },
            {
                element: '.data-visualization-section', // Selector for the data visualization section
                tooltip: 'View insights and visualizations of your data here.',
            },
        ];

        let currentStepIndex = 0;

        // Function to start the tour
        function startTour() {
            // Show overlay
            tourOverlay.style.display = 'block';

            // Start with the first step
            showStep(0);

            // Add event listener for next/prev buttons
            document.addEventListener('click', handleTourNavigation);
        }

        // Function to show a specific step
        function showStep(stepIndex) {
            // Remove any existing tooltip or highlight
            const existingTooltip = document.querySelector('.tour-tooltip');
            const existingHighlight = document.querySelector('.tour-highlight');
            if (existingTooltip) existingTooltip.remove();
            if (existingHighlight) existingHighlight.remove();

            // Ensure the step index is valid
            if (stepIndex < 0 || stepIndex >= tourSteps.length) {
                endTour();
                return;
            }

            // Get the current step
            const step = tourSteps[stepIndex];
            const targetElement = document.querySelector(step.element);

            if (!targetElement) {
                console.error(`Element not found for step ${stepIndex}: ${step.element}`);
                endTour();
                return;
            }

            // Highlight the target element
            const highlight = document.createElement('div');
            highlight.className = 'tour-highlight';
            const rect = targetElement.getBoundingClientRect();
            highlight.style.top = `${rect.top + window.scrollY}px`;
            highlight.style.left = `${rect.left + window.scrollX}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
            document.body.appendChild(highlight);

            // Show the tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tour-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-content">
                    <p>${step.tooltip}</p>
                </div>
                <div class="tooltip-nav">
                    <button class="btn btn-outline-secondary prev-step" data-current-step="${stepIndex}">Previous</button>
                    <button class="btn btn-primary next-step" data-current-step="${stepIndex}">Next</button>
                </div>
            `;
            document.body.appendChild(tooltip);

            // Position the tooltip
            const tooltipRect = tooltip.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
            tooltip.style.left = `${rect.left + window.scrollX - tooltipRect.width / 2 + rect.width / 2}px`;

            // Update the current step index
            currentStepIndex = stepIndex;
        }

        // Function to handle navigation
        function handleTourNavigation(event) {
            if (event.target.classList.contains('next-step')) {
                const currentStep = parseInt(event.target.dataset.currentStep, 10);
                showStep(currentStep + 1);
            } else if (event.target.classList.contains('prev-step')) {
                const currentStep = parseInt(event.target.dataset.currentStep, 10);
                showStep(currentStep - 1);
            }
        }

        // Function to end the tour
        function endTour() {
            // Remove tour elements
            const tooltipElement = document.querySelector('.tour-tooltip');
            const highlightElement = document.querySelector('.tour-highlight');

            if (tooltipElement) {
                tooltipElement.remove();
            }

            if (highlightElement) {
                highlightElement.remove();
            }

            tourOverlay.style.display = 'none';
            tourModal.style.display = 'none';

            // Store that the user has seen the tour
            localStorage.setItem('hasSeenChainIQTour', 'true');

            // Remove the event listener
            document.removeEventListener('click', handleTourNavigation);

            // Remove the elements after animation
            setTimeout(() => {
                tourOverlay.remove();
                tourModal.remove();
            }, 500);
        }

        // Handle skip tour button
        document.getElementById('skipTourBtn').addEventListener('click', function () {
            endTour();
        });

        // Handle start tour button
        document.getElementById('startTourBtn').addEventListener('click', function () {
            tourModal.style.display = 'none';
            startTour();
        });
    });
});