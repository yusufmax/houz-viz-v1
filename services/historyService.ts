
import { supabase } from '../lib/supabaseClient';
import { HistoryItem, RenderStyle } from '../types';

export const historyService = {
    async getHistory(userId: string, projectId?: string): Promise<HistoryItem[]> {
        let query = supabase
            .from('generation_history')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
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

    async addToHistory(userId: string, item: HistoryItem, projectId?: string): Promise<void> {
        const { error } = await supabase
            .from('generation_history')
            .insert({
                user_id: userId,
                image_url: item.url,
                prompt: item.prompt,
                style: item.style,
                project_id: projectId,
                created_at: new Date(item.timestamp).toISOString(),
                metadata: item.metadata // Save full metadata
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
