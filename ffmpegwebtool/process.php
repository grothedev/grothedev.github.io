<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

function sanitizeFilename($filename) {
    return preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
}

function getOutputExtension($format) {
    $extensions = [
        'mp4' => 'mp4',
        'avi' => 'avi',
        'mov' => 'mov',
        'mkv' => 'mkv',
        'webm' => 'webm',
        'mp3' => 'mp3',
        'wav' => 'wav',
        'flac' => 'flac'
    ];
    return $extensions[$format] ?? 'mp4';
}

function getQualityOptions($quality, $format) {
    $isAudio = in_array($format, ['mp3', 'wav', 'flac']);
    
    if ($isAudio) {
        switch ($quality) {
            case 'high': return '-q:a 0';
            case 'medium': return '-q:a 2';
            case 'low': return '-q:a 4';
        }
    } else {
        switch ($quality) {
            case 'high': return '-crf 18 -preset medium';
            case 'medium': return '-crf 23 -preset medium';
            case 'low': return '-crf 28 -preset fast';
        }
    }
    return '';
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST requests are allowed');
    }

    $inputType = $_POST['inputType'] ?? 'file';
    $outputFormat = $_POST['outputFormat'] ?? 'mp4';
    $quality = $_POST['quality'] ?? 'medium';
    $customOptions = trim($_POST['customOptions'] ?? '');

    // Create directories
    $uploadDir = 'uploads/';
    $outputDir = 'output/';
    
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    if (!file_exists($outputDir)) {
        mkdir($outputDir, 0755, true);
    }

    $inputFile = '';
    $tempInput = false;

    if ($inputType === 'file') {
        if (!isset($_FILES['inputFile']) || $_FILES['inputFile']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('No file uploaded or upload error');
        }
        
        $uploadedFile = $_FILES['inputFile'];
        $filename = sanitizeFilename($uploadedFile['name']);
        $inputFile = $uploadDir . uniqid() . '_' . $filename;
        
        if (!move_uploaded_file($uploadedFile['tmp_name'], $inputFile)) {
            throw new Exception('Failed to save uploaded file');
        }
        $tempInput = true;
    } else {
        $inputUrl = $_POST['inputUrl'] ?? '';
        if (empty($inputUrl) || !filter_var($inputUrl, FILTER_VALIDATE_URL)) {
            throw new Exception('Invalid URL provided');
        }
        $inputFile = $inputUrl;
    }

    // Generate output filename
    $outputExtension = getOutputExtension($outputFormat);
    $outputFile = $outputDir . uniqid() . '_output.' . $outputExtension;

    // Build FFmpeg command
    $ffmpegCmd = 'ffmpeg -i ' . escapeshellarg($inputFile);
    
    // Add quality options
    $qualityOptions = getQualityOptions($quality, $outputFormat);
    if ($qualityOptions) {
        $ffmpegCmd .= ' ' . $qualityOptions;
    }
    
    // Add custom options if provided
    if ($customOptions) {
        $ffmpegCmd .= ' ' . $customOptions;
    }
    
    // Add output file and overwrite option
    $ffmpegCmd .= ' -y ' . escapeshellarg($outputFile) . ' 2>&1';

    // Execute FFmpeg command
    $output = [];
    $returnCode = 0;
    exec($ffmpegCmd, $output, $returnCode);
    
    $logOutput = implode("\n", $output);

    if ($returnCode !== 0) {
        // Clean up files on error
        if ($tempInput && file_exists($inputFile)) {
            unlink($inputFile);
        }
        if (file_exists($outputFile)) {
            unlink($outputFile);
        }
        throw new Exception('FFmpeg processing failed: ' . $logOutput);
    }

    // Clean up input file if it was uploaded
    if ($tempInput && file_exists($inputFile)) {
        unlink($inputFile);
    }

    // Check if output file was created
    if (!file_exists($outputFile)) {
        throw new Exception('Output file was not created');
    }

    echo json_encode([
        'success' => true,
        'outputFile' => $outputFile,
        'log' => $logOutput,
        'fileSize' => filesize($outputFile)
    ]);

} catch (Exception $e) {
    // Clean up on error
    if (isset($tempInput) && $tempInput && isset($inputFile) && file_exists($inputFile)) {
        unlink($inputFile);
    }
    if (isset($outputFile) && file_exists($outputFile)) {
        unlink($outputFile);
    }

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'log' => $logOutput ?? ''
    ]);
}
?>