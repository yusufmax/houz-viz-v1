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
            .order('generations_used', { ascending: false });

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
     * Get generation history for a specific user with pagination
     */
    async getUserHistory(userId: string, page = 1, limit = 5) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('generation_history')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching user history:', error);
            throw error;
        }

        return { data, count };
    },

    /**
     * Get recent generation history for all users
     */
    async getAllHistory(limit = 100) {
        const { data, error } = await supabase
            .from('generation_history')
            .select(`
                *,
                profiles (
                    full_name,
                    display_name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching all history:', error);
            throw error;
        }
        return data;
    },

    /**
     * Get overall system stats including estimated cost
     */
    async getSystemStats(startDate?: string, endDate?: string) {
        let genQuery = supabase.from('generation_history').select('*', { count: 'exact', head: true });
        let costQuery = supabase.from('generation_history').select('estimated_cost');

        if (startDate) {
            genQuery = genQuery.gte('created_at', startDate);
            costQuery = costQuery.gte('created_at', startDate);
        }
        if (endDate) {
            genQuery = genQuery.lte('created_at', endDate);
            costQuery = costQuery.lte('created_at', endDate);
        }

        const [totalGens, activeUsers, totalCost] = await Promise.all([
            genQuery,
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            costQuery
        ]);

        const totalCostUSD = totalCost.data?.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0) || 0;

        return {
            totalGenerations: totalGens.count || 0,
            totalUsers: activeUsers.count || 0,
            totalCostUSD
        };
    },

    /**
     * Get daily generation stats and cost for a given range
     */
    async getDailyStats(startDate?: string, endDate?: string) {
        let query = supabase
            .from('generation_history')
            .select('created_at, estimated_cost')
            .order('created_at', { ascending: false });

        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate);

        // Remove hard limit if filtering, or keep a larger one for safety
        if (!startDate && !endDate) {
            query = query.limit(2000);
        }

        const { data, error } = await query;

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
                    full_name,
                    display_name
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
            .select('id, full_name, display_name, generations_used, generation_quota')
            .order('generations_used', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    }
};
