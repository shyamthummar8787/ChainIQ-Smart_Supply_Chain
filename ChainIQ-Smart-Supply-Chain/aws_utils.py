import os
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS credentials from environment variables
AWS_ACCESS_KEY = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
S3_BUCKET = os.environ.get('S3_BUCKET_NAME')
LAMBDA_FUNCTION = os.environ.get('LAMBDA_FUNCTION_NAME')

# Initialize mock AWS clients
def get_s3_client():
    """Mock S3 client."""
    logger.info("Using mock S3 client - boto3 dependency not available")
    return None

def get_lambda_client():
    """Mock Lambda client."""
    logger.info("Using mock Lambda client - boto3 dependency not available")
    return None

# S3 Operations
def upload_file_to_s3(file_path, object_name=None):
    """Mock upload a file to an S3 bucket.
    
    Args:
        file_path: Path to the file to upload
        object_name: S3 object name. If not specified, file_path's filename is used
    
    Returns:
        True if file was uploaded, else False
    """
    if S3_BUCKET is None:
        logger.warning("S3_BUCKET_NAME environment variable not set")
        return False
        
    # If object_name not specified, use file_path's basename
    if object_name is None:
        object_name = os.path.basename(file_path)
    
    logger.info(f"Mock S3 upload: {file_path} to {S3_BUCKET}/{object_name}")
    return True

def download_file_from_s3(object_name, file_path):
    """Mock download a file from an S3 bucket.
    
    Args:
        object_name: S3 object to download
        file_path: Path where the file will be saved
    
    Returns:
        True if file was downloaded, else False
    """
    if S3_BUCKET is None:
        logger.warning("S3_BUCKET_NAME environment variable not set")
        return False
        
    logger.info(f"Mock S3 download: {S3_BUCKET}/{object_name} to {file_path}")
    return True

def list_s3_objects(prefix=''):
    """Mock list objects in an S3 bucket with the given prefix.
    
    Args:
        prefix: Prefix to filter objects by
    
    Returns:
        List of object keys, or None if error
    """
    if S3_BUCKET is None:
        logger.warning("S3_BUCKET_NAME environment variable not set")
        return None
        
    logger.info(f"Mock S3 list objects with prefix: {prefix}")
    return []

# Lambda Operations
def invoke_lambda_function(payload):
    """Mock invoke an AWS Lambda function.
    
    Args:
        payload: JSON payload to send to the Lambda function
    
    Returns:
        Lambda function response, or None if error
    """
    if LAMBDA_FUNCTION is None:
        logger.warning("LAMBDA_FUNCTION_NAME environment variable not set")
        return None
        
    logger.info(f"Mock Lambda invocation with payload type: {type(payload)}")
    return {"status": "success", "message": "Mock Lambda response"}

def process_document_with_lambda(document_text, document_type):
    """Mock process a document using AWS Lambda for advanced NLP tasks.
    
    Args:
        document_text: Text content of the document
        document_type: Type of document (e.g., 'invoice', 'purchase_order')
    
    Returns:
        Processed document data, or None if error
    """
    payload = {
        'document_text': document_text[:100] + "..." if len(document_text) > 100 else document_text,
        'document_type': document_type
    }
    
    logger.info(f"Mock document processing: {document_type} document")
    
    # Return mock enhanced metadata based on document type
    if document_type.lower() == 'invoice':
        return {
            'metadata': {
                'enhanced': True,
                'confidence': 0.85,
                'invoice_date': '2023-01-15',
                'due_date': '2023-02-15'
            }
        }
    elif document_type.lower() == 'purchase_order':
        return {
            'metadata': {
                'enhanced': True,
                'confidence': 0.90,
                'order_date': '2023-01-10',
                'expected_delivery': '2023-01-25'
            }
        }
    else:
        return {
            'metadata': {
                'enhanced': True,
                'confidence': 0.75,
                'document_type': document_type
            }
        }
