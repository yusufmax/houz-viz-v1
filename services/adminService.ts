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

            // Note: History images are usually just URLs to external or bucket. 
            // If they are in buckets, we'd need to find them too.
            // Assuming for now most assets are in 'reference-images'.
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
    }
};
