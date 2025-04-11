import os
import logging
import json
import re
import os.path
from flask import current_app
from db_config import db  # Import db from db_config
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

def process_document(file_path, filename, doc_type):
    # Your document processing logic here
    pass
