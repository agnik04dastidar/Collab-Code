import { useState, useRef } from 'react';
import { FaCamera, FaTimes, FaCheck, FaTrash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const ProfilePictureUpload = ({ onUploadComplete, onCancel, showRemove = false, onRemoveComplete }) => {
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  const { uploadProfilePicture, removeProfilePicture } = useAuth();

  const arcadeGreen = "#00ff00";
  const arcadeGreenDark = "#00cc00";
  const arcadeBg = "#0a0a0a";
  const arcadeBgLight = "#1a1a1a";

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const url = await uploadProfilePicture(selectedFile);
      if (onUploadComplete) {
        onUploadComplete(url);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (onCancel) {
      onCancel();
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setError(null);

    try {
      await removeProfilePicture();
      if (onRemoveComplete) {
        onRemoveComplete();
      }
      if (onCancel) {
        onCancel();
      }
    } catch (err) {
      setError(err.message || 'Failed to remove profile picture');
    } finally {
      setIsRemoving(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className="p-4 rounded-xl"
      style={{ 
        backgroundColor: arcadeBgLight, 
        border: `2px solid ${arcadeGreen}`,
        width: '280px'
      }}
    >
      <h3 
        className="text-sm mb-4 text-center"
        style={{ color: arcadeGreen, textShadow: `0 0 10px ${arcadeGreen}` }}
      >
        CHANGE PROFILE PICTURE
      </h3>

      {/* Preview Area */}
      <div className="flex justify-center mb-4">
        <div 
          className="relative w-24 h-24 rounded-full overflow-hidden"
          style={{ 
            border: `3px solid ${arcadeGreen}`,
            boxShadow: `0 0 15px ${arcadeGreen}40`
          }}
        >
          {preview ? (
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: arcadeBg }}
            >
              <FaCamera size={24} style={{ color: arcadeGreenDark }} />
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="mb-3 p-2 rounded-lg text-xs text-center"
          style={{ 
            backgroundColor: '#ff000020', 
            border: '1px solid #ff0000',
            color: '#ff0000'
          }}
        >
          {error}
        </div>
      )}

      {/* File Input (Hidden) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {!preview ? (
          <>
            <button
              onClick={triggerFileInput}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{ 
                backgroundColor: arcadeGreen, 
                color: arcadeBg,
                boxShadow: `0 0 10px ${arcadeGreen}30`
              }}
            >
              <FaCamera size={12} />
              SELECT PHOTO
            </button>
            {showRemove && (
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                style={{ 
                  backgroundColor: 'transparent', 
                  border: `2px solid #ff0000`,
                  color: '#ff0000'
                }}
              >
                {isRemoving ? (
                  'REMOVING...'
                ) : (
                  <>
                    <FaTrash size={12} />
                    REMOVE PICTURE
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{ 
                backgroundColor: arcadeGreen, 
                color: arcadeBg,
                boxShadow: `0 0 10px ${arcadeGreen}30`,
                opacity: isUploading ? 0.5 : 1
              }}
            >
              {isUploading ? (
                'UPLOADING...'
              ) : (
                <>
                  <FaCheck size={12} />
                  UPLOAD
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{ 
                backgroundColor: 'transparent', 
                border: `2px solid ${arcadeGreenDark}`,
                color: arcadeGreenDark
              }}
            >
              <FaTimes size={12} />
              CANCEL
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePictureUpload;

