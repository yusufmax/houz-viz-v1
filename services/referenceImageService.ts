import { supabase } from '../lib/supabaseClient';

export interface ReferenceImage {
    id: string;
    user_id: string;
    name: string;
    image_url: string;
    category?: 'exterior' | 'interior' | 'general';
    display_order: number;
    created_at: string;
    updated_at: string;
}

/**
 * Fetch user's custom reference images
 */
export const fetchUserReferenceImages = async (userId: string): Promise<ReferenceImage[]> => {
    const { data, error } = await supabase
        .from('user_reference_images')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Upload reference image to storage and create database entry
 */
export const uploadReferenceImage = async (
    userId: string,
    file: File,
    name: string,
    category: 'exterior' | 'interior' | 'general' = 'general'
): Promise<ReferenceImage> => {
    // Validate file
    if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('reference-images')
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('reference-images')
        .getPublicUrl(fileName);

    // Get current max order
    const { data: existing } = await supabase
        .from('user_reference_images')
        .select('display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    // Create database entry
    const { data, error } = await supabase
        .from('user_reference_images')
        .insert({
            user_id: userId,
            name,
            image_url: publicUrl,
            category,
            display_order: nextOrder
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update reference image name
 */
export const updateReferenceImage = async (
    id: string,
    name: string
): Promise<void> => {
    const { error } = await supabase
        .from('user_reference_images')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
};

/**
 * Delete reference image (both storage and database)
 */
export const deleteReferenceImage = async (id: string): Promise<void> => {
    // Get image URL to extract storage path
    const { data: image } = await supabase
        .from('user_reference_images')
        .select('image_url')
        .eq('id', id)
        .single();

    if (image) {
        // Extract file path from URL
        const urlParts = image.image_url.split('/reference-images/');
        if (urlParts.length > 1) {
            const filePath = urlParts[1];

            // Delete from storage
            await supabase.storage
                .from('reference-images')
                .remove([filePath]);
        }
    }

    // Delete from database
    const { error } = await supabase
        .from('user_reference_images')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

/**
 * Reorder reference images
 */
export const reorderReferenceImages = async (
    updates: { id: string; display_order: number }[]
): Promise<void> => {
    for (const update of updates) {
        await supabase
            .from('user_reference_images')
            .update({ display_order: update.display_order, updated_at: new Date().toISOString() })
            .eq('id', update.id);
    }
};
