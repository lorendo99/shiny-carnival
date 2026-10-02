import { useRef, useState, useEffect } from 'react';
import { useRequestUploadUrl } from '@workspace/api-client-react';
import { ImagePlus, X, LoaderCircle } from 'lucide-react';

export interface UploadedPhoto {
  objectPath: string;
  uploadToken: string;
  name: string;
  contentType: string;
  size: number;
  url: string; // local preview url
}

interface PhotoUploaderProps {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
}

export function PhotoUploader({ photos, onChange, maxPhotos = 5 }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestUpload = useRequestUploadUrl();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (photos.length + files.length > maxPhotos) {
      setError(`You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    const newPhotos: UploadedPhoto[] = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Only image files are allowed.');
        }

        const { uploadURL, objectPath, uploadToken, metadata } = await requestUpload.mutateAsync({
          data: {
            name: file.name,
            size: file.size,
            contentType: file.type,
          },
        });

        const uploadRes = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload image.');
        }

        newPhotos.push({
          objectPath,
          uploadToken,
          name: metadata.name,
          contentType: metadata.contentType,
          size: metadata.size,
          url: URL.createObjectURL(file),
        });
      }

      onChange([...photos, ...newPhotos]);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].url);
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  return (
    <div className="photo-uploader">
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <div key={photo.objectPath} className="photo-preview">
            <img src={photo.url} alt={`Preview ${i + 1}`} />
            <button type="button" onClick={() => removePhoto(i)} className="photo-remove">
              <X size={14} />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            type="button"
            className="photo-add-btn"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? <LoaderCircle className="animate-spin" size={24} /> : <ImagePlus size={24} />}
            <span>Add photo</span>
          </button>
        )}
      </div>
      {error && <div className="photo-error">{error}</div>}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        style={{ display: 'none' }}
      />
    </div>
  );
}
