import { useEffect, useMemo, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ file, onChange, disabled }: ImageUploadProps) {
  // Preview straight from the selected file; nothing is uploaded until the meal is saved.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null);
    // Clear the input so choosing the same file again still fires a change.
    event.target.value = '';
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-gray-700">Photo</span>
      <div className="flex items-center gap-4">
        <label className={disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled}
            className="sr-only"
            aria-label="Upload photo"
          />
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            <ImagePlus className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">{file ? 'Change photo' : 'Upload photo'}</span>
          </div>
        </label>
        {previewUrl && (
          <div className="relative w-16 h-16">
            <img src={previewUrl} alt="Selected photo preview" className="w-full h-full object-cover rounded-md" />
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              aria-label="Remove photo"
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
