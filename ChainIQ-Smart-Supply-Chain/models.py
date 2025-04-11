from app import db
from datetime import datetime
import uuid

class SupplyChainDocument(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False)  # e.g., 'invoice', 'purchase_order', etc.
    content = db.Column(db.Text, nullable=True)
    meta_data = db.Column(db.Text, nullable=True)  # JSON string with metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SupplyChainDocument {self.filename}>'

class ChatSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = db.relationship('ChatMessage', backref='session', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<ChatSession {self.session_uuid}>'

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('chat_session.id'), nullable=False)
    is_user = db.Column(db.Boolean, default=True)  # True if from user, False if from bot
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        sender = "User" if self.is_user else "Bot"
        return f'<ChatMessage {sender}: {self.message[:20]}...>'

class VectorEmbedding(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('supply_chain_document.id'), nullable=True)
    text_chunk = db.Column(db.Text, nullable=False)
    embedding_file = db.Column(db.String(255), nullable=False)  # Path to the embedding file
    chunk_index = db.Column(db.Integer, nullable=False)  # Index of this chunk in the FAISS index
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    document = db.relationship('SupplyChainDocument', backref='embeddings')
    
    def __repr__(self):
        return f'<VectorEmbedding {self.id}>'
