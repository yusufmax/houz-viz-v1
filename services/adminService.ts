import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';

export interface AdminUser extends Profile {
    is_admin_visible: boolean;
}

export const adminService = {
    /**
     * Fetch all users that are marked as visible to admin
     */
    async getVisibleUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching visible users:', error);
            throw error;
        }

        return data as AdminUser[];
    },

    /**
     * Update a user's generation quota
     */
    async updateUserQuota(userId: string, quota: number) {
        const { error } = await supabase
            .from('profiles')
            .update({ generation_quota: quota })
            .eq('id', userId);

        if (error) {
            console.error('Error updating usage quota:', error);
            throw error;
        }
    },

    /**
     * Toggle user visibility in admin panel (for testing purposes mainly)
     */
    async toggleUserVisibility(userId: string, isVisible: boolean) {
        const { error } = await supabase
            .from('profiles')
            .update({ is_admin_visible: isVisible })
            .eq('id', userId);

        if (error) {
            console.error('Error toggling visibility:', error);
            throw error;
        }
    },

    /**
     * Check if a user is an admin
     */
    async checkIsAdmin(userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error checking admin status:', error);
            return false;
        }

        return data?.is_admin || false;
    },

    /**
     * Ban a user completely (Data wipe + Blacklist email)
     */
    async banUser(userId: string) {
        // Clean up storage first
        await this.cleanupUserStorage(userId);

        const { error } = await supabase.rpc('ban_user_complete', {
            target_user_id: userId
        });

        if (error) {
            console.error('Error banning user:', error);
            throw error;
        }
    },

    /**
     * Delete a user profile and their history completely (including Auth)
     */
    async deleteUser(userId: string) {
        // Clean up storage first
        await this.cleanupUserStorage(userId);

        const { error } = await supabase.rpc('delete_user_complete', {
            target_user_id: userId
        });

        if (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    /**
     * Internal helper to clean up user files from storage
     */
    async cleanupUserStorage(userId: string) {
        try {
            // Get all user reference images
            const { data: images } = await supabase
                .from('user_reference_images')
                .select('image_url')
                .eq('user_id', userId);

            if (images && images.length > 0) {
                const paths = images.map(img => {
                    const parts = img.image_url.split('/reference-images/');
                    return parts.length > 1 ? parts[1] : null;
                }).filter(Boolean) as string[];

                if (paths.length > 0) {
                    await supabase.storage
                        .from('reference-images')
                        .remove(paths);
                }
            }
        } catch (e) {
            console.warn('Storage cleanup failed (non-critical):', e);
        }
    },

    /**
     * Get generation history for a specific user
     */
    async getUserHistory(userId: string) {
        const { data, error } = await supabase
            .from('generation_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user history:', error);
            throw error;
        }

        return data;
    },

    /**
     * Get overall system stats including estimated cost
     */
    async getSystemStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const [totalGens, activeUsers, gensLast24h, totalCost] = await Promise.all([
            supabase.from('generation_history').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('generation_history').select('*', { count: 'exact', head: true }).gt('created_at', last24h),
            supabase.from('generation_history').select('estimated_cost')
        ]);

        const totalCostUSD = totalCost.data?.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0) || 0;

        return {
            totalGenerations: totalGens.count || 0,
            totalUsers: activeUsers.count || 0,
            generationsLast24h: gensLast24h.count || 0,
            totalCostUSD
        };
    },

    /**
     * Get daily generation stats and cost for the last 30 days
     */
    async getDailyStats() {
        // Fetch last 2000 records and group in JS
        const { data, error } = await supabase
            .from('generation_history')
            .select('created_at, estimated_cost')
            .order('created_at', { ascending: false })
            .limit(2000);

        if (error) throw error;

        const groups: Record<string, { count: number, cost: number }> = {};
        data?.forEach(item => {
            const date = item.created_at.split('T')[0];
            if (!groups[date]) groups[date] = { count: 0, cost: 0 };
            groups[date].count += 1;
            groups[date].cost += (Number(item.estimated_cost) || 0);
        });

        return Object.entries(groups)
            .map(([date, stats]) => ({ date, count: stats.count, cost: stats.cost }))
            .sort((a, b) => b.date.localeCompare(a.date));
    },

    /**
     * Get detailed usage report for a specific date
     */
    async getDailyReport(date: string) {
        const startOfDay = `${date}T00:00:00Z`;
        const endOfDay = `${date}T23:59:59Z`;

        const { data, error } = await supabase
            .from('generation_history')
            .select(`
                *,
                profiles (
                    full_name
                )
            `)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching daily report:', error);
            throw error;
        }
        return data;
    },

    /**
     * Get top users by generations used
     */
    async getUserLeaderboard() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, generations_used, generation_quota')
            .order('generations_used', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    }
};
