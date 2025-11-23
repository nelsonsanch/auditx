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
    Upload a file to Firebase Storage using REST API and return the public URL
    
    Args:
        file_content: File content as bytes
        filename: Original filename
        content_type: MIME type (e.g., 'image/png')
    
    Returns:
        Public URL of the uploaded file
    """
    try:
        config = get_firebase_config()
        
        # Generate unique filename
        file_extension = filename.split('.')[-1] if '.' in filename else 'png'
        unique_filename = f"logos/{uuid.uuid4()}.{file_extension}"
        
        # Firebase Storage REST API endpoint
        upload_url = f"https://firebasestorage.googleapis.com/v0/b/{config['storage_bucket']}/o?uploadType=media&name={unique_filename}"
        
        # Upload file using REST API
        response = requests.post(
            upload_url,
            data=file_content,
            headers={'Content-Type': content_type}
        )
        
        if response.status_code not in [200, 201]:
            raise Exception(f"Firebase upload failed: {response.status_code} - {response.text}")
        
        # Construct public URL
        # URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
        public_url = f"https://firebasestorage.googleapis.com/v0/b/{config['storage_bucket']}/o/{unique_filename.replace('/', '%2F')}?alt=media"
        
        return public_url
        
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
        config = get_firebase_config()
        
        # Extract file path from URL
        # URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
        if 'firebasestorage.googleapis.com' in file_url and '%2F' in file_url:
            # Extract encoded path
            path_start = file_url.find('/o/') + 3
            path_end = file_url.find('?') if '?' in file_url else len(file_url)
            encoded_path = file_url[path_start:path_end]
            
            # Delete using REST API
            delete_url = f"https://firebasestorage.googleapis.com/v0/b/{config['storage_bucket']}/o/{encoded_path}"
            response = requests.delete(delete_url)
            
            return response.status_code == 204
    except Exception as e:
        print(f"Error deleting from Firebase Storage: {str(e)}")
        return False
