/**
 * Backfill Thumbnails Script
 * 
 * Processes existing generation_history records that don't have a thumbnail_url,
 * downloads the full-res image, generates a 400px JPEG thumbnail, uploads it
 * to Supabase Storage, and updates the DB record.
 * 
 * Usage: node scripts/backfill-thumbnails.cjs
 * 
 * Supports resumability via a checkpoint file.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// ---- CONFIG ----
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin access
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const BATCH_SIZE = 10;
const MAX_WIDTH = 400;
const JPEG_QUALITY = 75; // 0-100
const CHECKPOINT_FILE = path.join(__dirname, '..', '.thumbnail_backfill_checkpoint.json');

if (!SUPABASE_URL) {
    console.error('❌ Missing VITE_SUPABASE_URL');
    process.exit(1);
}

const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
if (!supabaseKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, supabaseKey);

// ---- HELPERS ----

function loadCheckpoint() {
    try {
        if (fs.existsSync(CHECKPOINT_FILE)) {
            return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('⚠️ Could not load checkpoint, starting fresh');
    }
    return { processedIds: [], lastProcessedAt: null };
}

function saveCheckpoint(checkpoint) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

/**
 * Download image and resize to thumbnail using sharp (if available) or raw fetch + resize headers.
 * Since this is a Node.js script without canvas, we use sharp for image processing.
 */
async function downloadAndResize(imageUrl) {
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        // sharp not installed — fall back to downloading raw image
        // In this case we'll just download and re-upload a smaller version
        console.warn('⚠️ sharp not installed. Install with: npm install sharp');
        console.warn('   Falling back to raw download (no resize)');
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        return buffer;
    }

    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const thumbnail = await sharp(buffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

    return thumbnail;
}

// ---- MAIN ----

async function main() {
    console.log('🔄 Starting thumbnail backfill...');
    console.log(`   Supabase URL: ${SUPABASE_URL}`);
    console.log(`   Batch size: ${BATCH_SIZE}`);
    console.log(`   Max width: ${MAX_WIDTH}px`);

    const checkpoint = loadCheckpoint();
    console.log(`   Previously processed: ${checkpoint.processedIds.length} records`);

    let offset = 0;
    let totalProcessed = 0;
    let totalFailed = 0;

    while (true) {
        // Fetch batch of records without thumbnails
        const { data: records, error } = await supabase
            .from('generation_history')
            .select('id, user_id, image_url')
            .is('thumbnail_url', null)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
            console.error('❌ Query error:', error);
            break;
        }

        if (!records || records.length === 0) {
            console.log('✅ No more records to process.');
            break;
        }

        console.log(`\n📦 Processing batch of ${records.length} records (offset: ${offset})...`);

        for (const record of records) {
            // Skip already processed
            if (checkpoint.processedIds.includes(record.id)) {
                console.log(`   ⏭ Skipping ${record.id} (already processed)`);
                continue;
            }

            try {
                console.log(`   🖼 Processing ${record.id}...`);

                // Download and resize
                const thumbnailBuffer = await downloadAndResize(record.image_url);
                const thumbFileName = `thumbnails/${record.user_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

                // Upload thumbnail
                const { error: uploadError } = await supabase.storage
                    .from('generated-images')
                    .upload(thumbFileName, thumbnailBuffer, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });

                if (uploadError) {
                    console.error(`   ❌ Upload failed for ${record.id}:`, uploadError.message);
                    totalFailed++;
                    continue;
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(thumbFileName);

                // Update DB record
                const { error: updateError } = await supabase
                    .from('generation_history')
                    .update({ thumbnail_url: publicUrl })
                    .eq('id', record.id);

                if (updateError) {
                    console.error(`   ❌ DB update failed for ${record.id}:`, updateError.message);
                    totalFailed++;
                    continue;
                }

                console.log(`   ✅ ${record.id} → ${(thumbnailBuffer.length / 1024).toFixed(1)}KB`);
                totalProcessed++;

                // Save checkpoint
                checkpoint.processedIds.push(record.id);
                checkpoint.lastProcessedAt = new Date().toISOString();
                saveCheckpoint(checkpoint);

            } catch (err) {
                console.error(`   ❌ Failed for ${record.id}:`, err.message);
                totalFailed++;
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 200));
        }

        offset += BATCH_SIZE;
    }

    console.log(`\n🏁 Backfill complete!`);
    console.log(`   ✅ Processed: ${totalProcessed}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   📄 Total in checkpoint: ${checkpoint.processedIds.length}`);
}

main().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
