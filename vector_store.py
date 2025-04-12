import os
import logging
import json
from models import VectorEmbedding, SupplyChainDocument
from db_config import db  # Import db from db_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
VECTOR_DIR = 'vector_storage'

# Global variables
text_to_id_map = {}

def init_vector_store():
    """Initialize the vector store."""
    global text_to_id_map
    
    # Create directory if it doesn't exist
    if not os.path.exists(VECTOR_DIR):
        os.makedirs(VECTOR_DIR)
    
    logger.info("Initialized simplified vector store")
    text_to_id_map = {}

def encode_text(text):
    """Mock encoding function - returns a simple hash."""
    # Just return a dummy value as we're not using real vector embeddings
    return hash(text) % 1000

def add_document(document_id, text_chunks):
    """Add document chunks to the vector store."""
    global text_to_id_map
    
    logger.info(f"Adding document {document_id} with {len(text_chunks)} chunks")
    
    # Process each chunk
    for i, chunk in enumerate(text_chunks):
        # Create a simple ID for this chunk
        chunk_idx = len(text_to_id_map) + i
        
        # Map this chunk to its source document
        text_to_id_map[chunk_idx] = {
            'document_id': document_id,
            'chunk_text': chunk,
            'chunk_index': i
        }
        
        # Save to database for reference (without actual embeddings)
        vector_embedding = VectorEmbedding(
            document_id=document_id,
            text_chunk=chunk,
            embedding_file=f"mock_embedding_{document_id}_{i}.txt",
            chunk_index=chunk_idx
        )
        db.session.add(vector_embedding)
    
    # Save changes to database
    db.session.commit()
    
    logger.info(f"Added {len(text_chunks)} chunks from document {document_id} to simplified vector store")
    return True

def search(query, top_k=5):
    """Search for relevant text chunks using simple keyword matching."""
    global text_to_id_map
    
    logger.info(f"Searching for: {query} (top_k={top_k})")
    
    if not text_to_id_map:
        logger.warning("Vector store is empty, cannot search")
        return []
    
    # Simplistic search - just check if query words appear in chunks
    query_terms = query.lower().split()
    results = []
    
    for idx, metadata in text_to_id_map.items():
        chunk_text = metadata['chunk_text'].lower()
        
        # Count how many query terms appear in the chunk
        match_count = sum(1 for term in query_terms if term in chunk_text)
        
        if match_count > 0:
            # Calculate a simple score based on number of matching terms
            score = match_count / len(query_terms)
            
            result = {
                'document_id': metadata['document_id'],
                'text': metadata['chunk_text'],
                'score': score
            }
            
            # Get document metadata
            doc = SupplyChainDocument.query.get(metadata['document_id'])
            if doc:
                result['document_type'] = doc.doc_type
                result['filename'] = doc.filename
            
            results.append(result)
    
    # Sort by score (descending) and limit to top_k
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:top_k]

def save_index():
    """Mock save function."""
    logger.info("Saving simplified vector store (no actual index)")
    return True
