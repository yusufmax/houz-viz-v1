# Kling AI API Setup Guide

## The Problem

The original implementation was trying to call a non-existent API endpoint:
```
https://api.klingai.com/v1
```

**This endpoint doesn't exist!** Kling AI doesn't provide a direct public API.

## The Solution

Kling AI is accessed through **third-party API providers**. We've updated the integration to use **AI/ML API** (https://aimlapi.com), which provides access to Kling AI models.

### Updated Endpoint
```javascript
https://api.aimlapi.com/v2/generate/video/kling/generation
```

## Setup Instructions

### 1. Get an AI/ML API Key

1. Go to https://aimlapi.com
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key

### 2. Add API Key to Netlify

Since this is deployed on Netlify, you need to add the API key as an environment variable:

1. Go to your Netlify Dashboard
2. Select your site (`houzviz`)
3. Go to **Site Settings** → **Environment Variables**
4. Click **Add a variable**
5. Add:
   - **Key**: `KLING_API_KEY`
   - **Value**: Your AI/ML API key from step 1
6. Click **Save**
7. **Redeploy** your site (Netlify → Deploys → Trigger deploy)

### 3. For Local Development (Optional)

If you want to test locally with Netlify CLI:

1. Create a `.env` file in your project root:
   ```bash
   KLING_API_KEY=your_aimlapi_key_here
   ```

2. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

3. Run with Netlify Dev:
   ```bash
   netlify dev
   ```

## How It Works Now

### Generate Video Request
```javascript
POST /.netlify/functions/kling-video
{
  "action": "generate",
  "image": "base64_or_url",
  "model": "kling-v1-5",
  "duration": 5,
  "aspectRatio": "16:9",
  "prompt": "Camera pans around the building"
}
```

**Returns:**
```json
{
  "task_id": "abc123..."
}
```

### Poll for Status
```javascript
POST /.netlify/functions/kling-video
{
  "action": "poll",
  "task_id": "abc123..."
}
```

**Returns:**
```json
{
  "status": "completed",
  "video_url": "https://...",
  "error_message": null
}
```

## Supported Models

- `kling-v1-5` - Kling 1.5 (default)
- `kling-v2-1` - Kling 2.1 (higher quality)
- `kling-v2-5` - Kling 2.5 Turbo (faster)

## Cost Considerations

AI/ML API charges per video generation. Check their pricing at https://aimlapi.com/pricing

**Recommended:**
- Start with a small credit balance
- Monitor usage in AI/ML API dashboard
- Set up billing alerts

## Testing

Once you've added the API key to Netlify and redeployed:

1. Go to Linear Mode
2. Generate an image
3. Scroll down in the Controls panel
4. You should see "Generate Video" section
5. Configure settings and click "Generate Video"
6. Wait 30-60 seconds for processing
7. Video will appear in the player

## Troubleshooting

### "500 Internal Server Error"
- Check that `KLING_API_KEY` is set in Netlify environment variables
- Redeploy after adding the key
- Check Netlify function logs for detailed errors

### "Video quota exceeded"
- Run the database migration: `supabase_migrations/video_tables.sql`
- Check your quota in Supabase: `video_quota` table

### "Failed to start video generation"
- Verify your AI/ML API key is valid
- Check your AI/ML API credit balance
- Ensure the image is in base64 or accessible URL format

## Files Changed

- `netlify/functions/kling-video.js` - Updated to use AI/ML API
- `.env.example` - Added KLING_API_KEY documentation

## Next Steps

1. ✅ Add `KLING_API_KEY` to Netlify environment variables
2. ✅ Redeploy site
3. ✅ Run database migration (if not done already)
4. ✅ Test video generation
