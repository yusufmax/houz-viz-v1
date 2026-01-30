#!/bin/bash

# Script to trigger automatic thumbnail regeneration for all generations
# This opens the admin panel and starts the auto-pilot backfill process.

PORT=${1:-5173}
URL="http://localhost:$PORT/admin?auto_backfill=true"

echo "------------------------------------------------"
echo "🚀 Starting Auto-Pilot Thumbnail Regeneration"
echo "------------------------------------------------"
echo "Opening: $URL"
echo "Please keep the browser window open until the alert confirms completion."

# Use 'open' on Mac, 'xdg-open' on Linux, or 'start' on Windows
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "$URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open "$URL"
else
  start "$URL"
fi
