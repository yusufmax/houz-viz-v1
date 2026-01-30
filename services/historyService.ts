
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
            prompt: item.prompt,
            style: item.style as RenderStyle,
            timestamp: new Date(item.created_at).getTime(),
            metadata: item.metadata, // Return full metadata
            modelName: item.model_name,
            estimatedCost: item.estimated_cost
        }));
    },

    async addToHistory(userId: string, item: HistoryItem, projectId?: string, userDisplayName?: string): Promise<void> {
        let imageUrl = item.url;

        // Check if the URL is a Base64 string
        if (imageUrl.startsWith('data:image')) {
            try {
                // Convert Base64 to Blob
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const fileExt = imageUrl.split(';')[0].split('/')[1] || 'png';
                const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(fileName, blob, {
                        contentType: `image/${fileExt}`,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(fileName);

                console.log('Image uploaded to storage:', publicUrl);
                imageUrl = publicUrl;

            } catch (err) {
                console.error('Failed to upload image to storage:', err);
                throw new Error('Failed to upload generated image to storage. Check storage bucket permissions.');
            }
        }

        const { error } = await supabase
            .from('generation_history')
            .insert({
                user_id: userId,
                image_url: imageUrl,
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
    }
};
