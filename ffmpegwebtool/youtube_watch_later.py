#!/usr/bin/env python3
"""
YouTube Watch Later Playlist Extractor
Retrieves videos from your YouTube Watch Later playlist using the YouTube Data API v3.
"""

import os
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# YouTube API settings
SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'

class YouTubeWatchLater:
    def __init__(self, credentials_file='credentials.json', token_file='token.json'):
        """
        Initialize YouTube API client
        
        Args:
            credentials_file: Path to OAuth 2.0 credentials JSON file from Google Console
            token_file: Path to store/retrieve access token
        """
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.youtube = None
        self.authenticate()
    
    def authenticate(self):
        """Handle OAuth 2.0 authentication flow"""
        creds = None
        
        # Load existing token if available
        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
        
        # If no valid credentials, get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_file):
                    raise FileNotFoundError(
                        f"Credentials file '{self.credentials_file}' not found. "
                        "Please download OAuth 2.0 credentials from Google Console."
                    )
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES
                )
                creds = flow.run_local_server(port=0)
            
            # Save credentials for next run
            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())
        
        # Build YouTube service
        self.youtube = build(API_SERVICE_NAME, API_VERSION, credentials=creds)
        print("✓ Successfully authenticated with YouTube API")
    
    def get_channel_playlists(self):
        """Get user's channel info including special playlists"""
        try:
            request = self.youtube.channels().list(
                part='contentDetails',
                mine=True
            )
            response = request.execute()
            
            if not response.get('items'):
                print("No channel found for authenticated user")
                return None
            
            content_details = response['items'][0]['contentDetails']
            related_playlists = content_details.get('relatedPlaylists', {})
            
            print("Available playlists:")
            for playlist_type, playlist_id in related_playlists.items():
                print(f"  {playlist_type}: {playlist_id}")
            
            return related_playlists
        
        except HttpError as e:
            print(f"An HTTP error occurred: {e}")
            return None
    
    def get_watch_later_playlist_id(self):
        """Get the Watch Later playlist ID"""
        playlists = self.get_channel_playlists()
        if playlists and 'watchLater' in playlists:
            return playlists['watchLater']
        else:
            print("Watch Later playlist not found or not accessible")
            return None
    
    def get_playlist_items(self, playlist_id, max_results=50):
        """
        Get items from a playlist
        
        Args:
            playlist_id: YouTube playlist ID
            max_results: Maximum number of videos to retrieve per page
        
        Returns:
            List of video items
        """
        try:
            videos = []
            next_page_token = None
            
            while True:
                request = self.youtube.playlistItems().list(
                    part='snippet,contentDetails',
                    playlistId=playlist_id,
                    maxResults=max_results,
                    pageToken=next_page_token
                )
                
                response = request.execute()
                
                for item in response.get('items', []):
                    video_info = {
                        'title': item['snippet']['title'],
                        'video_id': item['contentDetails']['videoId'],
                        'url': f"https://www.youtube.com/watch?v={item['contentDetails']['videoId']}",
                        'channel': item['snippet']['channelTitle'],
                        'published': item['snippet']['publishedAt'],
                        'added_to_playlist': item['snippet']['publishedAt'],
                        'description': item['snippet']['description'][:200] + '...' if len(item['snippet']['description']) > 200 else item['snippet']['description']
                    }
                    videos.append(video_info)
                
                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break
            
            return videos
        
        except HttpError as e:
            print(f"An HTTP error occurred: {e}")
            return []
    
    def get_watch_later_videos(self, max_results=50):
        """Get all videos from Watch Later playlist"""
        print("Fetching Watch Later playlist...")
        
        playlist_id = self.get_watch_later_playlist_id()
        if not playlist_id:
            return []
        
        print(f"Watch Later playlist ID: {playlist_id}")
        videos = self.get_playlist_items(playlist_id, max_results)
        
        print(f"Found {len(videos)} videos in Watch Later playlist")
        return videos
    
    def save_to_file(self, videos, filename='watch_later_videos.json'):
        """Save video list to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(videos, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {len(videos)} videos to {filename}")
    
    def print_videos(self, videos, limit=10):
        """Print video information to console"""
        print(f"\n📺 Watch Later Videos (showing first {min(limit, len(videos))}):")
        print("-" * 80)
        
        for i, video in enumerate(videos[:limit], 1):
            print(f"{i}. {video['title']}")
            print(f"   Channel: {video['channel']}")
            print(f"   URL: {video['url']}")
            print(f"   Added: {video['added_to_playlist']}")
            print()


def main():
    """Main function to run the Watch Later extractor"""
    try:
        # Initialize YouTube client
        yt = YouTubeWatchLater()
        
        # Get Watch Later videos
        videos = yt.get_watch_later_videos()
        
        if videos:
            # Print first 10 videos
            yt.print_videos(videos, limit=10)
            
            # Save all videos to file
            yt.save_to_file(videos)
            
            # Create URL list file
            urls_filename = 'watch_later_urls.txt'
            with open(urls_filename, 'w') as f:
                for video in videos:
                    f.write(f"{video['url']}\n")
            print(f"✓ Saved {len(videos)} URLs to {urls_filename}")
        
        else:
            print("No videos found in Watch Later playlist")
    
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("\nSetup Instructions:")
        print("1. Go to https://console.developers.google.com/")
        print("2. Create a new project or select existing one")
        print("3. Enable YouTube Data API v3")
        print("4. Create OAuth 2.0 credentials (Desktop application)")
        print("5. Download the credentials JSON file as 'credentials.json'")
    
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == '__main__':
    main()