const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const SOURCE = {
    URL: 'https://xturujrazwolejhixgbm.supabase.co', // Your Cloud URL
    // Use the SERVICE_ROLE_KEY to ensure full read access
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dXJ1anJhendvbGVqaGl4Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU1NzAzNywiZXhwIjoyMDc5MTMzMDM3fQ.NoKJpFg-vqTNLk5nMqP8sprUaX1hRSW_M9EsxHXn9uU',
};

const DEST = {
    URL: 'https://db.houzai.uz', // Your Self-Hosted URL
    // Use the SERVICE_ROLE_KEY to bypass RLS on write
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNDcyMjQsImV4cCI6NDkyMTc0NzIyNH0.IiV6aKCtU8RlCHZDdNyYJsjPcRQUW19fgpmF01h_cBk',
};

// The table you want to migrate
const TABLE_NAME = 'generation_history';
const BATCH_SIZE = 100; // Reduced to 100 to avoid timeouts
const CHECKPOINT_FILE = path.join(__dirname, '.migration_checkpoint.json');

// --- INIT CLIENTS ---
const sourceClient = createClient(SOURCE.URL, SOURCE.KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const destClient = createClient(DEST.URL, DEST.KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function migrateTable() {
    console.log(`🚀 Starting migration for table: ${TABLE_NAME}`);

    let offset = 0;
    let totalMigrated = 0;
    let hasMore = true;

    while (hasMore) {
        // 1. Fetch batch from Source
        const { data: rows, error: fetchError } = await sourceClient
            .from(TABLE_NAME)
            .select('*')
            .range(offset, offset + BATCH_SIZE - 1)
            .order('created_at', { ascending: true }) // Ensure potential stable ordering if 'created_at' exists, otherwise remove or change
            .csv(); // HINT: if the table doesn't have created_at, remove the .order() call.

        // Note: Using standard select first since .csv() might not be what we want if we want to manipulate JSON. 
        // Let's use standard JSON select.
    }
}

// Rewriting for robustness with standard JSON select and error handling
async function run() {
    console.log(`🚀 Starting migration for table: "${TABLE_NAME}"`);

    let processedCount = 0;

    // Resume functionality
    let page = 0;
    if (fs.existsSync(CHECKPOINT_FILE)) {
        try {
            const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
            if (checkpoint.table === TABLE_NAME && typeof checkpoint.page === 'number') {
                page = checkpoint.page;
                console.log(`🔄 Resuming from checkpoint: Page ${page} (Row offset: ${page * BATCH_SIZE})`);
            }
        } catch (e) {
            console.error('⚠️ Failed to read checkpoint file, starting from scratch.');
        }
    } else {
        console.log('✨ No checkpoint found, starting from the beginning.');
    }

    let finished = false;

    while (!finished) {
        const from = page * BATCH_SIZE;
        const to = from + BATCH_SIZE - 1;

        console.log(`📥 Fetching rows ${from} to ${to}...`);

        // Fetch from Source
        const { data, error } = await sourceClient
            .from(TABLE_NAME)
            .select('*')
            .range(from, to);

        if (error) {
            console.error('❌ Error fetching data:', error);
            process.exit(1);
        }

        if (!data || data.length === 0) {
            console.log('✅ No more data to fetch.');
            finished = true;
            break;
        }

        // Insert into Destination
        console.log(`📤 Inserting ${data.length} rows to destination...`);

        // Try batch insert first
        const { error: insertError } = await destClient
            .from(TABLE_NAME)
            .upsert(data, { ignoreDuplicates: true });

        if (insertError) {
            // Check if it's a Foreign Key Violation
            if (insertError.code === '23503') {
                console.warn('⚠️ Batch failed due to missing User ID (Foreign Key). Falling back to row-by-row insertion...');

                let successCount = 0;
                let skipCount = 0;

                for (const row of data) {
                    const { error: singleError } = await destClient
                        .from(TABLE_NAME)
                        .upsert(row, { ignoreDuplicates: true });

                    if (singleError) {
                        if (singleError.code === '23503') {
                            skipCount++;
                            // console.log(`   ⏭️ Skipped row ${row.id || '?'} (Missing User)`); 
                        } else {
                            console.error(`   ❌ Failed row ${row.id || '?'}:`, singleError.message);
                        }
                    } else {
                        successCount++;
                    }
                }
                console.log(`   Detailed Report: ${successCount} inserted, ${skipCount} skipped.`);
            } else {
                // Some other fatal error
                console.error('❌ Error inserting data batch:', insertError);
                process.exit(1);
            }
        }

        processedCount += data.length;
        console.log(`✨ Processed ${processedCount} rows so far.`);

        // Save Checkpoint
        page++;
        try {
            fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ table: TABLE_NAME, page: page }));
        } catch (e) {
            console.error('⚠️ Failed to save checkpoint:', e.message);
        }
    }

    console.log(`🎉 Migration complete! Total rows transferred: ${processedCount}`);
}

run().catch(err => console.error(err));
