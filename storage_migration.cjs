
/**
 * Storage Migrator 3000
 * Moves files from Supabase Cloud to Self-Hosted Supabase
 * 
 * Usage: 
 * 1. npm install @supabase/supabase-js fs
 * 2. Edit the CONFIG section below
 * 3. node storage_migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

// --- CONFIGURATION ---
const SOURCE = {
    URL: 'https://xturujrazwolejhixgbm.supabase.co', // Your Cloud URL
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dXJ1anJhendvbGVqaGl4Z2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU1NzAzNywiZXhwIjoyMDc5MTMzMDM3fQ.NoKJpFg-vqTNLk5nMqP8sprUaX1hRSW_M9EsxHXn9uU', // Your Cloud SERVICE_ROLE_KEY (must be Service Role for admin access)
    BUCKET: 'generated-images' // Bucket Name to copy
};

const DEST = {
    URL: 'https://db.houzai.uz', // Your Self-Hosted URL
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNDcyMjQsImV4cCI6NDkyMTc0NzIyNH0.IiV6aKCtU8RlCHZDdNyYJsjPcRQUW19fgpmF01h_cBk', // Your Self-Hosted SERVICE_ROLE_KEY (Service Role essential to bypass RLS)
    BUCKET: 'generated-images' // Bucket Name to copy to (must created first)
};

const BATCH_SIZE = 10; // Number of parallel uploads
// ---------------------

const sourceClient = createClient(SOURCE.URL, SOURCE.KEY);
const destClient = createClient(DEST.URL, DEST.KEY, {
    auth: { persistSession: false }
});

async function migrate() {
    console.log(`🚀 Starting Migration: ${SOURCE.BUCKET} -> ${DEST.BUCKET}`);

    // 1. List all files recursively
    console.log('📦 Scanning bucket for all files...');
    const allFiles = await listAllFiles(SOURCE.BUCKET, '');

    console.log(`✅ Total files to migrate: ${allFiles.length}`);

    // 2. Process in batches
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batch = allFiles.slice(i, i + BATCH_SIZE);
        console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${i} - ${i + batch.length})...`);

        await Promise.all(batch.map(processFile));
    }

    console.log('🎉 Migration Complete!');
}

// Recursive helper to find files in folders
async function listAllFiles(bucket, path = '') {
    let files = [];
    let offset = 0;

    while (true) {
        const { data, error } = await sourceClient.storage.from(bucket).list(path, { limit: 100, offset });
        if (error) throw error;
        if (data.length === 0) break;

        for (const item of data) {
            if (!item.metadata) {
                // It's a folder: Recurse into it
                const subPath = path ? `${path}/${item.name}` : item.name;
                console.log(`   📂 Found folder: ${subPath}`);
                const subFiles = await listAllFiles(bucket, subPath);
                files = [...files, ...subFiles];
            } else {
                // It's a file: Add to list with FULL path
                const fullPath = path ? `${path}/${item.name}` : item.name;
                files.push({ ...item, name: fullPath });
            }
        }

        if (data.length < 100) break; // End of list
        offset += 100;
    }
    return files;
}

async function processFile(file) {
    const fileName = file.name;

    try {
        // Optional: Check if exists in destination (Slows it down, enable if restarting)
        // const { data: exists } = await destClient.storage.from(DEST.BUCKET).list('', { search: fileName });
        // if (exists && exists.length > 0 && exists.find(f => f.name === fileName)) {
        //     console.log(`   ⏭️  Skipping (Already exists): ${fileName}`);
        //     return;
        // }

        // Download from Source
        const { data: blob, error: dlError } = await sourceClient.storage.from(SOURCE.BUCKET).download(fileName);
        if (dlError) throw new Error(`Download failed: ${dlError.message}`);

        // Convert Blob to ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Destination
        const { error: ulError } = await destClient.storage.from(DEST.BUCKET).upload(fileName, buffer, {
            contentType: file.metadata.mimetype,
            upsert: true
        });

        if (ulError) throw new Error(`Upload failed: ${ulError.message}`);

        console.log(`   ✅ Migrated: ${fileName}`);

    } catch (err) {
        console.error(`   ❌ FAIL: ${fileName} - ${err.message}`);
    }
}

migrate().catch(console.error);
