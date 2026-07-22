# YouTube API Setup Guide

This guide will help you set up the YouTube Data API v3 to access your Watch Later playlist.

## Prerequisites

1. A Google account
2. Python 3.6 or higher
3. pip package manager

## Step 1: Install Required Packages

```bash
pip install -r requirements.txt
```

## Step 2: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Click on "APIs & Services" > "Library"
4. Search for "YouTube Data API v3" and enable it

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add your email to test users
   - Add scopes: `https://www.googleapis.com/auth/youtube.readonly`
4. For Application type, select "Desktop application"
5. Give it a name (e.g., "YouTube Watch Later Extractor")
6. Click "Create"

## Step 4: Download Credentials

1. After creating the OAuth client, click the download button (⬇️)
2. Save the downloaded JSON file as `credentials.json` in the same directory as the script
3. Keep this file secure and never share it publicly

## Step 5: Run the Script

```bash
python youtube_watch_later.py
```

On first run:
1. A browser window will open for authentication
2. Sign in to your Google account
3. Grant permission to access your YouTube data
4. The script will save an access token for future use

## Output Files

The script generates three files:
- `watch_later_videos.json` - Complete video data in JSON format
- `watch_later_urls.txt` - Simple list of YouTube URLs
- `token.json` - OAuth access token (created automatically)

## Troubleshooting

### "Credentials file not found"
- Make sure `credentials.json` is in the same directory as the script
- Verify you downloaded the correct OAuth 2.0 credentials (not API key)

### "Access blocked" during authentication
- Make sure your app is in testing mode or published
- Add your email to test users in OAuth consent screen
- Check that YouTube Data API v3 is enabled

### "Watch Later playlist not found"
- This is normal - YouTube restricts direct access to Watch Later playlists
- The script uses an alternative method to access your private playlists

### Rate Limiting
- YouTube API has quotas and rate limits
- The script handles pagination automatically
- If you hit limits, wait a few hours and try again

## Security Notes

- Never commit `credentials.json` or `token.json` to version control
- These files contain sensitive authentication data
- Add them to your `.gitignore` file:

```
credentials.json
token.json
```

## API Limits

- Free tier: 10,000 units per day
- Each playlist request costs ~3-5 units
- Monitor usage in Google Cloud Console