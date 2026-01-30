import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    console.log('🚀 Starting Thumbnail Backfill...');

    let totalProcessed = 0;
    let hasMore = true;

    while (hasMore) {
        // Fetch items missing compressed_url
        const { data: items, error: fetchError } = await supabase
            .from('generation_history')
            .select('*')
            .is('compressed_url', null)
            .limit(20);

        if (fetchError) {
            console.error('❌ Error fetching items:', fetchError);
            break;
        }

        if (!items || items.length === 0) {
            console.log('✅ All items have thumbnails!');
            hasMore = false;
            break;
        }

        console.log(`📦 Processing batch of ${items.length} items...`);

        for (const item of items) {
            try {
                process.stdout.write(`   🔄 Item ${item.id}: `);

                // 1. Download
                const response = await fetch(item.image_url);
                if (!response.ok) throw new Error('Download failed');
                const buffer = Buffer.from(await response.arrayBuffer());

                // 2. Resize
                const thumbnailBuffer = await sharp(buffer)
                    .resize(400)
                    .jpeg({ quality: 80 })
                    .toBuffer();

                // 3. Construct Path
                const urlParts = item.image_url.split('/');
                const originalFileName = urlParts[urlParts.length - 1];
                const baseName = originalFileName.split('.')[0];
                const thumbFileName = `${item.user_id}/${baseName}_thumb.jpg`;

                // 4. Upload
                const { error: uploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(thumbFileName, thumbnailBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl: thumbUrl } } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(thumbFileName);

                // 5. Update DB
                const { error: updateError } = await supabase
                    .from('generation_history')
                    .update({ compressed_url: thumbUrl })
                    .eq('id', item.id);

                if (updateError) throw updateError;

                process.stdout.write('✅ Done\n');
                totalProcessed++;
            } catch (err) {
                process.stdout.write(`❌ Failed: ${err.message}\n`);
            }
        }
    }

    console.log(`\n🎉 Completed! Total images processed: ${totalProcessed}`);
}

backfill();
