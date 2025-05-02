from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from db_config import db  # Import db from db_config
import os
import logging
from datetime import datetime
import json
import tempfile

from transformers import pipeline  # For Hugging Face Transformers
import nlp_processor  # Import your NLP processor

logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "your-secret-key")

# Configure the database
db_path = os.environ.get("DATABASE_URL", "sqlite:///chainiq.db")
app.config["SQLALCHEMY_DATABASE_URI"] = db_path
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Maximum upload size (5MB)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

# Initialize the app with the extension
db.init_app(app)

# Import routes and models after app initialization to avoid circular imports
with app.app_context():
    from models import SupplyChainDocument, ChatSession, ChatMessage
    from data_ingestion import process_document, allowed_file, extract_text_from_file, detect_document_type
    import vector_store

    # Create all DB tables
    db.create_all()

    # Initialize vector store
    vector_store.init_vector_store()

# Routes
@app.route('/')
def index():
    """Display the welcome page, tour guide, or main app."""
    # Clear session if app is restarted (add this line)
    if not request.cookies.get('session'):
        session.clear()
    
    # Check if this is first time visit
    if 'has_visited' not in session:
        # First-time visit: Show the welcome page
        session['has_visited'] = True
        session['show_tour'] = True  # Enable tour guide for after welcome
        session.modified = True
        return redirect(url_for('welcome'))
    
    # Check if we should show tour guide
    if session.get('show_tour'):
        # Disable the tour guide flag for future visits
        session['show_tour'] = False
        session.modified = True
        return redirect(url_for('tour_guide'))
    
    # Show the main app page
    return render_template('index.html')




@app.route('/visualization')
def visualization():
    """Display the data visualization page"""
    return render_template('visualization.html')

@app.route('/chat')
def chat_interface():
    doc_id = request.args.get('doc_id')
    return render_template('chat.html', doc_id=doc_id)

@app.route('/api/document-suggestions')
def document_suggestions():
    """Get AI-powered suggestions for recently uploaded documents."""
    recent_documents = session.get('recent_documents', [])
    
    if not recent_documents:
        return jsonify({
            'has_suggestions': False,
            'message': "You haven't uploaded any documents yet.",
            'error': "No documents found. Please upload a document to get started with document insights!",
            'redirect_to_upload': True
        })
    
    # Get the most recent document
    doc_info = recent_documents[0]
    doc_id = doc_info.get('id')
    doc_type = doc_info.get('doc_type', 'general')
    filename = doc_info.get('filename', 'document')
    
    # Extract metadata if available
    metadata = {}
    try:
        if doc_info.get('meta_data'):
            metadata = json.loads(doc_info.get('meta_data'))
    except:
        app.logger.error(f"Error parsing document metadata for document {doc_id}")
    
    # Generate document-specific suggestions based on the type and metadata
    suggestions = []
    
    # Common suggestion for all document types
    suggestions.append({
        'text': f"Tell me about this {doc_type} document",
        'action': 'query',
        'query': f"Summarize the content of this {doc_type} '{filename}'"
    })
    
    if doc_type.lower() == 'invoice':
        # Invoice-specific suggestions
        if metadata.get('supplier'):
            suggestions.append({
                'text': f"Tell me about supplier {metadata.get('supplier')}",
                'action': 'query',
                'query': f"What information do we have about supplier {metadata.get('supplier')}?"
            })
        
        if metadata.get('invoice_number'):
            suggestions.append({
                'text': f"Check invoice {metadata.get('invoice_number')} status",
                'action': 'query',
                'query': f"What is the payment status of invoice {metadata.get('invoice_number')}?"
            })
        
        if metadata.get('due_date'):
            suggestions.append({
                'text': f"When is payment due?",
                'action': 'query',
                'query': f"When is the payment due for this invoice and how can I process it?"
            })
        
        if metadata.get('total_amount'):
            suggestions.append({
                'text': f"Verify amount {metadata.get('total_amount')}",
                'action': 'query',
                'query': f"Is the total amount of {metadata.get('total_amount')} correct based on the line items?"
            })
            
        suggestions.append({
            'text': "Compare with previous invoices",
            'action': 'query',
            'query': "How does this invoice compare with previous ones from the same supplier?"
        })
    
    elif doc_type.lower() == 'purchase_order':
        # Purchase order-specific suggestions
        if metadata.get('po_number'):
            suggestions.append({
                'text': f"Track PO {metadata.get('po_number')}",
                'action': 'query',
                'query': f"What is the current status of purchase order {metadata.get('po_number')}?"
            })
        
        if metadata.get('supplier'):
            suggestions.append({
                'text': f"Supplier delivery history",
                'action': 'query',
                'query': f"What is the on-time delivery history for {metadata.get('supplier')}?"
            })
        
        if metadata.get('delivery_date'):
            suggestions.append({
                'text': f"Check delivery timeline",
                'action': 'query',
                'query': f"Is the expected delivery date of {metadata.get('delivery_date')} realistic based on past performance?"
            })
        
        suggestions.append({
            'text': "Validate pricing",
            'action': 'query',
            'query': "Are the prices on this purchase order aligned with our negotiated rates?"
        })
        
        suggestions.append({
            'text': "Suggest alternatives",
            'action': 'query',
            'query': "Can you suggest alternative suppliers for the items in this purchase order?"
        })
    
    elif doc_type.lower() == 'shipping_document':
        # Shipping document-specific suggestions
        if metadata.get('tracking_number'):
            suggestions.append({
                'text': f"Track shipment {metadata.get('tracking_number')}",
                'action': 'query',
                'query': f"What is the current status of shipment {metadata.get('tracking_number')}?"
            })
        
        if metadata.get('carrier'):
            suggestions.append({
                'text': f"Carrier performance",
                'action': 'query',
                'query': f"How reliable is {metadata.get('carrier')} based on our shipping history?"
            })
        
        suggestions.append({
            'text': "Estimate arrival",
            'action': 'query',
            'query': "When will this shipment arrive and what should I prepare for receiving it?"
        })
        
        suggestions.append({
            'text': "Check for delays",
            'action': 'query',
            'query': "Are there any known delays that might affect this shipment?"
        })
    
    elif doc_type.lower() == 'inventory':
        # Inventory document-specific suggestions
        suggestions.append({
            'text': "Identify low stock items",
            'action': 'query',
            'query': "Which items in this inventory report are below our reorder threshold?"
        })
        
        suggestions.append({
            'text': "Excess inventory",
            'action': 'query',
            'query': "Which items have excess inventory that we should consider reducing?"
        })
        
        suggestions.append({
            'text': "Inventory valuation",
            'action': 'query',
            'query': "What is the total value of our current inventory based on this report?"
        })
        
        suggestions.append({
            'text': "Inventory turnover",
            'action': 'query',
            'query': "What is our inventory turnover rate for the top 10 items in this report?"
        })
    
    elif doc_type.lower() == 'supplier':
        # Supplier document-specific suggestions
        if metadata.get('supplier'):
            suggestions.append({
                'text': f"Performance of {metadata.get('supplier')}",
                'action': 'query',
                'query': f"What is the performance history of supplier {metadata.get('supplier')}?"
            })
        
        suggestions.append({
            'text': "Contact information",
            'action': 'query',
            'query': "What is the contact information for this supplier and who is our account manager?"
        })
        
        suggestions.append({
            'text': "Current contracts",
            'action': 'query',
            'query': "What contracts do we currently have with this supplier and when do they expire?"
        })
        
        suggestions.append({
            'text': "Payment terms",
            'action': 'query',
            'query': "What are the payment terms for this supplier and are we eligible for any discounts?"
        })
    
    # Limit to 5 suggestions maximum
    suggestions = suggestions[:5]
    
    # Get services recommendations
    services = get_supply_chain_services(doc_type)
    
    return jsonify({
        'has_suggestions': True,
        'document': {
            'id': doc_id,
            'type': doc_type,
            'filename': filename
        },
        'suggestions': suggestions,
        'message': f"I've analyzed your {doc_type} document. Would you like to:",
        'services': services
    })

@app.route('/api/document-history')
def document_history():
    """Get the user's document upload history."""
    try:
        # Retrieve recent documents from session
        recent_documents = session.get('recent_documents', [])
        
        if not recent_documents:
            return jsonify({
                'documents': [],
                'count': 0,
                'message': "No documents found in your history."
            })
        
        # Return the documents (already in JSON-compatible format)
        return jsonify({
            'documents': recent_documents,
            'count': len(recent_documents)
        })
    
    except Exception as e:
        app.logger.error(f"Error retrieving document history: {str(e)}")
        return jsonify({
            'documents': [],
            'count': 0,
            'error': str(e)
        })

@app.route('/api/services')
def get_services():
    """Get recommended supply chain services based on document type."""
    recent_documents = session.get('recent_documents', [])
    
    if not recent_documents:
        # Return generic services if no documents
        services = get_supply_chain_services('general')
    else:
        # Get the most recent document type
        doc_info = recent_documents[0]
        doc_type = doc_info.get('doc_type', 'general')
        services = get_supply_chain_services(doc_type)
    
    return jsonify({
        'services': services
    })

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part', 'danger')
            return redirect(request.url)
        
        file = request.files['file']
        
        # If user does not select file, browser submits an empty file
        if file.filename == '':
            flash('No selected file', 'danger')
            return redirect(request.url)
            
        if file and allowed_file(file.filename):
            try:
                # Save file temporarily
                with tempfile.NamedTemporaryFile(delete=False) as temp:
                    file.save(temp.name)
                    doc_type = request.form.get('doc_type', 'general')
                    # First extract text to detect document type
                    text_content = extract_text_from_file(temp.name)
                    
                    # If auto-detection is enabled, detect document type
                    detected_type = None
                    detection_score = 0
                    
                    if text_content:
                        try:
                            # Clean and preprocess text for detection
                            if isinstance(text_content, str):
                                # Try to extract text from JSON if it's a JSON string
                                if text_content.strip().startswith('{') and text_content.strip().endswith('}'):
                                    try:
                                        json_data = json.loads(text_content)
                                        if 'content' in json_data:
                                            text_for_detection = json_data.get('content', '')
                                        else:
                                            text_for_detection = json.dumps(json_data)
                                    except:
                                        text_for_detection = text_content
                                else:
                                    text_for_detection = text_content
                                
                                # Detect document type
                                detected_type, detection_score = detect_document_type(text_for_detection)
                                
                                # If detection confidence is high, use detected type
                                if detection_score > 10 and detected_type != 'general':
                                    doc_type = detected_type
                                    app.logger.info(f"Auto-detected document type: {doc_type} (score: {detection_score})")
                            
                        except Exception as e:
                            app.logger.error(f"Error during document type detection: {str(e)}")
                    
                    # Process the document and store it
                    doc_id = process_document(temp.name, file.filename, doc_type)
                    os.unlink(temp.name)  # Remove temp file
                
                # Store the document info in session for suggestions
                if 'recent_documents' not in session:
                    session['recent_documents'] = []
                
                # Get document details for better suggestions
                document = SupplyChainDocument.query.get(doc_id)
                
                # Parse metadata to check for detected type
                metadata = {}
                if document.meta_data:
                    try:
                        metadata = json.loads(document.meta_data)
                    except:
                        app.logger.error(f"Failed to parse metadata for document {doc_id}")
                
                # Add to the front of the list (most recent first)
                doc_info = {
                    'id': doc_id,
                    'filename': document.filename,
                    'doc_type': document.doc_type,
                    'detected_type': detected_type,
                    'detection_score': detection_score,
                    'upload_time': datetime.utcnow().isoformat(),
                    'meta_data': document.meta_data if document.meta_data else "{}"
                }
                
                # Remove the document if it already exists in the list to avoid duplicates
                session['recent_documents'] = [d for d in session.get('recent_documents', []) if d.get('id') != doc_id]
                
                # Add to the front of the list and keep only the 5 most recent documents
                session['recent_documents'].insert(0, doc_info)
                session['recent_documents'] = session['recent_documents'][:5]
                session.modified = True
                
                # Get service suggestions based on document type
                services = get_supply_chain_services(doc_type)
                
                # Add success flash message
                flash(f'Document "{document.filename}" uploaded and processed successfully! The AI assistant can now answer questions about it.', 'success')
                
                # Instead of redirecting directly to the chat interface, show the confirmation page
                return render_template('document_confirmation.html', document=document, metadata=metadata)
            except Exception as e:
                app.logger.error(f"Error processing document: {str(e)}")
                flash(f'Error processing document: {str(e)}', 'danger')
                return redirect(request.url)
        else:
            flash('File type not allowed. Supported formats: TXT, CSV, JSON, PNG, PDF', 'danger')
            return redirect(request.url)
            
    return render_template('data_upload.html')
    
def get_supply_chain_services(doc_type):
    """Get relevant supply chain services based on document type."""
    services = []
    
    # Base services for all document types
    common_services = [
        {
            'name': 'Document Analysis',
            'description': 'AI-powered document parsing and analysis',
            'icon': 'fas fa-search-plus'
        },
        {
            'name': 'Data Extraction',
            'description': 'Extract structured data from documents',
            'icon': 'fas fa-table'
        }
    ]
    
    # Document-specific services
    if doc_type == 'invoice':
        services = [
            {
                'name': 'Invoice Processing',
                'description': 'Automated invoice matching and approval',
                'icon': 'fas fa-file-invoice-dollar'
            },
            {
                'name': 'Payment Scheduling',
                'description': 'Optimize payment timing based on terms',
                'icon': 'fas fa-calendar-alt'
            },
            {
                'name': 'Spend Analysis',
                'description': 'Analyze spending patterns across suppliers',
                'icon': 'fas fa-chart-pie'
            }
        ]
    elif doc_type == 'purchase_order':
        services = [
            {
                'name': 'Order Tracking',
                'description': 'Real-time visibility of purchase orders',
                'icon': 'fas fa-truck'
            },
            {
                'name': 'Supplier Compliance',
                'description': 'Check supplier adherence to terms',
                'icon': 'fas fa-clipboard-check'
            },
            {
                'name': 'Demand Forecasting',
                'description': 'Predict future orders based on history',
                'icon': 'fas fa-chart-line'
            }
        ]
    elif doc_type == 'shipping_document':
        services = [
            {
                'name': 'Shipment Tracking',
                'description': 'Real-time visibility of in-transit goods',
                'icon': 'fas fa-shipping-fast'
            },
            {
                'name': 'Route Optimization',
                'description': 'Optimize delivery routes for efficiency',
                'icon': 'fas fa-map-marked-alt'
            },
            {
                'name': 'Carrier Performance',
                'description': 'Analyze carrier reliability and costs',
                'icon': 'fas fa-chart-bar'
            }
        ]
    elif doc_type == 'inventory':
        services = [
            {
                'name': 'Stock Optimization',
                'description': 'Right-size inventory levels',
                'icon': 'fas fa-boxes'
            },
            {
                'name': 'Reorder Planning',
                'description': 'Smart replenishment recommendations',
                'icon': 'fas fa-shopping-cart'
            },
            {
                'name': 'Warehouse Analytics',
                'description': 'Optimize warehouse operations',
                'icon': 'fas fa-warehouse'
            }
        ]
    elif doc_type == 'supplier':
        services = [
            {
                'name': 'Supplier Performance',
                'description': 'Track and rate supplier performance',
                'icon': 'fas fa-award'
            },
            {
                'name': 'Risk Assessment',
                'description': 'Identify supply chain risks',
                'icon': 'fas fa-exclamation-triangle'
            },
            {
                'name': 'Contract Management',
                'description': 'Track supplier contracts and renewals',
                'icon': 'fas fa-file-signature'
            }
        ]
    else:  # general or others
        services = [
            {
                'name': 'Document Classification',
                'description': 'Categorize documents automatically',
                'icon': 'fas fa-tags'
            },
            {
                'name': 'Information Extraction',
                'description': 'Extract key supply chain data points',
                'icon': 'fas fa-filter'
            },
            {
                'name': 'Trend Analysis',
                'description': 'Identify patterns in supply chain data',
                'icon': 'fas fa-chart-line'
            }
        ]
    
    # Add common services to the specific ones
    return services + common_services

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({'error': 'No message provided'}), 400
    
    user_message = data['message']
    session_id = data.get('session_id')
    
    # Create a new session if one doesn't exist
    if not session_id:
        chat_session = ChatSession()
        db.session.add(chat_session)
        db.session.commit()
        session_id = chat_session.id
    else:
        chat_session = ChatSession.query.get(session_id)
        if not chat_session:
            return jsonify({'error': 'Invalid session ID'}), 400
    
    # Save user message
    user_chat_message = ChatMessage(
        session_id=session_id,
        is_user=True,
        message=user_message
    )
    db.session.add(user_chat_message)
    
    # Process the message using NLP
    try:
        response = nlp_processor.process_query(user_message)  # Use the process_query function
        
        # Save bot response
        bot_chat_message = ChatMessage(
            session_id=session_id,
            is_user=False,
            message=response
        )
        db.session.add(bot_chat_message)
        db.session.commit()
        
        return jsonify({
            'response': response,
            'session_id': session_id
        })
    except Exception as e:
        app.logger.error(f"Error processing query: {str(e)}")
        return jsonify({'error': f'Error processing query: {str(e)}'}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
