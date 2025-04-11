document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const fileInput = document.getElementById('file');
    const docTypeSelect = document.getElementById('doc_type');
    const uploadForm = document.querySelector('form');
    const cardBody = document.querySelector('.card-body');
    const submitBtn = document.querySelector('button[type="submit"]');
    
    // Document type icons mapping
    const docTypeIcons = {
        'invoice': 'fas fa-file-invoice-dollar',
        'purchase_order': 'fas fa-shopping-cart',
        'shipping_document': 'fas fa-shipping-fast',
        'inventory': 'fas fa-boxes',
        'supplier': 'fas fa-building',
        'product': 'fas fa-box',
        'general': 'fas fa-file-alt'
    };
    
    // Document recognition details based on type
    const recognitionDetails = {
        'invoice': [
            { icon: 'fas fa-money-bill-wave', text: 'Payment information detected' },
            { icon: 'fas fa-calendar-alt', text: 'Due date analysis' },
            { icon: 'fas fa-list', text: 'Line items extraction' },
            { icon: 'fas fa-building', text: 'Supplier details' }
        ],
        'purchase_order': [
            { icon: 'fas fa-shopping-cart', text: 'Order items detected' },
            { icon: 'fas fa-truck', text: 'Shipping details' },
            { icon: 'fas fa-calendar-day', text: 'Delivery schedule' },
            { icon: 'fas fa-tags', text: 'Product codes identified' }
        ],
        'shipping_document': [
            { icon: 'fas fa-map-marker-alt', text: 'Origin & destination' },
            { icon: 'fas fa-truck-loading', text: 'Cargo details' },
            { icon: 'fas fa-calendar-day', text: 'Shipping dates' },
            { icon: 'fas fa-barcode', text: 'Tracking numbers' }
        ],
        'inventory': [
            { icon: 'fas fa-boxes', text: 'Stock quantities' },
            { icon: 'fas fa-warehouse', text: 'Storage locations' },
            { icon: 'fas fa-tags', text: 'SKU information' },
            { icon: 'fas fa-history', text: 'Stock movement' }
        ],
        'supplier': [
            { icon: 'fas fa-id-card', text: 'Contact information' },
            { icon: 'fas fa-handshake', text: 'Contract details' },
            { icon: 'fas fa-truck', text: 'Shipping capabilities' },
            { icon: 'fas fa-box', text: 'Product catalog' }
        ],
        'product': [
            { icon: 'fas fa-tag', text: 'Product details' },
            { icon: 'fas fa-info-circle', text: 'Specifications' },
            { icon: 'fas fa-dollar-sign', text: 'Pricing information' },
            { icon: 'fas fa-cubes', text: 'Inventory levels' }
        ],
        'general': [
            { icon: 'fas fa-search', text: 'Content extraction' },
            { icon: 'fas fa-list', text: 'Structure analysis' },
            { icon: 'fas fa-tags', text: 'Entity recognition' },
            { icon: 'fas fa-sitemap', text: 'Document classification' }
        ]
    };
    
    // Create the recognition animation container with enhanced visuals
    function createRecognitionContainer(file, docType, isAutoDetected = false) {
        const fileName = file.name;
        const fileExt = fileName.split('.').pop().toLowerCase();
        const typeClass = `${docType}-recognition`;
        const iconClass = docTypeIcons[docType] || 'fas fa-file-alt';
        
        // Format document type label nicely
        const docTypeLabel = docType.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        // Generate random confidence level (in a real app, this would be from the AI model)
        const confidence = Math.floor(Math.random() * 20) + 80; // 80-99%
        
        // Confidence level styling class
        let confidenceLevelClass = 'high-confidence';
        if (confidence < 85) {
            confidenceLevelClass = 'medium-confidence';
        } else if (confidence < 70) {
            confidenceLevelClass = 'low-confidence';
        }
        
        // Add auto-detection badge when applicable
        const autoDetectionBadge = isAutoDetected ? 
            `<span class="auto-detected-badge">
                <i class="fas fa-robot me-1"></i>Auto-detected
            </span>` : '';
        
        const recognitionHTML = `
            <div class="document-recognition-container ${typeClass}" id="recognitionContainer">
                <div class="document-preview">
                    <div class="scanner-line"></div>
                    <i class="${iconClass} document-icon document-pulse"></i>
                    <div class="analysis-particles"></div>
                </div>
                <div class="recognition-result">
                    <div class="recognition-badge">
                        <i class="fas fa-check-circle me-2"></i>
                        ${docTypeLabel} Detected
                        ${autoDetectionBadge}
                    </div>
                    
                    <!-- Confidence meter -->
                    <div class="confidence-meter ${confidenceLevelClass} mt-2">
                        <div class="confidence-level"></div>
                    </div>
                    <small class="mt-1 d-block">Confidence: <strong>${confidence}%</strong></small>
                    
                    <p class="recognition-message mt-3">
                        AI has analyzed your document and identified key information
                        ${isAutoDetected ? '<br><small class="text-info">Document type was automatically detected</small>' : ''}
                    </p>
                    
                    <div class="recognition-details">
                        ${recognitionDetails[docType].map((detail, index) => 
                            `<div class="recognition-detail" style="--index: ${index};">
                                <i class="${detail.icon}"></i>
                                ${detail.text}
                            </div>`
                        ).join('')}
                    </div>
                    
                    <div class="recognition-actions mt-4">
                        <button type="button" id="proceedBtn" class="btn btn-lg btn-primary delay-5">
                            <i class="fas fa-check me-2"></i>Proceed
                        </button>
                        <button type="button" id="cancelRecognitionBtn" class="btn btn-lg btn-outline-secondary ms-2 delay-5">
                            <i class="fas fa-times me-2"></i>Cancel
                        </button>
                        ${isAutoDetected ? 
                            `<button type="button" id="changeTypeBtn" class="btn btn-lg btn-outline-info ms-2 delay-5">
                                <i class="fas fa-edit me-2"></i>Change Type
                            </button>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        return recognitionHTML;
    }
    
    // Function to simulate document processing and auto-detection
    function simulateDocumentProcessing(file, callback) {
        // Create a processing overlay with enhanced animation elements
        const processingHTML = `
            <div class="document-processing-overlay" id="processingOverlay">
                <div class="processing-content">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h4>Processing Document</h4>
                    <div class="progress my-3" style="height: 10px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 0%"></div>
                    </div>
                    <p class="processing-status">Analyzing document content...</p>
                    <div class="processing-icons mt-3">
                        <i class="fas fa-file-alt processing-icon text-muted me-2"></i>
                        <i class="fas fa-arrow-right text-muted mx-2"></i>
                        <i class="fas fa-cog fa-spin text-primary mx-2"></i>
                        <i class="fas fa-arrow-right text-muted mx-2"></i>
                        <i class="fas fa-check-circle text-success ms-2 fade-in-later"></i>
                    </div>
                </div>
            </div>
        `;
        
        // Insert the processing overlay
        const cardBody = document.querySelector('.card-body');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processingHTML;
        const processingOverlay = tempDiv.firstElementChild;
        cardBody.appendChild(processingOverlay);
        
        // Get progress elements
        const progressBar = processingOverlay.querySelector('.progress-bar');
        const statusText = processingOverlay.querySelector('.processing-status');
        
        // Initialize file reader for content preview
        const reader = new FileReader();
        
        // Simulate progress steps
        const steps = [
            { progress: 20, message: "Extracting text content..." },
            { progress: 40, message: "Analyzing document structure..." },
            { progress: 60, message: "Identifying document type..." },
            { progress: 80, message: "Extracting key information..." },
            { progress: 95, message: "Finalizing analysis..." }
        ];
        
        let currentStep = 0;
        const progressInterval = setInterval(() => {
            if (currentStep < steps.length) {
                progressBar.style.width = `${steps[currentStep].progress}%`;
                statusText.textContent = steps[currentStep].message;
                currentStep++;
            } else {
                clearInterval(progressInterval);
                setTimeout(() => {
                    progressBar.style.width = "100%";
                    statusText.textContent = "Analysis complete!";
                    
                    // Detect document type based on file name (simple heuristic for demo)
                    const fileName = file.name.toLowerCase();
                    let detectedType = 'general';
                    let isAutoDetected = true;
                    
                    if (fileName.includes('invoice') || fileName.includes('bill')) {
                        detectedType = 'invoice';
                    } else if (fileName.includes('po') || fileName.includes('purchase') || fileName.includes('order')) {
                        detectedType = 'purchase_order';
                    } else if (fileName.includes('ship') || fileName.includes('delivery') || fileName.includes('transport')) {
                        detectedType = 'shipping_document';
                    } else if (fileName.includes('inventory') || fileName.includes('stock')) {
                        detectedType = 'inventory';
                    } else if (fileName.includes('supplier') || fileName.includes('vendor')) {
                        detectedType = 'supplier';
                    } else if (fileName.includes('product') || fileName.includes('catalog')) {
                        detectedType = 'product';
                    } else {
                        isAutoDetected = false;
                    }
                    
                    // Remove processing overlay
                    setTimeout(() => {
                        processingOverlay.remove();
                        callback(detectedType, isAutoDetected);
                    }, 500);
                }, 500);
            }
        }, 800);
    }
    
    // File input change handler
    fileInput.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            // Try to detect document type from file name
            let detectedType = 'general';
            const fileName = file.name.toLowerCase();
            
            if (fileName.includes('invoice') || fileName.includes('bill')) {
                detectedType = 'invoice';
                docTypeSelect.value = 'invoice';
            } else if (fileName.includes('po') || fileName.includes('purchase') || fileName.includes('order')) {
                detectedType = 'purchase_order';
                docTypeSelect.value = 'purchase_order';
            } else if (fileName.includes('ship') || fileName.includes('delivery') || fileName.includes('transport')) {
                detectedType = 'shipping_document';
                docTypeSelect.value = 'shipping_document';
            } else if (fileName.includes('inventory') || fileName.includes('stock')) {
                detectedType = 'inventory';
                docTypeSelect.value = 'inventory';
            } else if (fileName.includes('supplier') || fileName.includes('vendor')) {
                detectedType = 'supplier';
                docTypeSelect.value = 'supplier';
            } else if (fileName.includes('product') || fileName.includes('catalog')) {
                detectedType = 'product';
                docTypeSelect.value = 'product';
            }
            
            // Update the select dropdown with animation
            docTypeSelect.classList.add('bounce-animation');
            setTimeout(() => {
                docTypeSelect.classList.remove('bounce-animation');
            }, 1000);
        }
    });
    
    // Form submit handler to show animation
    uploadForm.addEventListener('submit', function(e) {
        const file = fileInput.files[0];
        const userSelectedDocType = docTypeSelect.value;
        
        if (file) {
            e.preventDefault(); // Prevent default form submission
            
            // Disable form inputs during processing
            fileInput.disabled = true;
            docTypeSelect.disabled = true;
            submitBtn.disabled = true;
            
            // First simulate document processing and auto-detection
            simulateDocumentProcessing(file, (detectedType, isAutoDetected) => {
                // If we detect a document type and it's different from user selection, show the auto-detected type
                const finalDocType = isAutoDetected ? detectedType : userSelectedDocType;
                
                // Update the form's doc_type value if using auto-detection
                if (isAutoDetected) {
                    docTypeSelect.value = finalDocType;
                }
                
                // Create and show the recognition animation with auto-detection badge if applicable
                const recognitionHTML = createRecognitionContainer(file, finalDocType, isAutoDetected);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = recognitionHTML;
                const recognitionContainer = tempDiv.firstElementChild;
                
                // Insert before the form
                cardBody.insertBefore(recognitionContainer, uploadForm);
                
                // Hide the form
                uploadForm.style.display = 'none';
                
                // Add event listeners to buttons
                const proceedBtn = document.getElementById('proceedBtn');
                const cancelBtn = document.getElementById('cancelRecognitionBtn');
                const changeTypeBtn = document.getElementById('changeTypeBtn');
                
                proceedBtn.addEventListener('click', function() {
                    // Submit the form after animation
                    uploadForm.style.display = '';
                    recognitionContainer.remove();
                    uploadForm.submit();
                });
                
                cancelBtn.addEventListener('click', function() {
                    // Show the form again and remove the animation
                    uploadForm.style.display = '';
                    recognitionContainer.remove();
                    
                    // Re-enable form inputs
                    fileInput.disabled = false;
                    docTypeSelect.disabled = false;
                    submitBtn.disabled = false;
                });
                
                // Add change type button functionality if it exists
                if (changeTypeBtn) {
                    changeTypeBtn.addEventListener('click', function() {
                        // Show the form again but keep the file selected
                        uploadForm.style.display = '';
                        recognitionContainer.remove();
                        
                        // Re-enable inputs but highlight the dropdown for changing
                        fileInput.disabled = false;
                        docTypeSelect.disabled = false;
                        submitBtn.disabled = false;
                        
                        // Reset to user's original selection and highlight with animation
                        docTypeSelect.value = userSelectedDocType;
                        docTypeSelect.focus();
                        docTypeSelect.classList.add('highlight-animation');
                        setTimeout(() => {
                            docTypeSelect.classList.remove('highlight-animation');
                        }, 2000);
                    });
                }
                
                // Auto-proceed after 5 seconds if user doesn't interact
                setTimeout(() => {
                    if (document.getElementById('recognitionContainer')) {
                        proceedBtn.click();
                    }
                }, 5000);
            });
        }
    });
});