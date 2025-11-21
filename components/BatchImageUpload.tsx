import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface BatchImageUploadProps {
    onImagesSelected: (images: string[]) => void;
    maxImages?: number;
}

const BatchImageUpload: React.FC<BatchImageUploadProps> = ({ onImagesSelected, maxImages = 10 }) => {
    const [images, setImages] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    const maxSize = 1920;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const processFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const remainingSlots = maxImages - images.length;
        const filesToProcess = fileArray.slice(0, remainingSlots);

        if (fileArray.length > remainingSlots) {
            alert(`Maximum ${maxImages} images allowed. Only first ${remainingSlots} will be added.`);
        }

        const compressed = await Promise.all(filesToProcess.map(f => compressImage(f)));
        const newImages = [...images, ...compressed];
        setImages(newImages);
        onImagesSelected(newImages);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) processFiles(files);
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files) processFiles(files);
    }, [images]);

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        onImagesSelected(newImages);
    };

    const clearAll = () => {
        setImages([]);
        onImagesSelected([]);
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full h-32
          border-2 border-dashed rounded-lg transition-all cursor-pointer
          ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
            >
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={images.length >= maxImages}
                />
                <div className="flex flex-col items-center justify-center text-slate-400">
                    <Upload size={24} className="mb-2" />
                    <p className="text-sm font-medium">
                        {images.length >= maxImages ? `Maximum ${maxImages} images reached` : `Upload up to ${maxImages} images`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{images.length}/{maxImages} uploaded</p>
                </div>
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-300 font-medium">{images.length} image{images.length > 1 ? 's' : ''} ready</p>
                        <button
                            onClick={clearAll}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {images.map((img, index) => (
                            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                                <img src={img} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={12} />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                                    #{index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchImageUpload;
