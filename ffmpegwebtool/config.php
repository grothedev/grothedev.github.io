<?php
// Configuration file for FFmpeg Web Tool

// Security settings
define('MAX_FILE_SIZE', 500 * 1024 * 1024); // 500MB in bytes
define('MAX_EXECUTION_TIME', 300); // 5 minutes
define('ALLOWED_UPLOAD_EXTENSIONS', ['mp4', 'avi', 'mov', 'mkv', 'webm', 'mp3', 'wav', 'flac', 'm4a', 'aac']);
define('ALLOWED_OUTPUT_FORMATS', ['mp4', 'avi', 'mov', 'mkv', 'webm', 'mp3', 'wav', 'flac']);

// Paths
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('OUTPUT_DIR', __DIR__ . '/output/');
define('TEMP_DIR', __DIR__ . '/temp/');

// FFmpeg settings
define('FFMPEG_PATH', 'ffmpeg'); // Adjust if ffmpeg is in a different location
define('MAX_CONCURRENT_PROCESSES', 3);

// URL validation
function isValidUrl($url) {
    return filter_var($url, FILTER_VALIDATE_URL) && 
           (strpos($url, 'http://') === 0 || strpos($url, 'https://') === 0);
}

// File extension validation
function isAllowedExtension($filename, $allowedExtensions) {
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($extension, $allowedExtensions);
}

// Clean old files (files older than 1 hour)
function cleanOldFiles() {
    $directories = [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR];
    $maxAge = 3600; // 1 hour in seconds
    
    foreach ($directories as $dir) {
        if (!is_dir($dir)) continue;
        
        $files = glob($dir . '*');
        foreach ($files as $file) {
            if (is_file($file) && (time() - filemtime($file)) > $maxAge) {
                unlink($file);
            }
        }
    }
}

// Initialize directories
function initializeDirectories() {
    $directories = [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR];
    
    foreach ($directories as $dir) {
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}

// Check if FFmpeg is available
function checkFFmpegAvailability() {
    $output = [];
    $returnCode = 0;
    exec(FFMPEG_PATH . ' -version 2>&1', $output, $returnCode);
    return $returnCode === 0;
}
?>