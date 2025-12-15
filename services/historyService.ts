
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
            metadata: item.metadata // Return full metadata
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
                console.error('Failed to upload image to storage, falling back to original URL:', err);
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
                metadata: item.metadata
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
    }
};
