/**
 * Interactive Data Visualization Wizard
 * Chain IQ Smart Supply Chain Chatbot
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page with the visualization wizard
    const vizWizardContainer = document.getElementById('visualization-wizard-container');
    const vizModal = document.getElementById('dataVisualizationModal');
    let vizWizardObj = null;
    let currentChart = null;
    let chartInstance = null;
    
    // Initialize visualization modal if it exists
    if (vizModal) {
        vizWizardObj = new bootstrap.Modal(vizModal, {
            keyboard: true
        });
        
        // Fix for radio buttons and labels
        vizModal.querySelectorAll('.form-check-input').forEach(input => {
            input.setAttribute('style', 'pointer-events: auto !important; opacity: 1 !important;');
        });

        vizModal.querySelectorAll('.form-check-label').forEach(label => {
            label.style.pointerEvents = 'auto';
        });
        
        // Make cards clickable to select radio buttons
        vizModal.querySelectorAll('.data-source-card, .chart-type-card').forEach(card => {
            card.addEventListener('click', function() {
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    // Trigger a change event
                    radio.dispatchEvent(new Event('change'));
                }
            });
        });
        
        // Set up direct event handlers for closing
        const closeButtons = vizModal.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                vizWizardObj.hide();
            });
        });
    }
    
    // Check for the chat interface "Show me supply chain analytics" chip
    const analyticChip = document.querySelector('.chip[data-message="Show me supply chain analytics"]');
    if (analyticChip) {
        analyticChip.addEventListener('click', function(e) {
            e.preventDefault();
            showVisualizationWizard();
        });
    }
    
    // Main function to show the visualization wizard
    function showVisualizationWizard() {
        // Get the modal directly if vizWizardObj is not defined
        const dataVizModal = document.getElementById('dataVisualizationModal');
        
        if (!vizWizardObj && dataVizModal) {
            // Reinitialize the modal if it wasn't created yet
            vizWizardObj = new bootstrap.Modal(dataVizModal, {
                keyboard: true
            });
            
            // Ensure form controls are interactive
            dataVizModal.querySelectorAll('.form-check-input').forEach(input => {
                input.setAttribute('style', 'pointer-events: auto !important; opacity: 1 !important;');
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
        }
        
        if (vizWizardObj) {
            // Reset the wizard
            resetWizard();
            // Show the modal
            vizWizardObj.show();
            // Initialize the first step
            showWizardStep(1);
        }
    }
    
    // Function to reset the wizard state
    function resetWizard() {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        
        currentChart = null;
        
        // Reset active steps
        const steps = document.querySelectorAll('.wizard-step');
        steps.forEach(step => {
            step.classList.remove('active');
        });
        
        // Reset step indicators
        const stepIndicators = document.querySelectorAll('.step-indicator');
        stepIndicators.forEach(indicator => {
            indicator.classList.remove('active', 'completed');
        });
        
        // Show the appropriate buttons
        const backBtn = document.getElementById('wizard-back-btn');
        const nextBtn = document.getElementById('wizard-next-btn');
        const finishBtn = document.getElementById('wizard-finish-btn');
        
        if (backBtn) backBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'inline-block';
        if (finishBtn) finishBtn.style.display = 'none';
    }
    
    // Function to show a specific wizard step
    function showWizardStep(stepNumber) {
        // Hide all steps
        const steps = document.querySelectorAll('.wizard-step');
        steps.forEach(step => {
            step.classList.remove('active');
            // Add fade out animation
            step.classList.add('fade-out');
        });
        
        // Update step indicators
        const stepIndicators = document.querySelectorAll('.step-indicator');
        stepIndicators.forEach((indicator, index) => {
            if (index + 1 < stepNumber) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (index + 1 === stepNumber) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });
        
        // Show the selected step with animation
        setTimeout(() => {
            steps.forEach(step => {
                step.classList.remove('fade-out');
                if (parseInt(step.getAttribute('data-step')) === stepNumber) {
                    step.classList.add('active', 'fade-in');
                }
            });
        }, 300);
        
        // Update navigation buttons
        updateNavigationButtons(stepNumber, steps.length);
    }
    
    // Function to update navigation buttons based on current step
    function updateNavigationButtons(currentStep, totalSteps) {
        const backBtn = document.getElementById('wizard-back-btn');
        const nextBtn = document.getElementById('wizard-next-btn');
        const finishBtn = document.getElementById('wizard-finish-btn');
        
        if (backBtn) {
            backBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
            backBtn.addEventListener('click', function() {
                showWizardStep(currentStep - 1);
            });
        }
        
        if (nextBtn) {
            nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
            nextBtn.addEventListener('click', function() {
                if (validateStep(currentStep)) {
                    showWizardStep(currentStep + 1);
                    
                    // If moving to chart preview step, generate the chart
                    if (currentStep + 1 === totalSteps) {
                        generateVisualization();
                    }
                }
            });
        }
        
        if (finishBtn) {
            finishBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
            finishBtn.addEventListener('click', function() {
                exportVisualization();
                vizWizardObj.hide();
            });
        }
    }
    
    // Function to validate each step
    function validateStep(stepNumber) {
        switch(stepNumber) {
            case 1:
                // Validate data source selection
                const dataSource = document.querySelector('input[name="dataSource"]:checked');
                if (!dataSource) {
                    showValidationError('Please select a data source');
                    return false;
                }
                return true;
                
            case 2:
                // Validate chart type selection
                const chartType = document.querySelector('input[name="chartType"]:checked');
                if (!chartType) {
                    showValidationError('Please select a chart type');
                    return false;
                }
                currentChart = chartType.value;
                return true;
                
            case 3:
                // Validate dimension selection based on chart type
                const dimensions = document.querySelectorAll('.dimension-select');
                for (const select of dimensions) {
                    if (select.required && !select.value) {
                        showValidationError('Please complete all required dimensions');
                        return false;
                    }
                }
                return true;
                
            default:
                return true;
        }
    }
    
    // Show validation error with animation
    function showValidationError(message) {
        const errorContainer = document.getElementById('wizard-validation-error');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            errorContainer.classList.add('shake-animation');
            
            setTimeout(() => {
                errorContainer.classList.remove('shake-animation');
            }, 500);
            
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 3000);
        }
    }
    
    // Generate visualization based on selections
    function generateVisualization() {
        const chartPreview = document.getElementById('chart-preview');
        if (!chartPreview) return;
        
        // Clear existing chart
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Get selected options
        const dataSourceValue = document.querySelector('input[name="dataSource"]:checked').value;
        const chartTypeValue = currentChart;
        
        // Create canvas for the chart
        chartPreview.innerHTML = '<canvas id="visualization-canvas"></canvas>';
        const ctx = document.getElementById('visualization-canvas').getContext('2d');
        
        // Generate sample data based on selected data source
        const sampleData = generateSampleData(dataSourceValue, chartTypeValue);
        
        // Create chart with animation
        chartInstance = createChart(ctx, chartTypeValue, sampleData);
    }
    
    // Generate sample data for preview
    function generateSampleData(dataSource, chartType) {
        // Different sample data based on data source and chart type
        const dataSets = {
            'inventory': {
                labels: ['Electronics', 'Clothing', 'Food', 'Furniture', 'Books'],
                datasets: [
                    {
                        label: 'Current Stock',
                        data: [1200, 1900, 3000, 500, 1700],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            'suppliers': {
                labels: ['ABC Corp', 'XYZ Inc', 'Supply Co', 'Prime Materials', 'Global Parts'],
                datasets: [
                    {
                        label: 'On-Time Delivery %',
                        data: [92, 88, 95, 79, 85],
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Quality Score',
                        data: [88, 92, 90, 82, 91],
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            'orders': {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'New Orders',
                        data: [65, 59, 80, 81, 56, 55],
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        fill: false
                    },
                    {
                        label: 'Fulfilled Orders',
                        data: [40, 50, 60, 70, 50, 45],
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        fill: false
                    }
                ]
            },
            'logistics': {
                labels: ['Ground', 'Air', 'Ocean', 'Rail', 'Express'],
                datasets: [
                    {
                        label: 'Cost',
                        data: [300, 200, 100, 250, 400],
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Time (Days)',
                        data: [2, 1, 30, 5, 1],
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            }
        };
        
        return dataSets[dataSource] || dataSets['inventory'];
    }
    
    // Create chart based on type and data
    function createChart(ctx, chartType, data) {
        // Configure animations
        Chart.defaults.animation = {
            duration: 1200,
            easing: 'easeOutQuart'
        };
        
        let chartConfig = {
            type: chartType,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Supply Chain Analytics'
                    }
                },
                animation: {
                    onComplete: function() {
                        // Add completed animation class to container
                        const chartContainer = document.getElementById('chart-preview');
                        if (chartContainer) {
                            chartContainer.classList.add('chart-loaded');
                        }
                    }
                }
            }
        };
        
        // Special configurations for specific chart types
        if (chartType === 'line') {
            chartConfig.options.elements = {
                line: {
                    tension: 0.3 // Smoother lines
                }
            };
        } else if (chartType === 'radar') {
            chartConfig.options.scales = {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 50,
                    suggestedMax: 100
                }
            };
        } else if (chartType === 'bar') {
            chartConfig.options.scales = {
                y: {
                    beginAtZero: true
                }
            };
        }
        
        return new Chart(ctx, chartConfig);
    }
    
    // Function to export the visualization
    function exportVisualization() {
        if (!chartInstance) return;
        
        const canvas = document.getElementById('visualization-canvas');
        const imageURL = canvas.toDataURL('image/png');
        
        // Create a download link for the image
        const downloadLink = document.createElement('a');
        downloadLink.href = imageURL;
        downloadLink.download = 'supply-chain-analytics.png';
        downloadLink.click();
        
        // Also add the chart to the chat as a message
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        
        if (userInput && sendButton) {
            userInput.value = "Here's my supply chain visualization. Can you analyze it?";
            sendButton.click();
            
            // After a small delay, display the visualization in chat
            setTimeout(() => {
                // Add the visualization to the chat
                const chatContainer = document.getElementById('chat-messages');
                if (chatContainer) {
                    const vizMessage = document.createElement('div');
                    vizMessage.className = 'message bot-message fade-in-message';
                    
                    const vizImg = document.createElement('img');
                    vizImg.src = imageURL;
                    vizImg.alt = 'Supply Chain Analytics';
                    vizImg.className = 'img-fluid rounded my-2';
                    vizImg.style.maxWidth = '100%';
                    
                    const vizResponse = document.createElement('p');
                    vizResponse.textContent = "Here's your visualization! This chart shows your supply chain analytics data. What would you like to know about it?";
                    
                    vizMessage.appendChild(vizImg);
                    vizMessage.appendChild(vizResponse);
                    chatContainer.appendChild(vizMessage);
                    
                    // Scroll to the bottom to see the new message
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 1000);
        }
    }
    
    // Event listeners for data source selection to dynamically update step 3
    const dataSourceRadios = document.querySelectorAll('input[name="dataSource"]');
    dataSourceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateDimensionOptions(this.value);
        });
    });
    
    // Event listeners for chart type selection
    const chartTypeRadios = document.querySelectorAll('input[name="chartType"]');
    chartTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateRequiredDimensions(this.value);
        });
    });
    
    // Function to update dimension options based on selected data source
    function updateDimensionOptions(dataSource) {
        const dimensionsContainer = document.getElementById('dimensions-container');
        if (!dimensionsContainer) return;
        
        // Different dimension options based on data source
        let dimensionHTML = '';
        
        switch(dataSource) {
            case 'inventory':
                dimensionHTML = `
                    <div class="mb-3">
                        <label for="dimension-x" class="form-label">Categories:</label>
                        <select id="dimension-x" class="form-select dimension-select" required>
                            <option value="">Select category dimension</option>
                            <option value="product_category">Product Category</option>
                            <option value="warehouse">Warehouse Location</option>
                            <option value="supplier">Supplier</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="dimension-y" class="form-label">Metrics:</label>
                        <select id="dimension-y" class="form-select dimension-select" required>
                            <option value="">Select metric dimension</option>
                            <option value="current_stock">Current Stock</option>
                            <option value="reorder_point">Reorder Point</option>
                            <option value="stock_value">Stock Value</option>
                            <option value="turnover_rate">Turnover Rate</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'suppliers':
                dimensionHTML = `
                    <div class="mb-3">
                        <label for="dimension-x" class="form-label">Suppliers:</label>
                        <select id="dimension-x" class="form-select dimension-select" required>
                            <option value="">Select supplier dimension</option>
                            <option value="top_suppliers">Top Suppliers</option>
                            <option value="by_region">By Region</option>
                            <option value="by_category">By Category</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="dimension-y" class="form-label">Performance Metrics:</label>
                        <select id="dimension-y" class="form-select dimension-select" required>
                            <option value="">Select metric dimension</option>
                            <option value="on_time_delivery">On-Time Delivery %</option>
                            <option value="quality_score">Quality Score</option>
                            <option value="cost_efficiency">Cost Efficiency</option>
                            <option value="responsiveness">Responsiveness</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'orders':
                dimensionHTML = `
                    <div class="mb-3">
                        <label for="dimension-x" class="form-label">Time Period:</label>
                        <select id="dimension-x" class="form-select dimension-select" required>
                            <option value="">Select time dimension</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="dimension-y" class="form-label">Order Metrics:</label>
                        <select id="dimension-y" class="form-select dimension-select" required>
                            <option value="">Select metric dimension</option>
                            <option value="new_orders">New Orders</option>
                            <option value="fulfilled_orders">Fulfilled Orders</option>
                            <option value="cancelled_orders">Cancelled Orders</option>
                            <option value="order_value">Order Value</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'logistics':
                dimensionHTML = `
                    <div class="mb-3">
                        <label for="dimension-x" class="form-label">Shipping Methods:</label>
                        <select id="dimension-x" class="form-select dimension-select" required>
                            <option value="">Select shipping dimension</option>
                            <option value="shipping_methods">Shipping Methods</option>
                            <option value="carriers">Carriers</option>
                            <option value="destinations">Destinations</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="dimension-y" class="form-label">Logistics Metrics:</label>
                        <select id="dimension-y" class="form-select dimension-select" required>
                            <option value="">Select metric dimension</option>
                            <option value="shipping_cost">Shipping Cost</option>
                            <option value="delivery_time">Delivery Time</option>
                            <option value="carbon_footprint">Carbon Footprint</option>
                            <option value="damage_rate">Damage Rate</option>
                        </select>
                    </div>
                `;
                break;
                
            default:
                dimensionHTML = `
                    <div class="alert alert-info">
                        Please select a data source in the previous step.
                    </div>
                `;
        }
        
        // Add time filter for all data sources
        dimensionHTML += `
            <div class="mb-3 mt-4">
                <label class="form-label">Time Filter:</label>
                <div class="input-group">
                    <span class="input-group-text">From</span>
                    <input type="date" class="form-control" id="date-from" value="${getDefaultFromDate()}">
                    <span class="input-group-text">To</span>
                    <input type="date" class="form-control" id="date-to" value="${getDefaultToDate()}">
                </div>
            </div>
        `;
        
        // Add a smooth transition effect
        dimensionsContainer.classList.add('fade-out');
        setTimeout(() => {
            dimensionsContainer.innerHTML = dimensionHTML;
            dimensionsContainer.classList.remove('fade-out');
            dimensionsContainer.classList.add('fade-in');
            setTimeout(() => {
                dimensionsContainer.classList.remove('fade-in');
            }, 300);
        }, 300);
    }
    
    // Function to update required dimensions based on chart type
    function updateRequiredDimensions(chartType) {
        const chartTypeDescriptions = {
            'bar': 'Bar charts are good for comparing categories and showing data in discrete groups.',
            'line': 'Line charts are ideal for showing trends over time or continuous data series.',
            'pie': 'Pie charts work well for showing proportions and percentages of a whole.',
            'radar': 'Radar charts are useful for comparing multiple variables for multiple entities.',
            'doughnut': 'Doughnut charts, like pie charts, show proportions but with a hole in the center for additional information.'
        };
        
        const descriptionElement = document.getElementById('chart-type-description');
        if (descriptionElement) {
            descriptionElement.textContent = chartTypeDescriptions[chartType] || '';
            
            // Add a subtle animation
            descriptionElement.classList.add('pulse-animation');
            setTimeout(() => {
                descriptionElement.classList.remove('pulse-animation');
            }, 500);
        }
    }
    
    // Helper function to get default from date (3 months ago)
    function getDefaultFromDate() {
        const date = new Date();
        date.setMonth(date.getMonth() - 3);
        return date.toISOString().split('T')[0];
    }
    
    // Helper function to get default to date (today)
    function getDefaultToDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    // Preview animation effect for chart type selection
    const chartTypeCards = document.querySelectorAll('.chart-type-card');
    chartTypeCards.forEach(card => {
        card.addEventListener('mouseover', function() {
            this.classList.add('chart-hover');
        });
        
        card.addEventListener('mouseout', function() {
            this.classList.remove('chart-hover');
        });
    });
});