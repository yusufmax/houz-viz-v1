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
     * Ban or unban a user
     */
    async banUser(userId: string, isBanned: boolean) {
        const { error } = await supabase
            .from('profiles')
            .update({ is_banned: isBanned })
            .eq('id', userId);

        if (error) {
            console.error('Error banning user:', error);
            throw error;
        }
    },

    /**
     * Delete a user profile and their history (Auth remains unless Edge function used)
     */
    async deleteUser(userId: string) {
        // We delete history first if cascade isn't set, although migration says 'on delete cascade'
        const { error: historyError } = await supabase
            .from('generation_history')
            .delete()
            .eq('user_id', userId);

        if (historyError) {
            console.error('Error deleting user history:', historyError);
            throw historyError;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('Error deleting user profile:', profileError);
            throw profileError;
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
    }
};
