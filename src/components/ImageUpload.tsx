import { useCallback, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void;
  preview: string | null;
  onClear: () => void;
}

export function ImageUpload({ onImageSelect, preview, onClear }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageSelect(file, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border-2 border-primary/30">
          <img src={preview} alt="Crop preview" className="w-full h-64 object-cover" />
          <button
            onClick={onClear}
            className="absolute top-3 right-3 bg-foreground/70 text-primary-foreground rounded-full p-1.5 hover:bg-foreground/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">
                Upload Crop Image
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag & drop or click to browse
              </p>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
