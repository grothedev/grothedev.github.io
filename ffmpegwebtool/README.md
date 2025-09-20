# FFmpeg Web Tool

A lightweight web-based interface for FFmpeg processing, allowing users to convert and process audio/video files through a simple HTML interface.

## Features

- **File Input Options**: Upload local files or provide remote URLs
- **Multiple Output Formats**: MP4, AVI, MOV, MKV, WebM, MP3, WAV, FLAC
- **Quality Presets**: High, Medium, Low quality options
- **Custom FFmpeg Options**: Advanced users can specify custom FFmpeg parameters
- **Real-time Processing**: Live output from FFmpeg processing
- **Security**: File type validation, size limits, and automatic cleanup

## Requirements

- PHP 7.0 or higher
- FFmpeg installed on the server
- Web server (Apache/Nginx) with PHP support
- Write permissions for uploads/ and output/ directories

## Installation

1. Clone or download the files to your web server directory
2. Ensure FFmpeg is installed and accessible via command line
3. Set proper permissions for the web server to create directories and files
4. Access `index.html` in your web browser

## Configuration

Edit `config.php` to customize:
- Maximum file size limits
- Allowed file extensions
- FFmpeg binary path
- Processing timeouts

## File Structure

```
ffmpegwebtool/
├── index.html          # Main interface
├── process.php         # Backend processing script
├── config.php          # Configuration settings
├── .htaccess          # Apache configuration
├── uploads/           # Temporary uploaded files (auto-created)
├── output/            # Processed output files (auto-created)
└── temp/              # Temporary processing files (auto-created)
```

## Security Features

- File type validation
- Size limits (500MB default)
- Automatic file cleanup
- Input sanitization
- URL validation for remote files

## Usage

1. Choose input method (local file or remote URL)
2. Select output format and quality
3. Optionally add custom FFmpeg options
4. Click "Process with FFmpeg"
5. Download the processed file when complete

## Supported Formats

### Input
- Video: MP4, AVI, MOV, MKV, WebM
- Audio: MP3, WAV, FLAC, M4A, AAC

### Output  
- Video: MP4, AVI, MOV, MKV, WebM
- Audio: MP3, WAV, FLAC

## Troubleshooting

- Ensure FFmpeg is installed: `ffmpeg -version`
- Check PHP error logs for processing issues
- Verify write permissions on directories
- Adjust timeout settings for large files