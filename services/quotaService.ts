import { supabase } from '../lib/supabaseClient';

export const quotaService = {
    /**
     * Get current quota and usage for a user
     */
    async getUserQuota(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('generation_quota, generations_used')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching quota:', error);
            return null;
        }

        if (!data) {
            console.warn('No profile data found for user:', userId);
            return null;
        }

        return {
            quota: data.generation_quota ?? 20,
            used: data.generations_used ?? 0,
            remaining: (data.generation_quota ?? 20) - (data.generations_used ?? 0)
        };
    },

    /**
     * Check if user has remaining credits
     */
    async checkQuota(userId: string): Promise<boolean> {
        const quota = await this.getUserQuota(userId);
        if (!quota) return false;
        return quota.remaining > 0;
    },

    /**
     * Increment usage count
     */
    async incrementUsage(userId: string) {
        // We use an RPC or just a direct update. 
        // Direct update is safer with a read-modify-write if we don't have an increment RPC,
        // but for simplicity and since we have RLS, we might need a specific policy or RPC.
        // Let's try a direct update first, assuming the user has update rights on their own profile (which they do per db_schema.sql).

        // Fetch current first to ensure atomic-ish increment
        const { data: current, error: fetchError } = await supabase
            .from('profiles')
            .select('generations_used')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const newUsed = (current?.generations_used ?? 0) + 1;

        const { error } = await supabase
            .from('profiles')
            .update({ generations_used: newUsed })
            .eq('id', userId);

        if (error) {
            console.error('Error incrementing usage:', error);
            throw error;
        }
    }
};

export const videoQuotaService = {
    /**
     * Get current video quota and usage for a user
     */
    async getUserVideoQuota(userId: string) {
        const { data, error } = await supabase
            .from('video_quota')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching video quota:', error);
            return null;
        }

        // If no quota record exists, return default (it will be created on first usage)
        if (!data) {
            return {
                used: 0,
                quota: 10,
                last_reset: new Date().toISOString()
            };
        }

        return data;
    },

    /**
     * Check if user can generate video
     */
    async canGenerateVideo(userId: string): Promise<boolean> {
        const quota = await this.getUserVideoQuota(userId);
        if (!quota) return true; // Allow if no record (default will apply)
        return quota.used < quota.quota;
    },

    /**
     * Increment video usage
     */
    async incrementVideoUsage(userId: string) {
        const { error } = await supabase.rpc('increment_video_usage', { p_user_id: userId });

        if (error) {
            console.error('Error incrementing video usage:', error);
            // Fallback to direct insert/update if RPC fails or doesn't exist
            const { data: current } = await supabase
                .from('video_quota')
                .select('used')
                .eq('user_id', userId)
                .maybeSingle();

            if (current) {
                await supabase
                    .from('video_quota')
                    .update({ used: current.used + 1 })
                    .eq('user_id', userId);
            } else {
                await supabase
                    .from('video_quota')
                    .insert({ user_id: userId, used: 1, quota: 10 });
            }
        }
    }
};
