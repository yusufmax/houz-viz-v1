/**
 * Live Thumbnail Backfill Monitor
 * 
 * Polls every 5 seconds and displays realtime progress.
 * 
 * Usage:
 *   VITE_SUPABASE_URL=http://db.houzai.uz:8000 \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNDcyMjQsImV4cCI6NDkyMTc0NzIyNH0.IiV6aKCtU8RlCHZDdNyYJsjPcRQUW19fgpmF01h_cBk \
 *   node scripts/check-thumbnail-status.cjs
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://db.houzai.uz:8000';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, KEY);
const POLL_INTERVAL = 5000;
let prevDone = 0;
let startTime = Date.now();
let startDone = null;

async function check() {
    try {
        const [totalRes, doneRes] = await Promise.all([
            supabase.from('generation_history').select('*', { count: 'exact', head: true }),
            supabase.from('generation_history').select('*', { count: 'exact', head: true }).not('thumbnail_url', 'is', null)
        ]);

        const total = totalRes.count || 0;
        const done = doneRes.count || 0;
        const remaining = total - done;
        const pct = total > 0 ? ((done / total) * 100).toFixed(1) : 0;

        if (startDone === null) startDone = done;

        const elapsed = (Date.now() - startTime) / 1000;
        const processed = done - startDone;
        const rate = elapsed > 0 ? (processed / elapsed * 60).toFixed(1) : 0;
        const eta = rate > 0 ? Math.ceil(remaining / (processed / elapsed) / 60) : '∞';
        const delta = done - prevDone;

        // Progress bar
        const barLen = 30;
        const filled = Math.round((done / total) * barLen);
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        console.clear();
        console.log(`\n  📊 THUMBNAIL BACKFILL — LIVE MONITOR`);
        console.log(`  ════════════════════════════════════════\n`);
        console.log(`  ${bar}  ${pct}%\n`);
        console.log(`  Total:      ${total.toLocaleString()}`);
        console.log(`  ✅ Done:     ${done.toLocaleString()}`);
        console.log(`  ⏳ Left:     ${remaining.toLocaleString()}`);
        console.log(`  ⚡ Rate:     ${rate}/min`);
        console.log(`  ⏱  ETA:      ~${eta} min`);
        if (delta > 0) console.log(`  📈 Last 5s:  +${delta}`);
        console.log(`\n  Press Ctrl+C to stop monitoring.\n`);

        prevDone = done;

        if (remaining === 0) {
            console.log(`  🎉 ALL DONE! Every record has a thumbnail.\n`);
            process.exit(0);
        }
    } catch (err) {
        console.error('  ❌ Poll error:', err.message);
    }
}

check();
setInterval(check, POLL_INTERVAL);
