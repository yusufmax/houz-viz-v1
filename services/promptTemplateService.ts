
import { supabase } from '../lib/supabaseClient';

export interface PromptTemplate {
    id: string;
    user_id: string;
    name: string;
    prompt: string;
    created_at: string;
}

export const promptTemplateService = {
    async saveTemplate(userId: string, name: string, prompt: string): Promise<PromptTemplate | null> {
        const { data, error } = await supabase
            .from('user_prompts')
            .insert({
                user_id: userId,
                name,
                prompt
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving template:', error);
            throw error;
        }

        return data;
    },

    async getTemplates(userId: string): Promise<PromptTemplate[]> {
        const { data, error } = await supabase
            .from('user_prompts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }

        return data || [];
    },

    async deleteTemplate(templateId: string): Promise<void> {
        const { error } = await supabase
            .from('user_prompts')
            .delete()
            .eq('id', templateId);

        if (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }
};
