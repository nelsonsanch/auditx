import os
import requests
import uuid
from typing import Optional

def get_firebase_config():
    """Get Firebase configuration from environment"""
    return {
        'api_key': os.getenv('FIREBASE_API_KEY'),
        'project_id': os.getenv('FIREBASE_PROJECT_ID'),
        'storage_bucket': os.getenv('FIREBASE_STORAGE_BUCKET')
    }

def upload_file_to_firebase(file_content: bytes, filename: str, content_type: str) -> str:
    """
    Upload a file to Firebase Storage and return the public URL
    
    Args:
        file_content: File content as bytes
        filename: Original filename
        content_type: MIME type (e.g., 'image/png')
    
    Returns:
        Public URL of the uploaded file
    """
    try:
        # Initialize Firebase if not already done
        initialize_firebase()
        
        # Get storage bucket
        bucket = storage.bucket()
        
        # Generate unique filename
        file_extension = filename.split('.')[-1] if '.' in filename else 'png'
        unique_filename = f"logos/{uuid.uuid4()}.{file_extension}"
        
        # Create blob and upload
        blob = bucket.blob(unique_filename)
        blob.upload_from_string(file_content, content_type=content_type)
        
        # Make the blob publicly accessible
        blob.make_public()
        
        # Return public URL
        return blob.public_url
        
    except Exception as e:
        print(f"Error uploading to Firebase Storage: {str(e)}")
        raise

def delete_file_from_firebase(file_url: str) -> bool:
    """
    Delete a file from Firebase Storage given its public URL
    
    Args:
        file_url: Public URL of the file to delete
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Initialize Firebase if not already done
        initialize_firebase()
        
        # Extract blob path from URL
        # URL format: https://storage.googleapis.com/{bucket}/logos/{filename}
        if 'storage.googleapis.com' in file_url:
            parts = file_url.split('/')
            blob_path = '/'.join(parts[4:])  # Everything after bucket name
            
            bucket = storage.bucket()
            blob = bucket.blob(blob_path)
            blob.delete()
            return True
    except Exception as e:
        print(f"Error deleting from Firebase Storage: {str(e)}")
        return False
