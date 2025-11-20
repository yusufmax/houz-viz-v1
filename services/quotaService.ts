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
            .single();

        if (error) {
            console.error('Error fetching quota:', error);
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
