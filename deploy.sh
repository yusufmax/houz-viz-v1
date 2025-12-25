#!/bin/bash

# Deployment Helper Script for Houz-Viz
echo "🚀 Starting Deployment Helper..."

# Check for Supabase CLI
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI not found."
    echo "💡 Run: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found."

# Step 1: Link Project
echo "1️⃣  Linking Project..."
echo "Enter your Supabase Project ID (get it from Dashboard -> Settings):"
read PROJECT_ID
supabase link --project-ref "$PROJECT_ID"

# Step 2: Push Database
echo "2️⃣  Pushing Database Migrations..."
supabase db push

# Step 3: Set Secrets
echo "3️⃣  Setting Telegram Secrets..."
echo "Enter Telegram Bot Token:"
read BOT_TOKEN
echo "Enter Admin Chat ID:"
read CHAT_ID

supabase secrets set TELEGRAM_BOT_TOKEN="$BOT_TOKEN" TELEGRAM_ADMIN_CHAT_ID="$CHAT_ID"

# Step 4: Deploy Function
echo "4️⃣  Deploying Telegram Bot Function..."
supabase functions deploy telegram-bot

echo "🎉 All Done! Your bot is live."
echo "💡 Final Step: Don't forget to set your Telegram Webhook URL as instructed in the guide."
