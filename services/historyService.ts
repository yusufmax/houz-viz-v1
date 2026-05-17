
import { supabase } from '../lib/supabaseClient';
import { HistoryItem, RenderStyle } from '../types';

/**
 * Generate a JPEG thumbnail from a base64 data URL using an offscreen canvas.
 * Returns a Blob suitable for uploading to storage.
 */
const generateThumbnailBlob = (dataUrl: string, maxWidth = 400, quality = 0.75): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const scale = Math.min(maxWidth / img.width, 1); // Never upscale
            const width = Math.round(img.width * scale);
            const height = Math.round(img.height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob returned null'));
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = (err) => reject(err);
        img.src = dataUrl;
    });
};

/**
 * Generate a thumbnail from a remote URL by fetching + canvas resizing.
 */
const generateThumbnailFromUrl = async (url: string, maxWidth = 400, quality = 0.75): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const scale = Math.min(maxWidth / img.width, 1);
            const width = Math.round(img.width * scale);
            const height = Math.round(img.height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob returned null'));
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = (err) => reject(err);
        img.src = url;
    });
};

export const historyService = {
    async getHistory(userId: string, projectId?: string): Promise<HistoryItem[]> {
        let query = supabase
            .from('generation_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching history:', error);
            return [];
        }

        return data.map((item: any) => ({
            id: item.id,
            url: item.image_url,
            thumbnailUrl: item.thumbnail_url || null,
            prompt: item.prompt,
            style: item.style as RenderStyle,
            timestamp: new Date(item.created_at).getTime(),
            metadata: item.metadata,
            modelName: item.model_name,
            estimatedCost: item.estimated_cost
        }));
    },

    async addToHistory(userId: string, item: HistoryItem, projectId?: string, userDisplayName?: string): Promise<void> {
        let imageUrl = item.url;
        let thumbnailUrl: string | null = null;

        // Check if the URL is a Base64 string
        if (imageUrl.startsWith('data:image')) {
            try {
                // 1. Generate thumbnail BEFORE uploading the original (while we still have the base64)
                const thumbnailBlob = await generateThumbnailBlob(imageUrl);
                const thumbFileName = `thumbnails/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

                const { error: thumbUploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(thumbFileName, thumbnailBlob, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });

                if (!thumbUploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('generated-images')
                        .getPublicUrl(thumbFileName);
                    thumbnailUrl = publicUrl;
                } else {
                    console.warn('Thumbnail upload failed (non-critical):', thumbUploadError);
                }

                // 2. Upload the full-resolution original
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const fileExt = imageUrl.split(';')[0].split('/')[1] || 'png';
                const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(fileName, blob, {
                        contentType: `image/${fileExt}`,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            } catch (err) {
                console.error('Failed to upload image to storage:', err);
                throw new Error('Failed to upload generated image to storage.');
            }
        } else if (imageUrl.startsWith('http')) {
            // External URL — try to generate thumbnail from the URL
            try {
                const thumbnailBlob = await generateThumbnailFromUrl(imageUrl);
                const thumbFileName = `thumbnails/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

                const { error: thumbUploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(thumbFileName, thumbnailBlob, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });

                if (!thumbUploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('generated-images')
                        .getPublicUrl(thumbFileName);
                    thumbnailUrl = publicUrl;
                }
            } catch (err) {
                console.warn('Thumbnail generation from URL failed (non-critical):', err);
            }
        }

        // Check if metadata has a Base64 sourceImage and upload it
        if (item.metadata && item.metadata.sourceImage && item.metadata.sourceImage.startsWith('data:image')) {
            try {
                const response = await fetch(item.metadata.sourceImage);
                const blob = await response.blob();
                const fileExt = item.metadata.sourceImage.split(';')[0].split('/')[1] || 'png';
                const fileName = `${userId}/${Date.now()}-src-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('uploaded-images')
                    .upload(fileName, blob, {
                        contentType: `image/${fileExt}`,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('uploaded-images')
                    .getPublicUrl(fileName);

                item.metadata.sourceImage = publicUrl;
            } catch (err) {
                console.error('Failed to upload source image to storage:', err);
                // Non-fatal, just remove it to avoid massive base64 string in DB
                delete item.metadata.sourceImage;
            }
        }

        const { error } = await supabase
            .from('generation_history')
            .insert({
                user_id: userId,
                image_url: imageUrl,
                thumbnail_url: thumbnailUrl,
                prompt: item.prompt,
                style: item.style,
                project_id: projectId,
                user_display_name: userDisplayName,
                created_at: new Date(item.timestamp).toISOString(),
                metadata: item.metadata,
                model_name: item.modelName,
                estimated_cost: item.estimatedCost
            });

        if (error) {
            console.error('Error adding to history:', error);
            throw error;
        }
    },

    async clearHistory(userId: string): Promise<void> {
        const { error } = await supabase
            .from('generation_history')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Error clearing history:', error);
            throw error;
        }
    },

    /**
     * Helper to get a transformed (smaller) image URL from Supabase Storage
     */
    getOptimizedUrl(url: string, width = 400): string {
        if (!url || !url.includes('generated-images')) return url;

        // Use Supabase Storage transformation parameters if available
        // Note: This requires the Pro plan or specific configuration on Supabase
        // If not available, it just returns the original URL.
        // Format: .../storage/v1/render/image/public/bucket/path?width=400&height=400&resize=contain

        try {
            const urlObj = new URL(url);

            // Handle both supabase.co and custom domains
            // Standard Supabase storage path: /storage/v1/object/public/bucket/path
            if (urlObj.pathname.includes('/storage/v1/object/public/generated-images/')) {
                const newPath = urlObj.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
                return `${urlObj.origin}${newPath}?width=${width}&quality=80&resize=contain`;
            }

            // If it's already a render URL, just ensure quality parameters are present
            if (urlObj.pathname.includes('/storage/v1/render/image/public/generated-images/')) {
                if (!url.includes('width=')) {
                    const separator = url.includes('?') ? '&' : '?';
                    return `${url}${separator}width=${width}&quality=80&resize=contain`;
                }
                return url;
            }
        } catch (e) {
            console.warn('Failed to construct optimized URL:', e);
        }

        return url;
    }
};
