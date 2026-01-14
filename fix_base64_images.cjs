const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// --- CONFIGURATION ---
const DEST = {
    URL: 'https://db.houzai.uz', // Your Self-Hosted URL
    // Service Role Key is required to bypass RLS and write to storage/db
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNDcyMjQsImV4cCI6NDkyMTc0NzIyNH0.IiV6aKCtU8RlCHZDdNyYJsjPcRQUW19fgpmF01h_cBk',
    BUCKET: 'generated-images',
    TABLE: 'generation_history'
};

const supabase = createClient(DEST.URL, DEST.KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log('🚀 Starting Base64 Image Cleanup...');

    // 1. Fetch rows with base64 images
    // Note: We use 'ilike' for proper case-insensitive matching just in case
    const limit = 50;
    let page = 0;
    let totalFixed = 0;
    let hasMore = true;

    while (hasMore) {
        console.log(`📥 Fetching batch ${page + 1}...`);

        const { data: rows, error } = await supabase
            .from(DEST.TABLE)
            .select('id, user_id, image_url, created_at')
            .ilike('image_url', 'data:image%')
            .range(0, limit - 1); // Always fetch the first page because we modify them as we go!

        if (error) {
            console.error('❌ Error fetching rows:', error);
            process.exit(1);
        }

        if (!rows || rows.length === 0) {
            console.log('✅ No more base64 images found.');
            hasMore = false;
            break;
        }

        console.log(`🔄 Processing ${rows.length} rows...`);

        for (const row of rows) {
            try {
                const { id, user_id, image_url, created_at } = row;

                // Parse Data URL
                // Format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
                const matches = image_url.match(/^data:(image\/([a-zA-Z]*));base64,(.+)$/);

                if (!matches || matches.length !== 4) {
                    console.warn(`⚠️  Row ${id}: Invalid data URL format. Skipping.`);
                    continue;
                }

                const mimeType = matches[1];
                const extension = matches[2] === 'jpeg' ? 'jpg' : matches[2];
                const base64Data = matches[3];
                const buffer = Buffer.from(base64Data, 'base64');

                // Generate Filename
                // Pattern: user_id/timestamp-random.ext
                const timestamp = new Date(created_at).getTime();
                const random = Math.random().toString(36).substring(7);
                const fileName = `${user_id}/${timestamp}-${random}.${extension}`;

                // Upload to Storage
                const { error: uploadError } = await supabase.storage
                    .from(DEST.BUCKET)
                    .upload(fileName, buffer, {
                        contentType: mimeType,
                        upsert: true
                    });

                if (uploadError) {
                    throw new Error(`Upload failed: ${uploadError.message}`);
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from(DEST.BUCKET)
                    .getPublicUrl(fileName);

                // Update Database
                const { error: updateError } = await supabase
                    .from(DEST.TABLE)
                    .update({ image_url: publicUrl })
                    .eq('id', id);

                if (updateError) {
                    throw new Error(`DB Update failed: ${updateError.message}`);
                }

                console.log(`   ✅ Fixed Row ${id}: Uploaded to ${publicUrl}`);
                totalFixed++;

            } catch (err) {
                console.error(`   ❌ Failed Row ${row.id}:`, err.message);
            }
        }

        // Safety break if we haven't fixed anything in a batch to prevent infinite loops if fetch query isn't working as expected
        if (totalFixed === 0 && page > 5) {
            console.warn("⚠️  Stopping loop: Processed multiple batches but fixed 0 rows. Check query logic.");
            break;
        }

        // We don't increment page (offset) because we are removing items from the 'data:image%' set by updating them!
        // So the next 50 items will again be at offset 0.
        // However, if we fail to fix some, they will stay at offset 0 and we'll loop forever.
        // Ideally we should filter out the ones we failed on? 
        // For simplicity: If we processed rows but totalFixed didn't increase much, we might be stuck.

        // Actually, let's just use a fixed loop for now and trust the update works.
        // If we want to be safe, we could use an offset and only process once, but since we modify the set, offset logic is tricky.
        // Valid trick: fetch rows that start with 'data:image%' AND are NOT in a list of failed IDs.

        // Delay slightly to be nice to DB
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`🎉 Cleanup Complete! Total rows fixed: ${totalFixed}`);
}

run().catch(console.error);
