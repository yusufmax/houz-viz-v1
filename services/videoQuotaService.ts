import { supabase } from '../lib/supabaseClient';
import { VideoQuota } from '../types';

export const videoQuotaService = {
    async getUserVideoQuota(userId: string): Promise<VideoQuota | null> {
        try {
            const { data, error } = await supabase
                .from('video_quota')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No quota record exists, create one
                    return await this.createUserVideoQuota(userId);
                }
                throw error;
            }

            return {
                used: data.used,
                quota: data.quota,
                last_reset: data.last_reset
            };
        } catch (error) {
            console.error('Error fetching video quota:', error);
            return null;
        }
    },

    async createUserVideoQuota(userId: string): Promise<VideoQuota> {
        const { data, error } = await supabase
            .from('video_quota')
            .insert({
                user_id: userId,
                used: 0,
                quota: 10
            })
            .select()
            .single();

        if (error) throw error;

        return {
            used: data.used,
            quota: data.quota,
            last_reset: data.last_reset
        };
    },

    async incrementVideoUsage(userId: string): Promise<void> {
        const { error } = await supabase.rpc('increment_video_usage', {
            p_user_id: userId
        });

        if (error) throw error;
    },

    async canGenerateVideo(userId: string): Promise<boolean> {
        const quota = await this.getUserVideoQuota(userId);
        return quota ? quota.used < quota.quota : false;
    }
};
