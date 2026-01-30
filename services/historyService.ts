
import { supabase } from '../lib/supabaseClient';
import { HistoryItem, RenderStyle } from '../types';

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
            compressed_url: item.compressed_url,
            prompt: item.prompt,
            style: item.style as RenderStyle,
            timestamp: new Date(item.created_at).getTime(),
            metadata: item.metadata, // Return full metadata
            modelName: item.model_name,
            estimatedCost: item.estimated_cost
        }));
    },

    /**
     * Compress an image to a 400px wide version (Blob)
     */
    async compressImage(dataUrl: string, quality = 0.8, maxWidth = 400): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

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
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
            img.src = dataUrl;
        });
    },

    async addToHistory(userId: string, item: HistoryItem, projectId?: string, userDisplayName?: string): Promise<void> {
        let imageUrl = item.url;
        let compressedUrl = item.compressed_url;

        // Check if the URL is a Base64 string
        if (imageUrl.startsWith('data:image')) {
            try {
                // 1. Upload Original
                const response = await fetch(imageUrl);
                const originalBlob = await response.blob();
                const fileExt = imageUrl.split(';')[0].split('/')[1] || 'png';
                const baseFileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const fileName = `${baseFileName}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(fileName, originalBlob, {
                        contentType: `image/${fileExt}`,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;

                // 2. Generate and Upload Compressed Thumbnail
                try {
                    const compressedBlob = await this.compressImage(item.url); // Use original base64
                    const thumbFileName = `${baseFileName}_thumb.jpg`;

                    const { error: thumbError } = await supabase.storage
                        .from('generated-images')
                        .upload(thumbFileName, compressedBlob, {
                            contentType: 'image/jpeg',
                            upsert: false
                        });

                    if (!thumbError) {
                        const { data: { publicUrl: thumbUrl } } = supabase.storage
                            .from('generated-images')
                            .getPublicUrl(thumbFileName);
                        compressedUrl = thumbUrl;
                    }
                } catch (thumbErr) {
                    console.warn('Failed to generate thumbnail during upload:', thumbErr);
                }

            } catch (err) {
                console.error('Failed to upload image to storage:', err);
                throw new Error('Failed to upload generated image to storage.');
            }
        }

        const { error } = await supabase
            .from('generation_history')
            .insert({
                user_id: userId,
                image_url: imageUrl,
                compressed_url: compressedUrl,
                prompt: item.prompt,
                style: item.style,
                project_id: projectId,
                user_display_name: userDisplayName, // Save display name
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
    },

    /**
     * Utility to backfill compressed versions for existing entries
     * This iterates through history items missing a compressed_url,
     * fetches them, compresses them, and uploads them.
     */
    async backfillCompressedImages(limit = 10): Promise<number> {
        // Fetch items missing compressed_url
        const { data: items, error: fetchError } = await supabase
            .from('generation_history')
            .select('*')
            .is('compressed_url', null)
            .limit(limit);

        if (fetchError || !items) {
            console.error('Error fetching items for backfill:', fetchError);
            return 0;
        }

        let successCount = 0;

        for (const item of items) {
            try {
                console.log(`Processing item ${item.id}...`);

                // 1. Fetch original image
                const response = await fetch(item.image_url);
                if (!response.ok) throw new Error('Failed to fetch original image');

                // 2. Compress (we need to convert blob to dataURL for our current compressImage helper)
                const blob = await response.blob();
                const reader = new FileReader();
                const dataUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });

                const compressedBlob = await this.compressImage(dataUrl);

                // 3. Upload thumbnail
                const urlParts = item.image_url.split('/');
                const originalFileName = urlParts[urlParts.length - 1];
                const baseName = originalFileName.split('.')[0];
                const thumbFileName = `${item.user_id}/${baseName}_thumb.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(thumbFileName, compressedBlob, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl: thumbUrl } } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(thumbFileName);

                // 4. Update database
                const { error: updateError } = await supabase
                    .from('generation_history')
                    .update({ compressed_url: thumbUrl })
                    .eq('id', item.id);

                if (updateError) throw updateError;

                successCount++;
                console.log(`Backfilled thumbnail for item ${item.id}`);

            } catch (err) {
                console.error(`Failed backfill for item ${item.id}:`, err);
            }
        }

        return successCount;
    }
};
