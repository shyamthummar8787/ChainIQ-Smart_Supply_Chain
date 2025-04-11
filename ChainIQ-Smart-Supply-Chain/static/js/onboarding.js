/**
 * Interactive Onboarding Tour with Tooltips
 * Chain IQ Smart Supply Chain Chatbot
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if this is the user's first visit
    const hasSeenTour = localStorage.getItem('hasSeenChainIQTour');
    
    // Skip the tour if user has already seen it
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
            <div class="tour-feature">
                <i class="fas fa-upload text-primary"></i>
                <div>
                    <h5>Document Upload & Analysis</h5>
                    <p>Upload supply chain documents for AI-powered analysis</p>
                </div>
            </div>
            <div class="tour-feature">
                <i class="fas fa-comments text-primary"></i>
                <div>
                    <h5>AI Chat Assistant</h5>
                    <p>Ask questions about your documents and get intelligent answers</p>
                </div>
            </div>
            <div class="tour-feature">
                <i class="fas fa-lightbulb text-primary"></i>
                <div>
                    <h5>Smart Suggestions</h5>
                    <p>Get document-specific recommendations and insights</p>
                </div>
            </div>
        </div>
        <div class="tour-actions">
            <button class="btn btn-outline-secondary" id="skipTourBtn">Skip Tour</button>
            <button class="btn btn-primary" id="startTourBtn">Start Tour</button>
        </div>
    `;
    document.body.appendChild(tourModal);
    
    // Tour steps configuration
    const tourSteps = [
        {
            target: '.navbar-brand',
            title: 'Chain IQ Smart Supply Chain',
            content: 'Your intelligent supply chain assistant powered by AI. Click the logo to return to the home page at any time.',
            placement: 'bottom'
        },
        {
            target: 'a[href="/upload"]',
            title: 'Upload Supply Chain Data',
            content: 'Upload your supply chain documents such as invoices, purchase orders, and shipping documents. Our AI will automatically analyze them.',
            placement: 'bottom'
        },
        {
            target: '.container',
            title: 'AI Chat Interface',
            content: 'Interact with the AI assistant to ask questions about your supply chain documents and get intelligent insights.',
            placement: 'top'
        },
        {
            target: '#suggestionContainer',
            title: 'Smart Suggestions',
            content: 'After uploading a document, the AI will offer document-specific suggestions to help you get more value from your data.',
            placement: 'right'
        },
        {
            target: '#servicesContainer',
            title: 'Supply Chain Services',
            content: 'Discover relevant supply chain services related to your documents, such as invoice processing or shipment tracking.',
            placement: 'left'
        }
    ];
    
    let currentStepIndex = 0;
    let tooltipElement = null;
    let highlightElement = null;
    
    // Handle skip tour button
    document.getElementById('skipTourBtn').addEventListener('click', function() {
        endTour();
    });
    
    // Handle start tour button
    document.getElementById('startTourBtn').addEventListener('click', function() {
        tourModal.style.display = 'none';
        startTour();
    });
    
    // Function to start the tour
    function startTour() {
        // Show overlay
        tourOverlay.style.display = 'block';
        
        // Start with the first step
        showStep(0);
        
        // Add event listener for next/prev buttons
        document.addEventListener('click', handleTourNavigation);
    }
    
    // Function to show a specific tour step
    function showStep(index) {
        // Clear any existing tooltip
        if (tooltipElement) {
            tooltipElement.remove();
            tooltipElement = null;
        }
        
        // Clear existing highlight
        if (highlightElement) {
            highlightElement.remove();
            highlightElement = null;
        }
        
        // Update current step index
        currentStepIndex = index;
        
        // Get the current step
        const step = tourSteps[index];
        
        // Find the target element
        const targetElement = document.querySelector(step.target);
        
        if (!targetElement) {
            // Skip this step if target element doesn't exist
            if (currentStepIndex < tourSteps.length - 1) {
                showStep(currentStepIndex + 1);
            } else {
                endTour();
            }
            return;
        }
        
        // Create highlight effect around the target
        createHighlight(targetElement);
        
        // Create and show tooltip
        createTooltip(targetElement, step);
        
        // Scroll target into view if needed
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
    
    // Function to create highlight around target element
    function createHighlight(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        
        highlightElement = document.createElement('div');
        highlightElement.className = 'tour-highlight';
        highlightElement.style.top = `${rect.top + window.scrollY}px`;
        highlightElement.style.left = `${rect.left + window.scrollX}px`;
        highlightElement.style.width = `${rect.width}px`;
        highlightElement.style.height = `${rect.height}px`;
        
        document.body.appendChild(highlightElement);
    }
    
    // Function to create tooltip
    function createTooltip(targetElement, step) {
        const rect = targetElement.getBoundingClientRect();
        
        tooltipElement = document.createElement('div');
        tooltipElement.className = `tour-tooltip tour-tooltip-${step.placement}`;
        
        let tooltipTop, tooltipLeft;
        
        // Position the tooltip based on placement
        switch(step.placement) {
            case 'top':
                tooltipTop = rect.top + window.scrollY - 10;
                tooltipLeft = rect.left + window.scrollX + (rect.width / 2);
                break;
            case 'bottom':
                tooltipTop = rect.bottom + window.scrollY + 10;
                tooltipLeft = rect.left + window.scrollX + (rect.width / 2);
                break;
            case 'left':
                tooltipTop = rect.top + window.scrollY + (rect.height / 2);
                tooltipLeft = rect.left + window.scrollX - 10;
                break;
            case 'right':
                tooltipTop = rect.top + window.scrollY + (rect.height / 2);
                tooltipLeft = rect.right + window.scrollX + 10;
                break;
            default:
                tooltipTop = rect.bottom + window.scrollY + 10;
                tooltipLeft = rect.left + window.scrollX + (rect.width / 2);
        }
        
        // Content for the tooltip
        tooltipElement.innerHTML = `
            <div class="tooltip-content">
                <h5>${step.title}</h5>
                <p>${step.content}</p>
                <div class="tooltip-nav">
                    <span class="tooltip-counter">${currentStepIndex + 1} of ${tourSteps.length}</span>
                    <div class="tooltip-buttons">
                        ${currentStepIndex > 0 ? '<button class="btn btn-sm btn-outline-secondary tour-prev">Previous</button>' : ''}
                        ${currentStepIndex < tourSteps.length - 1 ? 
                            '<button class="btn btn-sm btn-primary tour-next">Next</button>' : 
                            '<button class="btn btn-sm btn-success tour-end">Finish Tour</button>'}
                    </div>
                </div>
            </div>
        `;
        
        // Position the tooltip
        tooltipElement.style.position = 'absolute';
        tooltipElement.style.zIndex = '10001';
        
        // Adjust position based on placement
        if (step.placement === 'bottom' || step.placement === 'top') {
            tooltipElement.style.left = `${tooltipLeft}px`;
            tooltipElement.style.transform = 'translateX(-50%)';
            
            if (step.placement === 'bottom') {
                tooltipElement.style.top = `${tooltipTop}px`;
            } else {
                tooltipElement.style.top = 'auto';
                tooltipElement.style.bottom = `${window.innerHeight - tooltipTop}px`;
            }
        } else {
            tooltipElement.style.top = `${tooltipTop}px`;
            tooltipElement.style.transform = 'translateY(-50%)';
            
            if (step.placement === 'right') {
                tooltipElement.style.left = `${tooltipLeft}px`;
            } else {
                tooltipElement.style.left = 'auto';
                tooltipElement.style.right = `${window.innerWidth - tooltipLeft}px`;
            }
        }
        
        document.body.appendChild(tooltipElement);
        
        // Add event listeners to navigation buttons
        const prevBtn = tooltipElement.querySelector('.tour-prev');
        const nextBtn = tooltipElement.querySelector('.tour-next');
        const endBtn = tooltipElement.querySelector('.tour-end');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                showStep(currentStepIndex - 1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                showStep(currentStepIndex + 1);
            });
        }
        
        if (endBtn) {
            endBtn.addEventListener('click', function() {
                endTour();
            });
        }
    }
    
    // Handle clicks for tour navigation (to prevent clicks on the page during tour)
    function handleTourNavigation(event) {
        // Only allow clicks on tour elements
        if (!event.target.closest('.tour-tooltip') && 
            !event.target.closest('.tour-modal') &&
            event.target !== tourOverlay) {
            event.preventDefault();
            event.stopPropagation();
            
            // Check if click is outside the current highlighted element
            if (highlightElement) {
                const highlightRect = highlightElement.getBoundingClientRect();
                if (event.clientX < highlightRect.left || 
                    event.clientX > highlightRect.right || 
                    event.clientY < highlightRect.top || 
                    event.clientY > highlightRect.bottom) {
                    // User clicked outside the highlighted element, do nothing
                    return;
                }
                
                // If user clicked on the highlighted element, go to next step
                if (currentStepIndex < tourSteps.length - 1) {
                    showStep(currentStepIndex + 1);
                } else {
                    endTour();
                }
            }
        }
    }
    
    // Function to end the tour
    function endTour() {
        // Remove tour elements
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
});