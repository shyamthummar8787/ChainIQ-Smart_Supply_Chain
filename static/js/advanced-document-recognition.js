/**
 * Advanced Document Recognition Animation Script
 * Provides enhanced animations and visual feedback during document processing
 */

document.addEventListener('DOMContentLoaded', function() {
    // Complement the existing document-recognition.js, don't replace it
    // This file adds more advanced animations and interactions
    
    // Helper function to create floating particles for the document analysis effect
    function createAnalysisParticles(container) {
        // Create particles container if it doesn't exist
        let particlesContainer = container.querySelector('.analysis-particles');
        if (!particlesContainer) {
            particlesContainer = document.createElement('div');
            particlesContainer.className = 'analysis-particles';
            container.appendChild(particlesContainer);
        }
        
        // Create particles
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                
                // Random position at the bottom of the container
                const randomX = Math.floor(Math.random() * 100);
                particle.style.left = `${randomX}%`;
                particle.style.bottom = '0';
                
                // Random x movement
                const randomXMove = (Math.random() * 100) - 50;
                particle.style.setProperty('--x-move', `${randomXMove}px`);
                
                // Random size
                const randomSize = Math.floor(Math.random() * 4) + 2;
                particle.style.width = `${randomSize}px`;
                particle.style.height = `${randomSize}px`;
                
                // Random opacity
                const randomOpacity = Math.random() * 0.7 + 0.3;
                particle.style.opacity = randomOpacity;
                
                // Random animation duration
                const randomDuration = Math.random() * 2 + 2;
                particle.style.animationDuration = `${randomDuration}s`;
                
                // Add to container
                particlesContainer.appendChild(particle);
                
                // Remove after animation completes
                setTimeout(() => {
                    particle.remove();
                }, randomDuration * 1000);
            }, i * 100); // Stagger particle creation
        }
    }
    
    // Function to create text extraction animations
    function simulateTextExtraction(previewContainer) {
        const extractionCount = 6; // Number of "text blocks" to extract
        const areas = [
            { top: '10%', left: '10%', width: '80%', height: '5%' },
            { top: '20%', left: '15%', width: '60%', height: '5%' },
            { top: '30%', left: '10%', width: '40%', height: '5%' },
            { top: '40%', left: '20%', width: '70%', height: '5%' },
            { top: '50%', left: '15%', width: '65%', height: '5%' },
            { top: '60%', left: '10%', width: '75%', height: '5%' },
            { top: '70%', left: '20%', width: '60%', height: '5%' },
            { top: '80%', left: '15%', width: '70%', height: '5%' }
        ];
        
        // Randomly select areas to "extract"
        const selectedAreas = [];
        while (selectedAreas.length < extractionCount) {
            const randomIndex = Math.floor(Math.random() * areas.length);
            if (!selectedAreas.includes(randomIndex)) {
                selectedAreas.push(randomIndex);
            }
        }
        
        // Create and animate text extraction areas
        selectedAreas.forEach((areaIndex, index) => {
            setTimeout(() => {
                const extractionArea = document.createElement('div');
                extractionArea.className = 'text-extraction';
                
                // Apply area positioning
                extractionArea.style.top = areas[areaIndex].top;
                extractionArea.style.left = areas[areaIndex].left;
                extractionArea.style.width = areas[areaIndex].width;
                extractionArea.style.height = areas[areaIndex].height;
                
                // Add to preview container
                previewContainer.appendChild(extractionArea);
                
                // Add animation
                extractionArea.style.animation = `extract-text 2s forwards`;
                
                // Remove after animation
                setTimeout(() => {
                    extractionArea.remove();
                }, 2000);
            }, index * 400); // Stagger the extractions
        });
    }
    
    // Function to add confidence meter to badge
    function addConfidenceMeter(badge, confidence) {
        // Create confidence meter elements
        const meterContainer = document.createElement('div');
        meterContainer.className = 'confidence-meter';
        
        const meterLevel = document.createElement('div');
        meterLevel.className = 'confidence-level';
        
        meterContainer.appendChild(meterLevel);
        
        // Add confidence class based on level
        if (confidence >= 80) {
            meterContainer.classList.add('high-confidence');
        } else if (confidence >= 50) {
            meterContainer.classList.add('medium-confidence');
        } else {
            meterContainer.classList.add('low-confidence');
        }
        
        // Add confidence text
        const confidenceText = document.createElement('small');
        confidenceText.className = 'mt-1 d-block';
        confidenceText.innerHTML = `Confidence: <strong>${confidence}%</strong>`;
        
        // Add to badge parent
        badge.parentNode.appendChild(meterContainer);
        badge.parentNode.appendChild(confidenceText);
    }
    
    // Enhanced progress status animation
    function animateStatusChange(statusElement, newText) {
        // Add animation class
        statusElement.classList.add('status-changing');
        
        // Change text after fade out
        setTimeout(() => {
            statusElement.textContent = newText;
        }, 400);
        
        // Remove animation class after completion
        setTimeout(() => {
            statusElement.classList.remove('status-changing');
        }, 800);
    }
    
    // Observer to enhance document recognition when it's added to the DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                // Check for added document recognition container
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.id === 'recognitionContainer') {
                        enhanceDocumentRecognition(node);
                    }
                    
                    // Check for added processing overlay
                    if (node.nodeType === 1 && node.id === 'processingOverlay') {
                        enhanceProcessingOverlay(node);
                    }
                });
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Function to enhance document recognition with additional animations
    function enhanceDocumentRecognition(container) {
        // Add particle effects to the document preview
        const previewContainer = container.querySelector('.document-preview');
        if (previewContainer) {
            // Create floating particles
            createAnalysisParticles(previewContainer);
            
            // Simulate text extraction animations
            simulateTextExtraction(previewContainer);
        }
        
        // Add confidence meter to badge
        const badge = container.querySelector('.recognition-badge');
        if (badge) {
            // Generate random confidence level (in a real app, this would come from the AI)
            const confidence = Math.floor(Math.random() * 30) + 70; // 70-99%
            addConfidenceMeter(badge, confidence);
        }
        
        // Enhanced delay for recognition details
        const details = container.querySelectorAll('.recognition-detail');
        details.forEach((detail, index) => {
            detail.style.setProperty('--index', index);
        });
    }
    
    // Function to enhance processing overlay with advanced animations
    function enhanceProcessingOverlay(overlay) {
        const progressBar = overlay.querySelector('.progress-bar');
        const statusText = overlay.querySelector('.processing-status');
        
        // Override the default progress interval with enhanced animations
        if (progressBar && statusText) {
            // Store original event handlers
            const originalProgressInterval = window.progressInterval;
            if (originalProgressInterval) {
                clearInterval(originalProgressInterval);
            }
            
            // Enhanced progress steps with more detailed text
            const enhancedSteps = [
                { progress: 15, message: "Initializing document analysis..." },
                { progress: 25, message: "Extracting text content..." },
                { progress: 35, message: "Preprocessing document structure..." },
                { progress: 45, message: "Detecting patterns and formats..." },
                { progress: 55, message: "Running NLP classification algorithms..." },
                { progress: 65, message: "Identifying document type..." },
                { progress: 75, message: "Extracting key entities and metadata..." },
                { progress: 85, message: "Calculating confidence scores..." },
                { progress: 95, message: "Finalizing analysis..." }
            ];
            
            let currentStep = 0;
            const newProgressInterval = setInterval(() => {
                if (currentStep < enhancedSteps.length) {
                    progressBar.style.width = `${enhancedSteps[currentStep].progress}%`;
                    animateStatusChange(statusText, enhancedSteps[currentStep].message);
                    currentStep++;
                } else {
                    clearInterval(newProgressInterval);
                    setTimeout(() => {
                        progressBar.style.width = "100%";
                        animateStatusChange(statusText, "Analysis complete!");
                    }, 500);
                }
            }, 800);
            
            // Store new interval for potential cancellation
            window.progressInterval = newProgressInterval;
        }
    }
});