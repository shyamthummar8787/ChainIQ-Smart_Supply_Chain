document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatBtn = document.getElementById('newChatBtn');
    const suggestionChips = document.querySelectorAll('.chip');
    const docNotification = document.getElementById('doc-notification');
    const docNotificationText = document.getElementById('doc-notification-text');
    
    // Document Suggestions Elements
    const docSuggestionsContainer = document.getElementById('doc-suggestions-container');
    const docSuggestionsTitle = document.getElementById('doc-suggestions-title');
    const docSuggestionsMessage = document.getElementById('doc-suggestions-message');
    const docSuggestionsList = document.getElementById('doc-suggestions-list');
    
    // Supply Chain Services Elements
    const servicesContainer = document.getElementById('services-container');
    const servicesTitle = document.getElementById('services-title');
    const servicesMessage = document.getElementById('services-message');
    const servicesList = document.getElementById('services-list');
    
    // Document Insights Modal Elements
    const insightsModal = document.getElementById('documentInsightsModal');
    const insightsContent = document.getElementById('documentInsightsContent');
    const askAboutInsightsBtn = document.getElementById('askAboutInsights');
    let documentInsightsModalObj = null;
    
    // Initialize Bootstrap modal without jQuery dependencies
    if (insightsModal) {
        try {
            // Create a fresh modal object each time
            documentInsightsModalObj = new bootstrap.Modal(insightsModal, {
                keyboard: true,  // Allow Escape key to close the modal
                focus: true      // Focus on the modal when opened
            });
            
            // Set up data-bs-dismiss attributes to ensure proper modal closing
            const closeButtons = insightsModal.querySelectorAll('[data-bs-dismiss="modal"]');
            closeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    documentInsightsModalObj.hide();
                });
            });
            
            // Add event listener for the "Ask About This" button
            if (askAboutInsightsBtn) {
                askAboutInsightsBtn.addEventListener('click', function() {
                    userInput.value = "Tell me more about the document insights you just showed me";
                    documentInsightsModalObj.hide();
                    setTimeout(sendMessage, 300); // Small delay to ensure modal is closed first
                });
            }
            
            // Listen for modal hidden event to perform cleanup
            insightsModal.addEventListener('hidden.bs.modal', function() {
                console.log('Modal hidden event triggered');
            });
        } catch (e) {
            console.error("Error initializing modal:", e);
        }
    }
    
    // Chat state
    let sessionId = null;
    let waitingForResponse = false;
    
    // Check for uploaded document notification
    const urlParams = new URLSearchParams(window.location.search);
    const fromUpload = urlParams.get('from_upload');
    const docType = urlParams.get('doc_type');
    const docId = urlParams.get('doc_id');
    const sharedChart = urlParams.get('shared_chart');
    
    // Check if there's a shared chart from the visualization page
    if (sharedChart === 'true') {
        // Get the shared chart image from localStorage
        const chartImage = localStorage.getItem('sharedChartImage');
        const dataSource = localStorage.getItem('sharedChartDataSource');
        const chartType = localStorage.getItem('sharedChartType');
        
        if (chartImage) {
            // Add a message from the system about the shared chart
            const message = `Here's the ${formatChartTypeName(chartType)} visualization of ${formatDataSourceName(dataSource)} that was shared from the Data Visualization page.`;
            addMessage(message, false);
            
            // Add the image to the chat
            const chartMsg = document.createElement('div');
            chartMsg.className = 'message-content mt-2';
            
            const chartImg = document.createElement('img');
            chartImg.src = chartImage;
            chartImg.className = 'img-fluid rounded';
            chartImg.style.maxHeight = '300px';
            chartImg.alt = 'Supply Chain Analytics Chart';
            
            chartMsg.appendChild(chartImg);
            
            const messagesContainer = document.querySelector('.messages');
            const lastMessage = messagesContainer.lastElementChild;
            
            if (lastMessage) {
                lastMessage.querySelector('.message-bubble').appendChild(chartMsg);
            }
            
            // Scroll to the bottom to show the image
            scrollToBottom();
            
            // Clear the localStorage items
            localStorage.removeItem('sharedChartImage');
            localStorage.removeItem('sharedChartDataSource');
            localStorage.removeItem('sharedChartType');
        }
    }
    
    // Display document history if any documents are available
    getDocumentHistory();
    
    // Show document notification if coming from upload
    if (fromUpload || docId) {
        // Check for document-specific suggestions from the AI
        fetchDocumentSuggestions();
        
        // Legacy notification as fallback
        docNotification.style.display = 'block';
        
        if (docType) {
            docNotificationText.textContent = `Great! Your ${docType} has been uploaded successfully. Ask me questions about it!`;
            
            // Add document-specific suggestion chip
            const suggestionsDiv = document.querySelector('.suggestion-chips');
            const newChip = document.createElement('button');
            newChip.className = 'chip btn btn-sm btn-primary';
            
            switch(docType) {
                case 'invoice':
                    newChip.setAttribute('data-message', 'What information is in the invoice I just uploaded?');
                    newChip.textContent = 'Check Invoice';
                    break;
                case 'purchase_order':
                    newChip.setAttribute('data-message', 'What items are in the purchase order I just uploaded?');
                    newChip.textContent = 'Check PO Items';
                    break;
                default:
                    newChip.setAttribute('data-message', 'What information is in the document I just uploaded?');
                    newChip.textContent = 'Check Document';
            }
            
            // Add click handler to the new chip
            newChip.addEventListener('click', function() {
                const message = this.getAttribute('data-message');
                userInput.value = message;
                sendMessage();
            });
            
            // Add chip to suggestions
            suggestionsDiv.insertBefore(newChip, suggestionsDiv.firstChild);
        } else {
            docNotificationText.textContent = 'Great! Your document has been uploaded successfully. Ask me questions about it!';
        }
    }
    
    // Function to fetch document suggestions from the AI
    function fetchDocumentSuggestions() {
        fetch('/api/document-suggestions')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Check if we need to handle a no-documents case
                if (data.redirect_to_upload) {
                    // Add a message to the chat about uploading a document
                    addMessage("You need to upload a document first before you can get document insights. I can help you with that!", false);
                    // Redirect to the upload page after a short delay
                    setTimeout(() => {
                        window.location.href = '/upload';
                    }, 3000);
                    return;
                }
                
                if (data.has_suggestions && docSuggestionsContainer) {
                    // Set the title and message
                    if (docSuggestionsTitle) {
                        let title = 'Document Analysis';
                        if (data.document && data.document.type) {
                            title = `${data.document.type.charAt(0).toUpperCase() + data.document.type.slice(1)} Analysis`;
                        }
                        docSuggestionsTitle.textContent = title;
                    }
                    
                    if (docSuggestionsMessage) {
                        docSuggestionsMessage.textContent = data.message || 'I\'ve analyzed your document. Would you like to:';
                    }
                    
                    // Clear existing suggestions
                    if (docSuggestionsList) {
                        docSuggestionsList.innerHTML = '';
                        
                        // Add the suggestions as buttons
                        if (data.suggestions && data.suggestions.length > 0) {
                            data.suggestions.forEach(suggestion => {
                                const suggestionBtn = document.createElement('button');
                                suggestionBtn.className = 'btn btn-sm btn-outline-primary';
                                suggestionBtn.textContent = suggestion.text;
                                
                                // Add click handler
                                suggestionBtn.addEventListener('click', function() {
                                    if (suggestion.action === 'query') {
                                        userInput.value = suggestion.query;
                                        sendMessage();
                                    }
                                });
                                
                                docSuggestionsList.appendChild(suggestionBtn);
                            });
                            
                            // Show the suggestions container
                            docSuggestionsContainer.style.display = 'block';
                            
                            // Hide the old notification
                            if (docNotification) {
                                docNotification.style.display = 'none';
                            }
                        }
                    }
                    
                    // Handle supply chain services display
                    if (data.services && data.services.length > 0 && servicesContainer && servicesList) {
                        // Clear existing services
                        servicesList.innerHTML = '';
                        
                        // Update the title if document type is available
                        if (data.document && data.document.type) {
                            const docType = data.document.type.charAt(0).toUpperCase() + data.document.type.slice(1);
                            servicesTitle.textContent = `Recommended ${docType} Services`;
                            servicesMessage.textContent = `Based on your ${data.document.type}, here are some services that might help optimize your supply chain:`;
                        }
                        
                        // Add the services as cards
                        data.services.forEach(service => {
                            const serviceCol = document.createElement('div');
                            serviceCol.className = 'col-md-4';
                            
                            const serviceCard = document.createElement('div');
                            serviceCard.className = 'card h-100';
                            
                            const serviceCardBody = document.createElement('div');
                            serviceCardBody.className = 'card-body';
                            
                            // Service icon and title
                            const serviceHeader = document.createElement('div');
                            serviceHeader.className = 'd-flex align-items-center mb-3';
                            
                            const iconSpan = document.createElement('span');
                            iconSpan.className = 'service-icon me-3';
                            iconSpan.innerHTML = `<i class="${service.icon} fs-3 text-primary"></i>`;
                            
                            const titleEl = document.createElement('h5');
                            titleEl.className = 'card-title mb-0';
                            titleEl.textContent = service.name;
                            
                            serviceHeader.appendChild(iconSpan);
                            serviceHeader.appendChild(titleEl);
                            
                            // Service description
                            const descriptionEl = document.createElement('p');
                            descriptionEl.className = 'card-text';
                            descriptionEl.textContent = service.description;
                            
                            // Add a button to ask about the service
                            const askButton = document.createElement('button');
                            askButton.className = 'btn btn-sm btn-outline-primary mt-2';
                            askButton.textContent = 'Tell me more';
                            askButton.addEventListener('click', function() {
                                userInput.value = `Tell me more about ${service.name} for supply chain management`;
                                sendMessage();
                            });
                            
                            // Assemble the card
                            serviceCardBody.appendChild(serviceHeader);
                            serviceCardBody.appendChild(descriptionEl);
                            serviceCardBody.appendChild(askButton);
                            serviceCard.appendChild(serviceCardBody);
                            serviceCol.appendChild(serviceCard);
                            
                            // Add to services list
                            servicesList.appendChild(serviceCol);
                        });
                        
                        // Show the services container
                        servicesContainer.style.display = 'block';
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching document suggestions:', error);
                // Show the fallback notification instead
                if (docNotification) {
                    docNotification.style.display = 'block';
                }
                
                // Try to fetch services separately
                fetch('/api/services')
                    .then(response => response.json())
                    .then(data => {
                        if (data.services && data.services.length > 0 && servicesContainer && servicesList) {
                            // Display general services
                            displayServices(data.services, 'Supply Chain Services', 'Here are some services that might help optimize your supply chain:');
                        }
                    })
                    .catch(err => console.error('Error fetching services:', err));
            });
    }
    
    // Helper function to display services
    function displayServices(services, title, message) {
        if (!servicesList || !servicesContainer) return;
        
        // Update title and message
        if (servicesTitle) servicesTitle.textContent = title;
        if (servicesMessage) servicesMessage.textContent = message;
        
        // Clear existing services
        servicesList.innerHTML = '';
        
        // Add the services as cards
        services.forEach(service => {
            const serviceCol = document.createElement('div');
            serviceCol.className = 'col-md-4';
            
            const serviceCard = document.createElement('div');
            serviceCard.className = 'card h-100';
            
            const serviceCardBody = document.createElement('div');
            serviceCardBody.className = 'card-body';
            
            // Service icon and title
            const serviceHeader = document.createElement('div');
            serviceHeader.className = 'd-flex align-items-center mb-3';
            
            const iconSpan = document.createElement('span');
            iconSpan.className = 'service-icon me-3';
            iconSpan.innerHTML = `<i class="${service.icon} fs-3 text-primary"></i>`;
            
            const titleEl = document.createElement('h5');
            titleEl.className = 'card-title mb-0';
            titleEl.textContent = service.name;
            
            serviceHeader.appendChild(iconSpan);
            serviceHeader.appendChild(titleEl);
            
            // Service description
            const descriptionEl = document.createElement('p');
            descriptionEl.className = 'card-text';
            descriptionEl.textContent = service.description;
            
            // Add a button to ask about the service
            const askButton = document.createElement('button');
            askButton.className = 'btn btn-sm btn-outline-primary mt-2';
            askButton.textContent = 'Tell me more';
            askButton.addEventListener('click', function() {
                userInput.value = `Tell me more about ${service.name} for supply chain management`;
                sendMessage();
            });
            
            // Assemble the card
            serviceCardBody.appendChild(serviceHeader);
            serviceCardBody.appendChild(descriptionEl);
            serviceCardBody.appendChild(askButton);
            serviceCard.appendChild(serviceCardBody);
            serviceCol.appendChild(serviceCard);
            
            // Add to services list
            servicesList.appendChild(serviceCol);
        });
        
        // Show the services container
        servicesContainer.style.display = 'block';
    }
    
    // Check for flash messages
    const flashMessages = document.querySelectorAll('.alert');
    if (flashMessages.length > 0) {
        setTimeout(() => {
            flashMessages.forEach(msg => {
                if (msg.classList.contains('alert-success')) {
                    docNotification.style.display = 'block';
                }
            });
        }, 500);
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });
    
    newChatBtn.addEventListener('click', startNewChat);
    
    // Add click event listeners to suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', function() {
            const message = this.getAttribute('data-message');
            userInput.value = message;
            
            // Check if this is a document insights request
            if (message.toLowerCase().includes("insight") && message.toLowerCase().includes("document")) {
                showDocumentInsightsModal();
            } 
            // Check if this is a data visualization request
            else if (message.toLowerCase().includes("analytics") || message.toLowerCase().includes("visualization")) {
                // Find modal and trigger it
                const dataVizModal = document.getElementById('dataVisualizationModal');
                if (dataVizModal) {
                    // Fix form controls and radio buttons
                    dataVizModal.querySelectorAll('.form-check-input').forEach(input => {
                        input.setAttribute('style', 'pointer-events: auto !important; opacity: 1 !important;');
                    });
                    
                    dataVizModal.querySelectorAll('.form-check-label').forEach(label => {
                        label.style.pointerEvents = 'auto';
                    });
                    
                    // Make cards clickable
                    dataVizModal.querySelectorAll('.data-source-card, .chart-type-card').forEach(card => {
                        card.addEventListener('click', function() {
                            const radio = this.querySelector('input[type="radio"]');
                            if (radio) {
                                radio.checked = true;
                                radio.dispatchEvent(new Event('change'));
                            }
                        });
                    });
                    
                    // Create modal and display it
                    const modal = new bootstrap.Modal(dataVizModal);
                    modal.show();
                    
                    // Initialize the first step
                    const steps = dataVizModal.querySelectorAll('.wizard-step');
                    steps.forEach(step => {
                        step.classList.remove('active');
                    });
                    
                    const firstStep = dataVizModal.querySelector('.wizard-step[data-step="1"]');
                    if (firstStep) {
                        firstStep.classList.add('active');
                    }
                    
                    const firstIndicator = dataVizModal.querySelector('.step-indicator[data-step="1"]');
                    if (firstIndicator) {
                        firstIndicator.classList.add('active');
                    }
                } else {
                    sendMessage();
                }
            } else {
                sendMessage();
            }
        });
    });
    
    // Add event listener for Ask About Insights button
    if (askAboutInsightsBtn) {
        askAboutInsightsBtn.addEventListener('click', function() {
            if (documentInsightsModalObj) {
                documentInsightsModalObj.hide();
            }
            // Get the document title from the modal
            const titleElement = insightsContent.querySelector('h2') || insightsContent.querySelector('h3');
            let documentTitle = "the document";
            if (titleElement) {
                documentTitle = titleElement.textContent.replace('AI Insights for ', '');
            }
            
            // Set a question about the insights
            userInput.value = `Tell me more about ${documentTitle}`;
            sendMessage();
        });
    }
    
    // Handle document insights request
    function showDocumentInsightsModal() {
        // Check if there are any recent documents in the session
        const hasRecentDocuments = document.querySelector('#doc-notification').style.display !== 'none' || 
                                  document.querySelector('#doc-suggestions-container').style.display !== 'none';
                                  
        // Reset modal content
        if (insightsContent) {
            if (!hasRecentDocuments) {
                // No documents have been uploaded
                insightsContent.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>No documents found!</strong> You need to upload a document first before you can get insights.
                    </div>
                    <div class="text-center mt-4">
                        <a href="/upload" class="btn btn-primary">
                            <i class="fas fa-upload me-2"></i>Upload a Document
                        </a>
                    </div>
                `;
            } else {
                // Show loading state
                insightsContent.innerHTML = `
                    <div class="d-flex justify-content-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    <p class="text-center mt-3">Analyzing document...</p>
                `;
            }
        }
        
        // Get direct references to close buttons
        const modalCloseBtn = document.querySelector('#documentInsightsModal .btn-close');
        const footerCloseBtn = document.querySelector('#documentInsightsModal .btn-outline-secondary');
        
        // Set up direct event listeners
        if (modalCloseBtn) {
            modalCloseBtn.onclick = function() {
                if (documentInsightsModalObj) {
                    documentInsightsModalObj.hide();
                }
            };
        }
        
        if (footerCloseBtn) {
            footerCloseBtn.onclick = function() {
                if (documentInsightsModalObj) {
                    documentInsightsModalObj.hide();
                }
            };
        }
        
        // Show the modal
        if (documentInsightsModalObj) {
            documentInsightsModalObj.show();
        }
        
        // If no documents, don't make the API call
        if (!hasRecentDocuments) {
            return;
        }
        
        // Send the request to generate insights
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: "Generate insights for my uploaded document",
                session_id: sessionId
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Store the session ID
            if (data.session_id) {
                sessionId = data.session_id;
            }
            
            // Make sure modal is still open before updating content
            if (!document.querySelector('#documentInsightsModal.show')) {
                return; // User closed the modal while waiting
            }
            
            // Update modal content with insights
            if (data.response && insightsContent) {
                // Convert markdown to HTML for better formatting
                let formattedInsights = formatMarkdownInsights(data.response);
                insightsContent.innerHTML = formattedInsights;
            } else if (data.error && insightsContent) {
                insightsContent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${data.error}
                    </div>
                    <div class="text-center mt-3">
                        <a href="/upload" class="btn btn-outline-primary">
                            <i class="fas fa-upload me-2"></i>Upload a New Document
                        </a>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Make sure modal is still open before updating content
            if (!document.querySelector('#documentInsightsModal.show')) {
                return; // User closed the modal while waiting
            }
            
            if (insightsContent) {
                insightsContent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Sorry, there was an error generating insights. Please try again.
                    </div>
                    <div class="text-center mt-3">
                        <button class="btn btn-outline-primary" onclick="showDocumentInsightsModal()">
                            <i class="fas fa-sync me-2"></i>Try Again
                        </button>
                    </div>
                `;
            }
        });
    }
    
    // Format markdown for insights display
    function formatMarkdownInsights(markdown) {
        let html = markdown;
        
        // Format headers
        html = html.replace(/^# (.*$)/gm, '<h2 class="mb-3">$1</h2>');
        html = html.replace(/^## (.*$)/gm, '<h3 class="mt-4 mb-3">$1</h3>');
        
        // Format bold text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Format lists
        html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n)+/g, '<ul class="mb-3">$&</ul>');
        
        // Format line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }
    
    // Focus on input field
    userInput.focus();
    
    // Send message function
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (message && !waitingForResponse) {
            // Add user message to chat
            addMessage(message, true);
            
            // Clear input
            userInput.value = '';
            
            // Show loading message
            showLoadingMessage();
            
            // Set waiting status
            waitingForResponse = true;
            
            // Send to backend
            fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: sessionId
                }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Remove loading message
                removeLoadingMessage();
                
                // Store the session ID
                if (data.session_id) {
                    sessionId = data.session_id;
                }
                
                // Add bot response to chat
                if (data.response) {
                    addMessage(data.response, false);
                } else if (data.error) {
                    addErrorMessage(data.error);
                }
                
                // Reset waiting status
                waitingForResponse = false;
            })
            .catch(error => {
                console.error('Error:', error);
                removeLoadingMessage();
                addErrorMessage('Sorry, there was an error processing your request. Please try again.');
                waitingForResponse = false;
            });
        }
    }
    
    // Add message to chat
    function addMessage(message, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user-message' : 'message bot-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">
                    ${isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}
                </div>
                <div class="message-text">
                    ${formatMessage(message)}
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // Format message content with Markdown-like support
    function formatMessage(message) {
        // Parse URLs
        let formattedMessage = message.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Parse line breaks
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        
        // Parse bullet points
        formattedMessage = formattedMessage.replace(
            /\n\s*\*\s(.+)/g,
            '<br>• $1'
        );
        
        return formattedMessage;
    }
    
    // Show loading indicator
    function showLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message loading';
        loadingDiv.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-text">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(loadingDiv);
        scrollToBottom();
    }
    
    // Remove loading indicator
    function removeLoadingMessage() {
        const loadingMessage = document.querySelector('.loading');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
    
    // Add error message
    function addErrorMessage(errorText) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message bot-message error';
        
        errorDiv.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="message-text">
                    <div class="error-message">
                        ${errorText}
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(errorDiv);
        scrollToBottom();
    }
    
    // Start a new chat session
    function startNewChat() {
        // Clear the session ID
        sessionId = null;
        
        // Clear the chat history except the first welcome message
        const messages = chatMessages.querySelectorAll('.message');
        for (let i = 1; i < messages.length; i++) {
            messages[i].remove();
        }
        
        // Hide document suggestions and services
        if (docSuggestionsContainer) {
            docSuggestionsContainer.style.display = 'none';
        }
        
        if (servicesContainer) {
            servicesContainer.style.display = 'none';
        }
        
        if (docNotification) {
            docNotification.style.display = 'none';
        }
        
        // Clear the input field
        userInput.value = '';
        
        // Focus on input field
        userInput.focus();
    }
    
    // Scroll to bottom of chat
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Get and display document history
    function getDocumentHistory() {
        // Request document history from session
        fetch('/api/document-history')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const historyPanel = document.getElementById('document-history-panel');
                const historyList = document.getElementById('document-history-list');
                
                if (historyPanel && historyList && data.documents && data.documents.length > 0) {
                    // Clear existing history
                    historyList.innerHTML = '';
                    
                    // Add each document to the history
                    data.documents.forEach(doc => {
                        const item = document.createElement('div');
                        item.className = 'list-group-item list-group-item-action border-0 py-2 px-3 d-flex align-items-center';
                        item.style.borderRadius = '8px';
                        item.style.marginBottom = '8px';
                        item.style.background = 'rgba(var(--bs-dark-rgb), 0.03)';
                        
                        // Document icon based on type
                        let iconClass = 'fas fa-file-alt';
                        
                        if (doc.doc_type === 'invoice') {
                            iconClass = 'fas fa-file-invoice-dollar';
                        } else if (doc.doc_type === 'purchase_order') {
                            iconClass = 'fas fa-shopping-cart';
                        } else if (doc.doc_type === 'shipping_document') {
                            iconClass = 'fas fa-shipping-fast';
                        } else if (doc.doc_type === 'inventory') {
                            iconClass = 'fas fa-boxes';
                        } else if (doc.doc_type === 'supplier') {
                            iconClass = 'fas fa-handshake';
                        }
                        
                        const docIcon = document.createElement('div');
                        docIcon.className = 'me-3 text-primary';
                        docIcon.innerHTML = `<i class="${iconClass}"></i>`;
                        
                        const docContent = document.createElement('div');
                        docContent.className = 'flex-grow-1';
                        
                        const docName = document.createElement('div');
                        docName.className = 'fw-bold text-truncate';
                        docName.style.maxWidth = '180px';
                        docName.textContent = doc.filename;
                        
                        const docType = document.createElement('div');
                        docType.className = 'small text-muted';
                        docType.textContent = doc.doc_type.charAt(0).toUpperCase() + doc.doc_type.slice(1);
                        
                        const askButton = document.createElement('button');
                        askButton.className = 'btn btn-sm btn-outline-primary ms-2';
                        askButton.innerHTML = '<i class="fas fa-question-circle"></i>';
                        askButton.title = `Ask about ${doc.filename}`;
                        askButton.addEventListener('click', function() {
                            userInput.value = `Tell me about the ${doc.doc_type} "${doc.filename}"`;
                            sendMessage();
                        });
                        
                        // Assemble the history item
                        docContent.appendChild(docName);
                        docContent.appendChild(docType);
                        
                        item.appendChild(docIcon);
                        item.appendChild(docContent);
                        item.appendChild(askButton);
                        
                        // Add item to the list
                        historyList.appendChild(item);
                    });
                    
                    // Show the history panel
                    historyPanel.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error fetching document history:', error);
            });
    }
    
    // Helper function: Format data source name
    function formatDataSourceName(dataSource) {
        const names = {
            'inventory': 'Inventory Analysis',
            'suppliers': 'Supplier Performance',
            'orders': 'Order Analytics',
            'logistics': 'Logistics Metrics'
        };
        
        return names[dataSource] || 'Supply Chain Analytics';
    }
    
    // Helper function: Format chart type name
    function formatChartTypeName(chartType) {
        const names = {
            'bar': 'Bar Chart',
            'line': 'Line Chart',
            'pie': 'Pie Chart',
            'radar': 'Radar Chart',
            'doughnut': 'Doughnut Chart'
        };
        
        return names[chartType] || 'Chart';
    }
});
