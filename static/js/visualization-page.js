/**
 * Data Visualization Page JavaScript
 * Chain IQ Smart Supply Chain Analytics
 */
document.addEventListener('DOMContentLoaded', function() {
    // Variables
    let currentStep = 1;
    let currentChart = null;
    let chartInstance = null;
    
    // Elements
    const wizardSteps = document.querySelectorAll('.wizard-step');
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const nextBtn = document.getElementById('wizard-next-btn');
    const backBtn = document.getElementById('wizard-back-btn');
    const exportBtn = document.getElementById('export-chart-btn');
    const shareToChatBtn = document.getElementById('share-to-chat-btn');
    
    // Initialize the wizard
    initWizard();
    
    // Initialize the page
    function initWizard() {
        // Show the first step
        showStep(1);
        
        // Add click event listeners to step indicators
        stepIndicators.forEach(indicator => {
            indicator.addEventListener('click', function() {
                const stepNumber = parseInt(this.getAttribute('data-step'));
                
                // Can only navigate to completed steps or the current step + 1
                if (stepNumber <= currentStep || stepNumber === currentStep + 1) {
                    if (validateStep(currentStep) || stepNumber < currentStep) {
                        showStep(stepNumber);
                    }
                }
            });
        });
        
        // Add click event to the next button
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (validateStep(currentStep)) {
                    showStep(currentStep + 1);
                    
                    // If moving to chart preview step, generate chart
                    if (currentStep === 3) {
                        generateVisualization();
                    }
                }
            });
        }
        
        // Add click event to the back button
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                showStep(currentStep - 1);
            });
        }
        
        // Make data source cards clickable
        const dataSourceCards = document.querySelectorAll('.data-source-card');
        dataSourceCards.forEach(card => {
            card.addEventListener('click', function() {
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    // Update dimension options based on selected data source
                    updateDimensionOptions(radio.value);
                }
            });
        });
        
        // Make chart type cards clickable
        const chartTypeCards = document.querySelectorAll('.chart-type-card');
        chartTypeCards.forEach(card => {
            card.addEventListener('click', function() {
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    currentChart = radio.value;
                    // Update chart description
                    updateChartDescription(radio.value);
                }
            });
        });
        
        // Add listeners for data source radios
        const dataSourceRadios = document.querySelectorAll('input[name="dataSource"]');
        dataSourceRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                updateDimensionOptions(this.value);
            });
        });
        
        // Add listeners for chart type radios
        const chartTypeRadios = document.querySelectorAll('input[name="chartType"]');
        chartTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                updateChartDescription(this.value);
                currentChart = this.value;
            });
        });
        
        // Add export button event
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                if (chartInstance) {
                    downloadChart();
                } else {
                    showValidationError('Please generate a chart first');
                }
            });
        }
        
        // Add share to chat button event
        if (shareToChatBtn) {
            shareToChatBtn.addEventListener('click', function() {
                if (chartInstance) {
                    shareToChat();
                } else {
                    showValidationError('Please generate a chart first');
                }
            });
        }
    }
    
    // Show a specific step
    function showStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > wizardSteps.length) {
            return;
        }
        
        // Hide all steps
        wizardSteps.forEach(step => {
            step.classList.remove('active');
            step.classList.add('fade-out');
        });
        
        // Update step indicators
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
            wizardSteps.forEach(step => {
                step.classList.remove('fade-out');
                const stepNum = parseInt(step.getAttribute('data-step'));
                if (stepNum === stepNumber) {
                    step.classList.add('active', 'fade-in');
                }
            });
        }, 300);
        
        // Update navigation buttons
        updateNavigationButtons(stepNumber);
        
        // Update current step
        currentStep = stepNumber;
    }
    
    // Update navigation buttons based on current step
    function updateNavigationButtons(stepNumber) {
        if (backBtn) {
            backBtn.style.display = stepNumber > 1 ? 'block' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = stepNumber < wizardSteps.length ? 'block' : 'none';
        }
    }
    
    // Validate the current step
    function validateStep(stepNumber) {
        switch(stepNumber) {
            case 1: // Data Source
                const dataSource = document.querySelector('input[name="dataSource"]:checked');
                if (!dataSource) {
                    showValidationError('Please select a data source');
                    return false;
                }
                return true;
                
            case 2: // Chart Type
                const chartType = document.querySelector('input[name="chartType"]:checked');
                if (!chartType) {
                    showValidationError('Please select a chart type');
                    return false;
                }
                currentChart = chartType.value;
                return true;
                
            case 3: // Dimensions
                const dimensions = document.querySelectorAll('.dimension-select');
                let isValid = true;
                
                dimensions.forEach(select => {
                    if (select.required && !select.value) {
                        showValidationError('Please complete all required dimensions');
                        isValid = false;
                        return;
                    }
                });
                
                return isValid;
                
            default:
                return true;
        }
    }
    
    // Show validation error message
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
    
    // Update dimension options based on data source
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
        if (dataSource && dataSource !== 'default') {
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
        }
        
        // Apply a smooth transition effect
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
    
    // Update chart description
    function updateChartDescription(chartType) {
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
        
        // Store the chart in recent visualizations
        storeRecentVisualization(dataSourceValue, chartTypeValue, sampleData);
    }
    
    // Create chart
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
    
    // Generate sample data
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
    
    // Download the chart as an image
    function downloadChart() {
        if (!chartInstance) return;
        
        const canvas = document.getElementById('visualization-canvas');
        const imageURL = canvas.toDataURL('image/png');
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = imageURL;
        downloadLink.download = 'supply-chain-analytics.png';
        downloadLink.click();
    }
    
    // Share the chart to the chat interface
    function shareToChat() {
        if (!chartInstance) return;
        
        // Get the chart image
        const canvas = document.getElementById('visualization-canvas');
        const imageURL = canvas.toDataURL('image/png');
        
        // Get data source and chart type for better description
        const dataSource = document.querySelector('input[name="dataSource"]:checked').value;
        const chartType = currentChart;
        
        // Store in localStorage to be picked up by the chat interface
        localStorage.setItem('sharedChartImage', imageURL);
        localStorage.setItem('sharedChartDataSource', dataSource);
        localStorage.setItem('sharedChartType', chartType);
        
        // Redirect to chat with a query parameter to indicate a shared chart
        window.location.href = '/?shared_chart=true';
    }
    
    // Store a recent visualization in localStorage
    function storeRecentVisualization(dataSource, chartType, data) {
        // Get existing visualizations
        let recentVisualizations = JSON.parse(localStorage.getItem('recentVisualizations') || '[]');
        
        // Create a new visualization item
        const canvas = document.getElementById('visualization-canvas');
        const imageURL = canvas.toDataURL('image/png');
        
        const newVisualization = {
            id: Date.now(),
            dataSource: dataSource,
            chartType: chartType,
            date: new Date().toISOString(),
            imageURL: imageURL
        };
        
        // Add to the beginning of the array
        recentVisualizations.unshift(newVisualization);
        
        // Limit to 5 items
        recentVisualizations = recentVisualizations.slice(0, 5);
        
        // Save back to localStorage
        localStorage.setItem('recentVisualizations', JSON.stringify(recentVisualizations));
        
        // Update the UI
        displayRecentVisualizations();
    }
    
    // Display recent visualizations
    function displayRecentVisualizations() {
        const container = document.getElementById('recent-visualizations');
        if (!container) return;
        
        // Get visualizations from localStorage
        const recentVisualizations = JSON.parse(localStorage.getItem('recentVisualizations') || '[]');
        
        if (recentVisualizations.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-center text-muted py-3">No recent visualizations.</p></div>';
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Add each visualization
        recentVisualizations.forEach(viz => {
            const vizCol = document.createElement('div');
            vizCol.className = 'col-md-4 mb-3';
            
            const vizCard = document.createElement('div');
            vizCard.className = 'card h-100';
            
            const vizImg = document.createElement('img');
            vizImg.src = viz.imageURL;
            vizImg.className = 'card-img-top';
            vizImg.alt = 'Chart Visualization';
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            const title = document.createElement('h6');
            title.className = 'card-title';
            title.textContent = formatDataSourceName(viz.dataSource);
            
            const subtitle = document.createElement('p');
            subtitle.className = 'card-text small text-muted';
            subtitle.textContent = `${formatChartTypeName(viz.chartType)} • ${formatDate(viz.date)}`;
            
            const btnGroup = document.createElement('div');
            btnGroup.className = 'd-flex justify-content-between mt-2';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-sm btn-outline-secondary';
            viewBtn.innerHTML = '<i class="fas fa-eye me-1"></i>View';
            viewBtn.addEventListener('click', () => {
                // Restore this visualization
                restoreVisualization(viz);
            });
            
            const shareBtn = document.createElement('button');
            shareBtn.className = 'btn btn-sm btn-outline-primary';
            shareBtn.innerHTML = '<i class="fas fa-share me-1"></i>Share';
            shareBtn.addEventListener('click', () => {
                // Share to chat
                localStorage.setItem('sharedChartImage', viz.imageURL);
                localStorage.setItem('sharedChartDataSource', viz.dataSource);
                localStorage.setItem('sharedChartType', viz.chartType);
                window.location.href = '/?shared_chart=true';
            });
            
            // Assemble the card
            btnGroup.appendChild(viewBtn);
            btnGroup.appendChild(shareBtn);
            
            cardBody.appendChild(title);
            cardBody.appendChild(subtitle);
            cardBody.appendChild(btnGroup);
            
            vizCard.appendChild(vizImg);
            vizCard.appendChild(cardBody);
            
            vizCol.appendChild(vizCard);
            container.appendChild(vizCol);
        });
    }
    
    // Restore a visualization
    function restoreVisualization(visualization) {
        // Set the data source
        const dataSourceRadio = document.querySelector(`input[name="dataSource"][value="${visualization.dataSource}"]`);
        if (dataSourceRadio) {
            dataSourceRadio.checked = true;
            updateDimensionOptions(visualization.dataSource);
        }
        
        // Set the chart type
        const chartTypeRadio = document.querySelector(`input[name="chartType"][value="${visualization.chartType}"]`);
        if (chartTypeRadio) {
            chartTypeRadio.checked = true;
            currentChart = visualization.chartType;
            updateChartDescription(visualization.chartType);
        }
        
        // Navigate to the preview step
        showStep(4);
        
        // Generate the chart
        generateVisualization();
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
    
    // Helper function: Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
    
    // Helper function: Get default from date (3 months ago)
    function getDefaultFromDate() {
        const date = new Date();
        date.setMonth(date.getMonth() - 3);
        return date.toISOString().split('T')[0];
    }
    
    // Helper function: Get default to date (today)
    function getDefaultToDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    // Initialize on page load
    displayRecentVisualizations();
});