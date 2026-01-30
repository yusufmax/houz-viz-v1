#!/bin/bash

# Script to trigger automatic thumbnail regeneration for all generations
# This runs the backend Node.js script for high-performance processing.

echo "------------------------------------------------"
echo "🚀 Starting Backend Thumbnail Regeneration"
echo "------------------------------------------------"

node scripts/backfill-thumbnails.js

echo "------------------------------------------------"
echo "✅ Finished Process"
echo "------------------------------------------------"
