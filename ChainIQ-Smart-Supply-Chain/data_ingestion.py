import os
import logging
import json
import re
import os.path
from models import SupplyChainDocument
from app import db
import vector_store
import aws_utils
import PyPDF2

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
ALLOWED_EXTENSIONS = {'txt', 'csv', 'json', 'png', 'pdf'}
CHUNK_SIZE = 1000  # Characters per chunk, adjust as needed

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(file_path):
    """Extract text content from different file types."""
    # Check if file has an extension
    if '.' in file_path:
        file_extension = file_path.rsplit('.', 1)[1].lower()
    else:
        # Default to txt if no extension found
        file_extension = 'txt'
    
    if file_extension == 'txt':
        try:
            # Try UTF-8 first
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                # If UTF-8 fails, try with latin-1 (which can read any byte sequence)
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading text file with latin-1 encoding: {str(e)}")
                # As a last resort, read as binary and convert
                with open(file_path, 'rb') as f:
                    binary_data = f.read()
                    # Try to decode with different encodings
                    for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
                        try:
                            return binary_data.decode(encoding, errors='replace')
                        except Exception:
                            continue
                    # If all else fails, use latin-1 with replace
                    return binary_data.decode('latin-1', errors='replace')
    
    elif file_extension == 'csv':
        try:
            import csv
            content = []
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                headers = next(reader)  # Get header row
                for row in reader:
                    row_data = dict(zip(headers, row))
                    content.append(row_data)
            return json.dumps(content)
        except Exception as e:
            logger.error(f"Error processing CSV file: {str(e)}")
            return None
    
    elif file_extension == 'json':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error processing JSON file: {str(e)}")
            return None
    
    elif file_extension == 'png':
        try:
            # For PNG files, we can't extract text directly
            # Instead, we'll store metadata about the image
            import os
            file_stats = os.stat(file_path)
            image_info = {
                "filename": os.path.basename(file_path),
                "size_bytes": file_stats.st_size,
                "last_modified": file_stats.st_mtime,
                "content_type": "image/png",
                "description": "PNG image document"
            }
            return json.dumps(image_info)
        except Exception as e:
            logger.error(f"Error processing PNG file: {str(e)}")
            return None
            
    elif file_extension == 'pdf':
        try:
            # Extract text from PDF using PyPDF2
            
            # Dictionary to store structured content
            pdf_content = {
                "title": os.path.basename(file_path),
                "content": "",
                "metadata": {},
                "pages": [],
                "content_type": "application/pdf"
            }
            
            # Important: Open PDF in binary mode ('rb')
            with open(file_path, 'rb') as pdf_file:
                # Create a PDF reader object
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                
                # Get the number of pages in the PDF
                num_pages = len(pdf_reader.pages)
                logger.info(f"Processing PDF with {num_pages} pages")
                
                # Extract text from each page
                for page_num in range(num_pages):
                    page = pdf_reader.pages[page_num]
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            # Clean up the text (remove excessive whitespace, etc.)
                            page_text = re.sub(r'\s+', ' ', page_text).strip()
                            
                            # Add to overall content
                            pdf_content["content"] += page_text + "\n\n"
                            
                            # Add to page-specific content
                            pdf_content["pages"].append({
                                "page_number": page_num + 1,
                                "content": page_text
                            })
                        else:
                            # If page extraction fails, record empty page
                            pdf_content["pages"].append({
                                "page_number": page_num + 1,
                                "content": "[No text content could be extracted from this page]"
                            })
                    except Exception as page_error:
                        logger.warning(f"Error extracting text from page {page_num}: {str(page_error)}")
                        pdf_content["pages"].append({
                            "page_number": page_num + 1,
                            "content": f"[Error extracting text: {str(page_error)}]"
                        })
                
                # Extract metadata if available
                if hasattr(pdf_reader, 'metadata') and pdf_reader.metadata:
                    for key, value in pdf_reader.metadata.items():
                        if value and isinstance(key, str):
                            clean_key = key[1:] if key.startswith("/") else key
                            pdf_content["metadata"][clean_key] = str(value)
                    
                    # Set title from metadata if available
                    if "Title" in pdf_content["metadata"] and pdf_content["metadata"]["Title"]:
                        pdf_content["title"] = pdf_content["metadata"]["Title"]
                
                # If successful extraction, return the structured content
                if pdf_content["content"].strip():
                    logger.info(f"Successfully extracted {len(pdf_content['content'])} characters from PDF")
                    # Return the full structured content as text for vector storage
                    # but in a more human-readable format
                    result = f"Document Title: {pdf_content['title']}\n\n"
                    
                    # Add metadata summary
                    if pdf_content["metadata"]:
                        result += "Document Information:\n"
                        for key, value in pdf_content["metadata"].items():
                            if key in ["Author", "Title", "Subject", "Creator", "Producer", "CreationDate", "ModDate"]:
                                result += f"- {key}: {value}\n"
                        result += "\n"
                    
                    # Add content
                    result += "Document Content:\n\n"
                    result += pdf_content["content"]
                    
                    return result
                else:
                    # No text could be extracted, return structured JSON with metadata
                    logger.warning("No text content could be extracted from the PDF")
                    
                    import os
                    file_stats = os.stat(file_path)
                    
                    fallback_result = f"Document Title: {pdf_content['title']}\n\n"
                    fallback_result += "Document Information:\n"
                    
                    # Add available metadata
                    if pdf_content["metadata"]:
                        for key, value in pdf_content["metadata"].items():
                            fallback_result += f"- {key}: {value}\n"
                    
                    fallback_result += f"- File Size: {file_stats.st_size} bytes\n"
                    fallback_result += f"- Pages: {num_pages}\n\n"
                    fallback_result += "Note: No readable text content could be extracted from this PDF. "
                    fallback_result += "The document may be scanned or contain only images."
                    
                    return fallback_result
                
        except Exception as e:
            logger.error(f"Error processing PDF file: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Return a more informative message for failed PDFs
            try:
                import os
                filename = os.path.basename(file_path)
                return f"Document: {filename}\n\nThis appears to be a PDF file, but I was unable to extract its contents properly. The document might be encrypted, damaged, or use a format that's not fully supported. If you have specific questions about this document, please try to summarize its contents manually."
            except:
                return "Unable to process the PDF document. The file might be damaged or in an unsupported format."
    
    else:
        logger.error(f"Unsupported file type: {file_extension}")
        return None

def detect_document_type(text):
    """Detect document type based on content analysis."""
    text_lower = text.lower()
    scores = {
        'invoice': 0,
        'purchase_order': 0,
        'shipping_document': 0,
        'inventory': 0,
        'supplier': 0,
        'product': 0,
        'general': 0
    }
    
    # Invoice indicators
    invoice_indicators = ['invoice', 'bill', 'payment', 'due date', 'invoice number', 'bill to', 'payment terms', 
                         'invoice date', 'tax', 'subtotal', 'amount due', 'invoice total', 'billing']
    for indicator in invoice_indicators:
        if indicator in text_lower:
            scores['invoice'] += 2
    
    # Purchase order indicators
    po_indicators = ['purchase order', 'po number', 'order date', 'delivery date', 'purchaser', 'buyer', 
                    'order number', 'requisition', 'ordered by', 'ship to', 'delivery address']
    for indicator in po_indicators:
        if indicator in text_lower:
            scores['purchase_order'] += 2
    
    # Shipping document indicators
    shipping_indicators = ['shipping', 'tracking', 'shipment', 'bill of lading', 'carrier', 'consignee', 
                          'consignor', 'freight', 'origin', 'destination', 'delivery', 'shipped', 'packing list']
    for indicator in shipping_indicators:
        if indicator in text_lower:
            scores['shipping_document'] += 2
    
    # Inventory indicators
    inventory_indicators = ['inventory', 'stock', 'quantity', 'on hand', 'warehouse', 'storage', 'location', 
                           'sku', 'stock level', 'reorder', 'available', 'balance', 'count']
    for indicator in inventory_indicators:
        if indicator in text_lower:
            scores['inventory'] += 2
    
    # Supplier indicators
    supplier_indicators = ['supplier', 'vendor', 'manufacturer', 'producer', 'distributor', 'partner', 
                          'supply', 'sourcing', 'producer', 'factory', 'contractor']
    for indicator in supplier_indicators:
        if indicator in text_lower:
            scores['supplier'] += 2
    
    # Product indicators
    product_indicators = ['product', 'catalog', 'specification', 'item', 'description', 'feature', 
                         'dimension', 'weight', 'tech spec', 'material', 'configuration']
    for indicator in product_indicators:
        if indicator in text_lower:
            scores['product'] += 2
    
    # Advanced pattern matching
    if re.search(r'(?i)invoice\s*(?:#|number|num|no)?[:.\s]*([A-Z0-9\-]+)', text):
        scores['invoice'] += 5
    
    if re.search(r'(?i)(?:purchase\s*order|po)\s*(?:#|number|num|no)?[:.\s]*([A-Z0-9\-]+)', text):
        scores['purchase_order'] += 5
    
    if re.search(r'(?i)(?:tracking|shipment)\s*(?:#|number|num|no)?[:.\s]*([A-Z0-9\-]+)', text):
        scores['shipping_document'] += 5
    
    if re.search(r'(?i)(?:inventory|stock)\s*(?:report|level|status|summary)', text):
        scores['inventory'] += 5
    
    if re.search(r'(?i)(?:supplier|vendor)\s*(?:profile|information|details|data)', text):
        scores['supplier'] += 5
    
    if re.search(r'(?i)(?:product|item)\s*(?:catalog|specification|detail|description)', text):
        scores['product'] += 5
    
    # Check for structural patterns
    if re.search(r'(?i)(?:total|amount|sum)[:.\s]*[$€£]?\s*(\d+[,\d]*\.\d+|\d+[,\d]*)', text):
        scores['invoice'] += 3
    
    if re.search(r'(?i)qty|quantity|units', text) and re.search(r'(?i)price|cost|rate', text):
        scores['invoice'] += 2
        scores['purchase_order'] += 2
    
    # Give some weight to the general category as fallback
    scores['general'] = 1
    
    # Find the document type with the highest score
    max_score = 0
    detected_type = 'general'
    
    for doc_type, score in scores.items():
        if score > max_score:
            max_score = score
            detected_type = doc_type
    
    # If the score is too low, default to general
    if max_score < 3:
        detected_type = 'general'
    
    # Log the detection result and confidence
    logger.info(f"Document type detection: {detected_type} (score: {max_score})")
    
    return detected_type, max_score

def extract_metadata(text, doc_type):
    """Extract metadata from document content based on type."""
    metadata = {
        'type': doc_type
    }
    
    # Add detected document type
    detected_type, confidence_score = detect_document_type(text)
    metadata['detected_type'] = detected_type
    metadata['detection_confidence'] = 'high' if confidence_score > 10 else 'medium' if confidence_score > 5 else 'low'
    metadata['auto_detection_score'] = confidence_score
    
    # Extract different entities based on document type
    if doc_type.lower() == 'invoice':
        # Extract invoice number (typically prefixed with 'INV-' or 'Invoice #')
        inv_num_match = re.search(r'(?:INV[-:#]|Invoice\s*[:#]?)\s*([A-Z0-9-]+)', text, re.IGNORECASE)
        if inv_num_match:
            metadata['invoice_number'] = inv_num_match.group(1)
        
        # Extract date (common format: MM/DD/YYYY or similar)
        date_match = re.search(r'(?:Date|Invoice Date):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text, re.IGNORECASE)
        if date_match:
            metadata['date'] = date_match.group(1)
        else:
            # Try a more general date pattern if specific pattern fails
            date_matches = re.findall(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b', text)
            if date_matches:
                metadata['date'] = date_matches[0]  # Use first date found
        
        # Extract due date
        due_date_match = re.search(r'(?:Due Date|Payment Due):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text, re.IGNORECASE)
        if due_date_match:
            metadata['due_date'] = due_date_match.group(1)
        
        # Extract total amount
        total_match = re.search(r'(?:Total|Amount Due|Balance Due):\s*[$€£¥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text, re.IGNORECASE)
        if total_match:
            metadata['total_amount'] = "$" + total_match.group(1)
        
        # Extract supplier information
        supplier_match = re.search(r'(?:From|Supplier|Vendor|Biller):\s*([A-Za-z0-9\s&.,]+)', text, re.IGNORECASE)
        if supplier_match:
            metadata['supplier'] = supplier_match.group(1).strip()
        
        # Extract line items (try to identify product details)
        line_items = []
        # Look for patterns like: Item description $XX.XX or similar
        item_matches = re.findall(r'(\w[\w\s]+)\s+(\d+)\s+\$?(\d+(?:\.\d{2})?)', text)
        for match in item_matches:
            if len(match) >= 3:
                line_items.append({
                    "name": match[0].strip(),
                    "quantity": int(match[1]),
                    "price": "$" + match[2]
                })
        
        if line_items:
            metadata['line_items'] = line_items
    
    elif doc_type.lower() == 'purchase_order':
        # Extract PO number
        po_num_match = re.search(r'(?:PO[-:#]|P\.?O\.?[-:#]|Order\s*[:#]?|Purchase Order\s*[:#]?)\s*([A-Z0-9-]+)', text, re.IGNORECASE)
        if po_num_match:
            metadata['po_number'] = po_num_match.group(1)
        
        # Extract date
        date_match = re.search(r'(?:Date|Order Date):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text, re.IGNORECASE)
        if date_match:
            metadata['date'] = date_match.group(1)
        else:
            # Try a more general date pattern if specific pattern fails
            date_matches = re.findall(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b', text)
            if date_matches:
                metadata['date'] = date_matches[0]  # Use first date found
        
        # Extract delivery date
        delivery_date_match = re.search(r'(?:Delivery Date|Ship Date|Expected|ETA):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text, re.IGNORECASE)
        if delivery_date_match:
            metadata['delivery_date'] = delivery_date_match.group(1)
        
        # Extract total amount
        total_match = re.search(r'(?:Total|Grand Total|Amount):\s*[$€£¥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text, re.IGNORECASE)
        if total_match:
            metadata['total_amount'] = "$" + total_match.group(1)
        
        # Extract supplier information
        supplier_match = re.search(r'(?:To|Supplier|Vendor):\s*([A-Za-z0-9\s&.,]+)', text, re.IGNORECASE)
        if supplier_match:
            metadata['supplier'] = supplier_match.group(1).strip()
        
        # Extract ship to/billing information
        ship_to_match = re.search(r'(?:Ship To|Deliver To):\s*([A-Za-z0-9\s&.,]+)', text, re.IGNORECASE)
        if ship_to_match:
            metadata['ship_to'] = ship_to_match.group(1).strip()
        
        # Extract line items (products ordered)
        line_items = []
        # Look for patterns like: Item description Quantity Unit Price
        item_matches = re.findall(r'(\w[\w\s]+)\s+(\d+)\s+\$?(\d+(?:\.\d{2})?)', text)
        for match in item_matches:
            if len(match) >= 3:
                line_items.append({
                    "name": match[0].strip(),
                    "quantity": int(match[1]),
                    "price": "$" + match[2]
                })
        
        if line_items:
            metadata['line_items'] = line_items
    
    elif doc_type.lower() == 'shipping_document':
        # Extract tracking numbers
        tracking_matches = re.findall(r'(?:tracking|shipment)\s*(?:number|#)?\s*:\s*([A-Z0-9]+)', text, re.IGNORECASE)
        if tracking_matches:
            metadata['tracking_number'] = tracking_matches[0]  # Use first tracking number
        
        # Extract carrier information
        carrier_match = re.search(r'(?:carrier|shipper):\s*([A-Za-z\s]+)', text, re.IGNORECASE)
        if carrier_match:
            metadata['carrier'] = carrier_match.group(1).strip()
        
        # Extract origin/destination
        origin_match = re.search(r'(?:from|origin|ship from):\s*([A-Za-z0-9\s,.]+)', text, re.IGNORECASE)
        if origin_match:
            metadata['origin'] = origin_match.group(1).strip()
            
        dest_match = re.search(r'(?:to|destination|ship to):\s*([A-Za-z0-9\s,.]+)', text, re.IGNORECASE)
        if dest_match:
            metadata['destination'] = dest_match.group(1).strip()
            
        # Extract shipping date
        ship_date_match = re.search(r'(?:Ship Date|Shipping Date):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text, re.IGNORECASE)
        if ship_date_match:
            metadata['ship_date'] = ship_date_match.group(1)
            
        # Extract expected delivery date
        delivery_date_match = re.search(r'(?:Delivery Date|Expected|ETA):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text, re.IGNORECASE)
        if delivery_date_match:
            metadata['delivery_date'] = delivery_date_match.group(1)
    
    # General metadata extraction for all document types
    # Extract contact information
    contact_info = {}
    
    # Extract email addresses
    email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    if email_matches:
        contact_info['email'] = email_matches[0]  # Use first email found
    
    # Extract phone numbers
    phone_matches = re.findall(r'\b(?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b', text)
    if phone_matches:
        contact_info['phone'] = phone_matches[0]  # Use first phone found
    
    # Add contact info to metadata if any was found
    if contact_info:
        metadata['contact_info'] = contact_info
    
    return metadata

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=200):
    """Split text into overlapping chunks for vector storage."""
    if not text:
        return []
    
    # Simple chunking by splitting on sentences (periods)
    # This is a simplified version without NLTK
    sentences = text.split('.')
    sentences = [s.strip() + '.' for s in sentences if s.strip()]
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        # If adding this sentence would exceed chunk size, store current chunk and start a new one
        if len(current_chunk) + len(sentence) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence
        else:
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
    
    # Add the last chunk if it exists
    if current_chunk:
        chunks.append(current_chunk)
    
    # If no sentences were found or chunking failed, fallback to character-based chunking
    if not chunks:
        logger.warning("Sentence chunking failed, falling back to character-based chunking")
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size]
            if chunk:
                chunks.append(chunk)
    
    return chunks

def process_document(file_path, original_filename, doc_type='general'):
    """Process an uploaded document and store its content and vectors."""
    try:
        # Extract text from the file
        text_content = extract_text_from_file(file_path)
        
        if not text_content:
            raise ValueError(f"Could not extract text from file: {original_filename}")
        
        # Clean text content from any NUL characters that might cause database issues
        text_content = text_content.replace('\x00', '')
        
        # Check if text_content is a JSON string (this occurs with some file types like PDF/PNG)
        # If so, extract relevant information for metadata processing
        extracted_text_for_metadata = text_content
        is_json_content = False
        
        try:
            # Try to parse as JSON
            if text_content.strip().startswith('{') and text_content.strip().endswith('}'):
                json_data = json.loads(text_content)
                is_json_content = True
                
                # For metadata extraction, create a text representation
                if 'metadata' in json_data:
                    extracted_text_for_metadata = f"Document Metadata:\n"
                    for key, value in json_data['metadata'].items():
                        # Convert any potential binary or complex data to string safely
                        value_str = str(value).replace('\x00', '')
                        extracted_text_for_metadata += f"{key}: {value_str}\n"
                
                # Add description if available
                if 'description' in json_data:
                    extracted_text_for_metadata += f"\nDescription: {json_data['description']}\n"
                
                # Add filename if available
                if 'filename' in json_data:
                    extracted_text_for_metadata += f"\nFilename: {json_data['filename']}\n"
                
                logger.info(f"Processed JSON content from file: {original_filename}")
        except (json.JSONDecodeError, AttributeError):
            # Not JSON or couldn't decode, use as is
            pass
        
        # Extract metadata
        metadata = extract_metadata(extracted_text_for_metadata, doc_type)
        
        # If we have JSON content with metadata, merge it with our extracted metadata
        if is_json_content:
            try:
                json_data = json.loads(text_content)
                if 'metadata' in json_data:
                    for key, value in json_data['metadata'].items():
                        if key not in metadata:
                            # Ensure value is serializable and free of problematic characters
                            if isinstance(value, (str, int, float, bool)):
                                metadata[key] = value
                            else:
                                metadata[key] = str(value).replace('\x00', '')
                
                # Add extra PDF-specific metadata
                if 'pages' in json_data:
                    metadata['pages'] = json_data['pages']
                if 'content_type' in json_data:
                    metadata['content_type'] = json_data['content_type']
            except:
                logger.warning("Failed to merge JSON metadata")
        
        # Store document in database - make filename safe
        safe_filename = os.path.basename(original_filename)
        safe_filename = re.sub(r'[^\w\.-]', '_', safe_filename)
        
        # Ensure metadata is properly serializable
        clean_metadata = {}
        for key, value in metadata.items():
            # Convert any non-serializable data to strings
            if isinstance(value, (str, int, float, bool)):
                clean_metadata[key] = value 
            else:
                clean_metadata[key] = str(value)
        
        # Create and store document
        document = SupplyChainDocument(
            filename=safe_filename,
            doc_type=doc_type,
            content=text_content,
            meta_data=json.dumps(clean_metadata)
        )
        db.session.add(document)
        db.session.commit()
        
        # Upload document to S3 if AWS integration is enabled
        if aws_utils.S3_BUCKET:
            logger.info(f"Uploading document to S3: {original_filename}")
            aws_utils.upload_file_to_s3(
                file_path, 
                f"documents/{doc_type}/{document.id}_{safe_filename}"
            )
        
        # Process with Lambda if available
        if aws_utils.LAMBDA_FUNCTION:
            logger.info(f"Processing document with Lambda: {original_filename}")
            # Use the extracted text for metadata for Lambda processing
            lambda_result = aws_utils.process_document_with_lambda(extracted_text_for_metadata, doc_type)
            if lambda_result and 'metadata' in lambda_result:
                # Merge Lambda-extracted metadata with our basic metadata
                combined_metadata = {**metadata, **lambda_result['metadata']}
                document.meta_data = json.dumps(combined_metadata)
                db.session.commit()
        
        # Use the appropriate text for chunking
        text_for_chunking = extracted_text_for_metadata if is_json_content else text_content
        
        # Split content into chunks for vector storage
        text_chunks = chunk_text(text_for_chunking)
        
        # Add document chunks to vector store
        if text_chunks:
            vector_store.add_document(document.id, text_chunks)
            logger.info(f"Added {len(text_chunks)} chunks from document {document.id} to vector store")
        
        return document.id
    
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        db.session.rollback()
        raise
