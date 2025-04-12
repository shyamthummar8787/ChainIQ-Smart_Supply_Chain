import logging
import json
import re
import vector_store
from models import SupplyChainDocument
from app import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dictionary of supply chain related entities and keywords
SUPPLY_CHAIN_ENTITIES = {
    "ORDER_STATUS": ["status", "order", "tracking", "delivery", "shipment", "ETA"],
    "INVENTORY": ["stock", "inventory", "availability", "quantity", "on hand", "in stock"],
    "SUPPLIER": ["supplier", "vendor", "manufacturer", "distributor", "partner"],
    "PRODUCT": ["product", "item", "SKU", "part", "material", "component"],
    "LOGISTICS": ["shipping", "transport", "freight", "carrier", "logistics", "warehouse"],
    "ISSUES": ["problem", "delay", "shortage", "backorder", "issue", "complaint", "late"]
}

# Supply chain intent classification patterns
INTENTS = {
    "CHECK_ORDER_STATUS": ["where is my order", "order status", "track delivery", "when will it arrive"],
    "CHECK_INVENTORY": ["availability", "in stock", "inventory level", "how many", "quantity available"],
    "SUPPLIER_INFO": ["supplier details", "vendor information", "who supplies", "manufacturer details"],
    "PRODUCT_INFO": ["product specifications", "item details", "tell me about product", "product features"],
    "REPORT_ISSUE": ["problem with", "issue with", "delay in", "complaint about", "not received"],
    "GENERAL_QUERY": ["help", "support", "information", "question", "query", "how to", "what is"]
}

def identify_entities(text):
    """Identify supply chain specific entities in the text using pattern matching."""
    entities = {}
    
    # Custom supply chain entity matching
    for entity_type, keywords in SUPPLY_CHAIN_ENTITIES.items():
        for keyword in keywords:
            if keyword.lower() in text.lower():
                if entity_type not in entities:
                    entities[entity_type] = []
                if keyword not in entities[entity_type]:
                    entities[entity_type].append(keyword)
    
    return entities

def classify_intent(text):
    """Classify the intent of the user query."""
    text_lower = text.lower()
    scores = {}
    
    # Score each intent based on keyword matches
    for intent, patterns in INTENTS.items():
        score = 0
        for pattern in patterns:
            if pattern.lower() in text_lower:
                score += 1
        scores[intent] = score
    
    # Get the intent with the highest score
    max_score = max(scores.values())
    if max_score == 0:
        return "GENERAL_QUERY"  # Default intent
    
    # Get all intents with the max score
    top_intents = [intent for intent, score in scores.items() if score == max_score]
    if len(top_intents) == 1:
        return top_intents[0]
    else:
        # If tie, prioritize certain intents
        priority_order = ["CHECK_ORDER_STATUS", "REPORT_ISSUE", "CHECK_INVENTORY", 
                        "PRODUCT_INFO", "SUPPLIER_INFO", "GENERAL_QUERY"]
        for priority in priority_order:
            if priority in top_intents:
                return priority
    
    return "GENERAL_QUERY"  # Fallback

def analyze_sentiment(text):
    """Simple sentiment analysis based on keywords."""
    positive_words = ["good", "great", "excellent", "thank", "appreciate", "helpful", "satisfied", "happy"]
    negative_words = ["bad", "poor", "terrible", "issue", "problem", "complaint", "unhappy", "dissatisfied", "not working"]
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        return {"label": "POSITIVE", "score": 0.8}
    elif negative_count > positive_count:
        return {"label": "NEGATIVE", "score": 0.8}
    else:
        return {"label": "NEUTRAL", "score": 0.5}

def get_relevant_documents(query, intent, entities):
    """Retrieve relevant supply chain documents based on the query."""
    # Search the vector store for related content
    search_results = vector_store.search(query, top_k=3)
    
    # If no results from vector search, try direct document lookup
    if not search_results and entities:
        # Try to find documents based on entity matches
        for entity_type, values in entities.items():
            if entity_type in ["PRODUCT", "ORDER_STATUS", "SUPPLIER"]:
                for value in values:
                    # Search for documents with this entity value in content
                    docs = SupplyChainDocument.query.filter(
                        SupplyChainDocument.content.ilike(f"%{value}%")
                    ).limit(3).all()
                    
                    if docs:
                        search_results = [{
                            'document_id': doc.id,
                            'text': doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                            'document_type': doc.doc_type,
                            'filename': doc.filename,
                            'score': 0.7  # Arbitrary score for direct lookups
                        } for doc in docs]
                        break
            
            if search_results:
                break
    
    return search_results

def generate_response(query, intent, entities, documents):
    """Generate a response based on the intent, entities, and retrieved documents."""
    
    # Check if this is a document-specific query
    is_document_query = any(term in query.lower() for term in [
        "document", "invoice", "purchase order", "po", "uploaded", "file", "pdf", 
        "excel", "sheet", "report", "just uploaded", "this document", "the document"
    ])
    
    # Check if we have any relevant documents
    if not documents:
        # Handle case with no relevant documents
        if is_document_query:
            return "I couldn't find any relevant documents. Please upload your supply chain documents so I can help you analyze them."
        
        if intent == "CHECK_ORDER_STATUS":
            return "I couldn't find specific information about your order. Please provide an order number or more details, and I'll try to help you."
        
        elif intent == "CHECK_INVENTORY":
            if "PRODUCT" in entities:
                return f"I don't have current inventory information for {', '.join(entities['PRODUCT'])}. Would you like me to check with our inventory team?"
            else:
                return "To check inventory, please specify the product you're interested in."
        
        elif intent == "SUPPLIER_INFO":
            if "SUPPLIER" in entities:
                return f"I don't have detailed information about {', '.join(entities['SUPPLIER'])}. Would you like me to connect you with our supplier management team?"
            else:
                return "Which supplier would you like information about?"
        
        elif intent == "REPORT_ISSUE":
            return "I understand you're experiencing an issue. Could you provide more details so I can route your concern to the appropriate team?"
        
        else:  # GENERAL_QUERY or PRODUCT_INFO or other
            return "I don't have enough information to answer your query. Could you please provide more specific details?"
    
    # If document query with results, prioritize document-specific response
    if is_document_query:
        # Identify the most relevant document (should be first in the list from our process_query function)
        primary_doc = documents[0]
        doc_type = primary_doc.get("document_type", "general")
        filename = primary_doc.get("filename", "document")
        
        # Customize response based on document type
        if "invoice" in doc_type.lower():
            response = f"Based on the invoice '{filename}', here's what I found:\n\n"
            # Look for key invoice data in the text content
            invoice_content = primary_doc["text"]
            
            # Extract some potential key details to highlight
            invoice_highlights = []
            if "total" in invoice_content.lower() or "amount" in invoice_content.lower():
                invoice_highlights.append("The invoice contains price and total amount information")
            if "date" in invoice_content.lower():
                invoice_highlights.append("The invoice has date information")
            if "item" in invoice_content.lower() or "product" in invoice_content.lower():
                invoice_highlights.append("The invoice contains line items or products")
                
            # Add the highlights
            if invoice_highlights:
                response += "Key points from this invoice:\n"
                for highlight in invoice_highlights:
                    response += f"• {highlight}\n"
                response += "\n"
            
            # Add the actual document content
            response += f"Here's an excerpt from the invoice:\n\n{invoice_content}\n\n"
            response += "You can ask me specific questions about this invoice such as 'What's the total amount?' or 'Who is the supplier?'"
            
            return response
            
        elif "purchase" in doc_type.lower() or "order" in doc_type.lower() or "po" == doc_type.lower():
            response = f"Based on the purchase order '{filename}', here's what I found:\n\n"
            # Look for key PO data in the text content
            po_content = primary_doc["text"]
            
            # Extract some potential key details to highlight
            po_highlights = []
            if "total" in po_content.lower() or "amount" in po_content.lower():
                po_highlights.append("The PO contains price and total order value information")
            if "date" in po_content.lower() or "delivery" in po_content.lower():
                po_highlights.append("The PO has date or delivery information")
            if "item" in po_content.lower() or "product" in po_content.lower():
                po_highlights.append("The PO contains ordered items or products")
                
            # Add the highlights
            if po_highlights:
                response += "Key points from this purchase order:\n"
                for highlight in po_highlights:
                    response += f"• {highlight}\n"
                response += "\n"
            
            # Add the actual document content
            response += f"Here's an excerpt from the purchase order:\n\n{po_content}\n\n"
            response += "You can ask me specific questions about this PO such as 'What items are ordered?' or 'When is the delivery date?'"
            
            return response
        
        else:
            # Generic document handling
            response = f"Based on the document '{filename}', here's what I found:\n\n"
            response += primary_doc["text"]
            response += "\n\nYou can ask me specific questions about this document for more detailed information."
            return response
    
    # Handle non-document-specific queries with relevant documents
    if intent == "CHECK_ORDER_STATUS":
        # Extract the most relevant information from documents
        order_info = []
        for doc in documents:
            if "order" in doc["text"].lower() or "delivery" in doc["text"].lower():
                order_info.append(doc["text"])
        
        if order_info:
            response = "Here's what I found about your order:\n\n"
            response += "\n\n".join(order_info[:2])  # Limit to first 2 results
            return response
        else:
            return "I found some information but couldn't identify specific order status details. Please provide an order number for more accurate information."
    
    elif intent == "CHECK_INVENTORY":
        inventory_info = []
        for doc in documents:
            if "inventory" in doc["text"].lower() or "stock" in doc["text"].lower() or "quantity" in doc["text"].lower():
                inventory_info.append(doc["text"])
        
        if inventory_info:
            response = "Here's the inventory information I found:\n\n"
            response += "\n\n".join(inventory_info[:2])
            return response
        else:
            if "PRODUCT" in entities:
                product_names = ", ".join(entities["PRODUCT"])
                return f"I found some information related to {product_names}, but no specific inventory details. Would you like me to check with our inventory team?"
            else:
                return "I found some related information, but no specific inventory details. Can you specify which product you're interested in?"
    
    elif intent == "SUPPLIER_INFO":
        supplier_info = []
        for doc in documents:
            if "supplier" in doc["text"].lower() or "vendor" in doc["text"].lower() or "manufacturer" in doc["text"].lower():
                supplier_info.append(doc["text"])
        
        if supplier_info:
            response = "Here's what I found about the supplier:\n\n"
            response += "\n\n".join(supplier_info[:2])
            return response
        else:
            return "I found some related information, but no specific supplier details. Can you provide the supplier name you're looking for?"
    
    elif intent == "PRODUCT_INFO":
        product_info = []
        for doc in documents:
            if "PRODUCT" in entities:
                for product in entities["PRODUCT"]:
                    if product.lower() in doc["text"].lower():
                        product_info.append(doc["text"])
                        break
            else:
                if "product" in doc["text"].lower() or "item" in doc["text"].lower():
                    product_info.append(doc["text"])
        
        if product_info:
            response = "Here's what I found about the product:\n\n"
            response += "\n\n".join(product_info[:2])
            return response
        else:
            return "I found some information but couldn't identify specific product details. Can you specify which product features you're interested in?"
    
    elif intent == "REPORT_ISSUE":
        # For issues, we just acknowledge and provide the most relevant information
        response = "I understand you're reporting an issue. Here's what I found that might be relevant:\n\n"
        response += documents[0]["text"]
        response += "\n\nWould you like me to escalate this issue to our support team?"
        return response
    
    else:  # GENERAL_QUERY or other
        # For general queries, provide the most relevant document
        response = "Here's what I found related to your query:\n\n"
        response += documents[0]["text"]
        
        if len(documents) > 1:
            response += "\n\nI have additional information if needed. Would you like to know more?"
        
        return response

def generate_document_insights(document_id):
    """Generate AI-powered insights for a specific document.
    
    Args:
        document_id: The ID of the document to analyze
        
    Returns:
        Dictionary with insights about the document
    """
    try:
        # Retrieve the document
        document = SupplyChainDocument.query.get(document_id)
        if not document:
            logger.error(f"Document not found with ID: {document_id}")
            return {"error": "Document not found"}
        
        # Extract document metadata
        metadata = {}
        if document.meta_data:
            try:
                metadata = json.loads(document.meta_data)
            except:
                logger.error(f"Failed to parse document metadata: {document.meta_data}")
        
        # Document type-specific insights
        if document.doc_type == "invoice":
            return generate_invoice_insights(document, metadata)
        elif document.doc_type == "purchase_order":
            return generate_po_insights(document, metadata)
        else:
            return generate_generic_document_insights(document, metadata)
    
    except Exception as e:
        logger.error(f"Error generating document insights: {str(e)}")
        return {"error": f"Failed to generate insights: {str(e)}"}

def generate_invoice_insights(document, metadata):
    """Generate insights specific to invoice documents."""
    insights = {
        "document_type": "Invoice",
        "document_id": document.id,
        "filename": document.filename,
        "summary": "This is an invoice document",
        "key_points": [],
        "key_metrics": [],
        "risks": [],
        "recommendations": []
    }
    
    # Extract invoice number
    invoice_number = metadata.get("invoice_number", "Not found")
    insights["invoice_number"] = invoice_number
    
    # Extract date
    invoice_date = metadata.get("date", "Not found")
    insights["date"] = invoice_date
    
    # Extract total amount
    total_amount = metadata.get("total_amount", "Not found")
    insights["total_amount"] = total_amount
    
    # Generate key points
    insights["key_points"] = [
        f"Invoice #{invoice_number} dated {invoice_date}",
        f"Total amount: {total_amount}"
    ]
    
    # Add supplier information if available
    if "supplier" in metadata:
        insights["key_points"].append(f"Supplier: {metadata['supplier']}")
    
    # Extract line items if available
    if "line_items" in metadata and isinstance(metadata["line_items"], list):
        item_count = len(metadata["line_items"])
        insights["key_points"].append(f"Contains {item_count} line items")
        
        # Calculate total items and average price
        total_items = sum(item.get("quantity", 0) for item in metadata["line_items"] if "quantity" in item)
        insights["key_metrics"].append(f"Total items: {total_items}")
        
        if item_count > 0 and total_amount != "Not found" and total_amount.replace("$", "").replace(",", "").isdigit():
            try:
                avg_price = float(total_amount.replace("$", "").replace(",", "")) / item_count
                insights["key_metrics"].append(f"Average price per line item: ${avg_price:.2f}")
            except:
                pass
    
    # Generate risk assessment
    if "due_date" in metadata:
        insights["key_points"].append(f"Due date: {metadata['due_date']}")
    
    # Generate recommendations
    insights["recommendations"].append("Review line items for accuracy")
    insights["recommendations"].append("Verify payment terms and due date")
    
    return insights

def generate_po_insights(document, metadata):
    """Generate insights specific to purchase order documents."""
    insights = {
        "document_type": "Purchase Order",
        "document_id": document.id,
        "filename": document.filename,
        "summary": "This is a purchase order document",
        "key_points": [],
        "key_metrics": [],
        "risks": [],
        "recommendations": []
    }
    
    # Extract PO number
    po_number = metadata.get("po_number", "Not found")
    insights["po_number"] = po_number
    
    # Extract date
    po_date = metadata.get("date", "Not found")
    insights["date"] = po_date
    
    # Extract total amount
    total_amount = metadata.get("total_amount", "Not found")
    insights["total_amount"] = total_amount
    
    # Generate key points
    insights["key_points"] = [
        f"Purchase Order #{po_number} dated {po_date}",
        f"Total order value: {total_amount}"
    ]
    
    # Add supplier information if available
    if "supplier" in metadata:
        insights["key_points"].append(f"Supplier: {metadata['supplier']}")
    
    # Extract line items if available
    if "line_items" in metadata and isinstance(metadata["line_items"], list):
        item_count = len(metadata["line_items"])
        insights["key_points"].append(f"Ordering {item_count} different products")
        
        # Calculate total items and identify top items
        total_items = sum(item.get("quantity", 0) for item in metadata["line_items"] if "quantity" in item)
        insights["key_metrics"].append(f"Total quantity ordered: {total_items} units")
        
        # Identify highest value items
        if item_count > 0 and any("price" in item for item in metadata["line_items"]):
            try:
                highest_value_item = max(
                    [item for item in metadata["line_items"] if "price" in item and "name" in item], 
                    key=lambda x: float(str(x["price"]).replace("$", "").replace(",", ""))
                )
                insights["key_points"].append(
                    f"Highest value item: {highest_value_item.get('name', 'Unknown')} at {highest_value_item.get('price', 'Unknown')}"
                )
            except:
                pass
    
    # Generate delivery expectations if available
    if "delivery_date" in metadata:
        insights["key_points"].append(f"Expected delivery: {metadata['delivery_date']}")
    
    # Generate recommendations
    insights["recommendations"].append("Confirm receipt with supplier")
    insights["recommendations"].append("Schedule inventory space for delivery")
    
    return insights

def generate_generic_document_insights(document, metadata):
    """Generate insights for generic documents."""
    insights = {
        "document_type": document.doc_type.capitalize(),
        "document_id": document.id,
        "filename": document.filename,
        "summary": f"This is a {document.doc_type} document",
        "key_points": [],
        "key_metrics": [],
        "risks": [],
        "recommendations": []
    }
    
    # Count total words
    word_count = len(document.content.split())
    insights["key_metrics"].append(f"Document contains approximately {word_count} words")
    
    # Extract key entities
    text = document.content.lower()
    
    # Check for products mentioned
    products = []
    for keyword in SUPPLY_CHAIN_ENTITIES["PRODUCT"]:
        if keyword.lower() in text:
            pattern = r'\b' + re.escape(keyword.lower()) + r'\s+([a-zA-Z0-9-]+)'
            matches = re.findall(pattern, text)
            products.extend(matches)
    
    if products:
        unique_products = list(set(products))[:3]  # Limit to 3 unique products
        insights["key_points"].append(f"Mentions products: {', '.join(unique_products)}")
    
    # Check for suppliers mentioned
    suppliers = []
    for keyword in SUPPLY_CHAIN_ENTITIES["SUPPLIER"]:
        if keyword.lower() in text:
            pattern = r'\b' + re.escape(keyword.lower()) + r'\s+([a-zA-Z0-9-]+)'
            matches = re.findall(pattern, text)
            suppliers.extend(matches)
    
    if suppliers:
        unique_suppliers = list(set(suppliers))[:3]  # Limit to 3 unique suppliers
        insights["key_points"].append(f"Mentions suppliers: {', '.join(unique_suppliers)}")
    
    # Generate recommendations
    insights["recommendations"].append("Review document for missing information")
    insights["recommendations"].append("Consider classifying this document for better analytics")
    
    return insights

def process_query(user_query):
    """Process the user query and generate a response."""
    try:
        # Step 1: Extract entities
        entities = identify_entities(user_query)
        logger.debug(f"Identified entities: {entities}")
        
        # Step 2: Classify intent
        intent = classify_intent(user_query)
        logger.debug(f"Classified intent: {intent}")
        
        # Step 3: Analyze sentiment (optional for now)
        sentiment = analyze_sentiment(user_query)
        logger.debug(f"Sentiment analysis: {sentiment}")
        
        # Step 4: Check if this is a document-related query
        is_document_query = False
        doc_terms = ["document", "invoice", "purchase order", "po", "uploaded", "file", "pdf", "excel", "sheet", "report"]
        
        # Check if the query refers to a recently uploaded document
        if any(term in user_query.lower() for term in doc_terms):
            is_document_query = True
            logger.debug("Detected document-related query")
        
        # If it's a document query, prioritize getting the most recent document
        target_doc = None
        if is_document_query:
            # Find the most recently uploaded document
            target_doc = SupplyChainDocument.query.order_by(SupplyChainDocument.created_at.desc()).first()
            logger.debug(f"Found recent document: {target_doc.filename if target_doc else 'None'}")
            
            # If we find a document, prioritize its content in searches
            if target_doc and target_doc.content:
                # Add the document as a primary search result
                extra_doc = {
                    'document_id': target_doc.id,
                    'text': target_doc.content[:500] + "..." if len(target_doc.content) > 500 else target_doc.content,
                    'document_type': target_doc.doc_type,
                    'filename': target_doc.filename,
                    'score': 0.95  # High score for the targeted document
                }
                
                # Still get other relevant documents as context
                other_docs = get_relevant_documents(user_query, intent, entities)
                documents = [extra_doc] + other_docs
                logger.debug(f"Added recent document to search results, total: {len(documents)}")
            else:
                # Standard search if no document found
                documents = get_relevant_documents(user_query, intent, entities)
                logger.debug(f"Retrieved {len(documents)} relevant documents")
        else:
            # Standard search for non-document queries
            documents = get_relevant_documents(user_query, intent, entities)
            logger.debug(f"Retrieved {len(documents)} relevant documents")
        
        # Check if request is for document insights
        if ("insight" in user_query.lower() or "summary" in user_query.lower() or "analyze" in user_query.lower()) and \
           any(term in user_query.lower() for term in doc_terms):
            # Use the target document we already found or find one if we haven't yet
            recent_doc = target_doc or SupplyChainDocument.query.order_by(SupplyChainDocument.created_at.desc()).first()
            
            if recent_doc:
                insights = generate_document_insights(recent_doc.id)
                if "error" in insights:
                    return f"I tried to generate insights for your document, but encountered an error: {insights['error']}"
                
                # Format insights as a response
                response = f"# AI Insights for {insights['document_type']}: {insights['filename']}\n\n"
                
                # Add key information based on document type
                if insights['document_type'] == "Invoice":
                    response += f"**Invoice Number:** {insights.get('invoice_number', 'Not found')}\n"
                    response += f"**Date:** {insights.get('date', 'Not found')}\n"
                    response += f"**Total Amount:** {insights.get('total_amount', 'Not found')}\n\n"
                elif insights['document_type'] == "Purchase Order":
                    response += f"**PO Number:** {insights.get('po_number', 'Not found')}\n"
                    response += f"**Date:** {insights.get('date', 'Not found')}\n"
                    response += f"**Total Amount:** {insights.get('total_amount', 'Not found')}\n\n"
                
                # Add key points
                if insights['key_points']:
                    response += "## Key Points\n"
                    for point in insights['key_points']:
                        response += f"- {point}\n"
                    response += "\n"
                
                # Add key metrics
                if insights['key_metrics']:
                    response += "## Key Metrics\n"
                    for metric in insights['key_metrics']:
                        response += f"- {metric}\n"
                    response += "\n"
                
                # Add recommendations
                if insights['recommendations']:
                    response += "## Recommendations\n"
                    for rec in insights['recommendations']:
                        response += f"- {rec}\n"
                    response += "\n"
                
                return response
            else:
                return "I couldn't find any uploaded documents to analyze. Please upload a document first."
        
        # Step 5: Generate response (if not insights request)
        response = generate_response(user_query, intent, entities, documents)
        
        # Add debug info for development if needed
        debug_info = {
            "intent": intent,
            "entities": entities,
            "sentiment": sentiment,
            "doc_count": len(documents)
        }
        
        logger.debug(f"Generated response with debug info: {debug_info}")
        
        return response
    
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return "I'm sorry, I encountered an error while processing your query. Please try again or contact support if the issue persists."
