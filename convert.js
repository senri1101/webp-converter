const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { cpus } = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// Configuration
const config = {
  sourceDir: './images', // Source directory containing images
  outputDir: './images_webp', // Output directory for WebP images
  quality: 80, // WebP quality (0-100), higher means better quality but larger file size
  targetSize: 20, // Target size in KB
  minQuality: 40, // Minimum quality to maintain decent visuals
  resize: {
    enabled: false, // Enable/disable resizing
    width: 1200, // Maximum width if resize is enabled
    height: 630 // Maximum height if resize is enabled (for OGP images, common aspect ratio is 1.91:1)
  },
  extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'], // Extensions to convert
  concurrency: Math.max(1, cpus().length - 1) // Use all CPUs but one
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Worker thread logic
if (!isMainThread) {
  const { filePath, outputPath, settings } = workerData;
  
  async function convertImage() {
    try {
      // Start with the configured quality
      let currentQuality = settings.quality;
      let image = sharp(filePath);
      const metadata = await image.metadata();
      
      // Resize if enabled and image is larger than target dimensions
      if (settings.resize.enabled) {
        const resizeOptions = {
          width: settings.resize.width,
          height: settings.resize.height,
          fit: 'inside',
          withoutEnlargement: true
        };
        image = image.resize(resizeOptions);
      }
      
      // First attempt at conversion with initial quality
      let buffer = await image.webp({ quality: currentQuality }).toBuffer();
      let fileSize = buffer.length / 1024; // Convert to KB
      
      // Binary search for appropriate quality to meet target size
      if (fileSize > settings.targetSize && currentQuality > settings.minQuality) {
        let minQuality = settings.minQuality;
        let maxQuality = currentQuality;
        
        // Try up to 5 iterations to find the right quality
        for (let i = 0; i < 5; i++) {
          if (Math.abs(fileSize - settings.targetSize) < 1 || 
              maxQuality - minQuality <= 1) {
            break;
          }
          
          currentQuality = Math.floor((minQuality + maxQuality) / 2);
          buffer = await image.webp({ quality: currentQuality }).toBuffer();
          fileSize = buffer.length / 1024;
          
          if (fileSize > settings.targetSize) {
            maxQuality = currentQuality;
          } else {
            minQuality = currentQuality;
          }
        }
      }
      
      // Final conversion with the determined quality
      await image.webp({ quality: currentQuality }).toFile(outputPath);
      
      // Get the final stats
      const stats = fs.statSync(outputPath);
      const originalStats = fs.statSync(filePath);
      const compressionRatio = originalStats.size / stats.size;
      
      parentPort.postMessage({
        success: true,
        filePath,
        outputPath,
        originalSize: originalStats.size / 1024,
        newSize: stats.size / 1024,
        quality: currentQuality,
        compressionRatio
      });
    } catch (error) {
      parentPort.postMessage({
        success: false,
        filePath,
        error: error.message
      });
    }
  }
  
  convertImage().catch(error => {
    parentPort.postMessage({
      success: false,
      filePath,
      error: error.message
    });
  });
}

// Main thread logic
if (isMainThread) {
  async function processFiles() {
    try {
      // Get all files in the source directory recursively
      const files = await getFiles(config.sourceDir);
      
      // Filter files by extensions
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return config.extensions.includes(ext);
      });
      
      if (imageFiles.length === 0) {
        console.log('No image files found in the source directory.');
        return;
      }
      
      console.log(`Found ${imageFiles.length} image files to convert.`);
      
      // Process images with worker threads
      let completedCount = 0;
      let failedCount = 0;
      let totalOriginalSize = 0;
      let totalNewSize = 0;
      const startTime = Date.now();
      const workers = new Set();
      
      // Function to create a new worker
      function createWorker(filePath) {
        const fileName = path.basename(filePath);
        const outputFileName = `${path.parse(fileName).name}.webp`;
        const relativePath = path.relative(config.sourceDir, path.dirname(filePath));
        const outputSubDir = path.join(config.outputDir, relativePath);
        
        // Create output subdirectory if it doesn't exist
        if (!fs.existsSync(outputSubDir)) {
          fs.mkdirSync(outputSubDir, { recursive: true });
        }
        
        const outputPath = path.join(outputSubDir, outputFileName);
        
        const worker = new Worker(__filename, {
          workerData: {
            filePath,
            outputPath,
            settings: config
          }
        });
        
        workers.add(worker);
        
        worker.on('message', (result) => {
          if (result.success) {
            completedCount++;
            totalOriginalSize += result.originalSize;
            totalNewSize += result.newSize;
            
            console.log(
              `[${completedCount + failedCount}/${imageFiles.length}] Converted: ${result.filePath} ` +
              `(${result.originalSize.toFixed(2)} KB → ${result.newSize.toFixed(2)} KB, ` +
              `Quality: ${result.quality}, Ratio: ${result.compressionRatio.toFixed(2)}x)`
            );
          } else {
            failedCount++;
            console.error(`[${completedCount + failedCount}/${imageFiles.length}] Error converting ${result.filePath}: ${result.error}`);
          }
          
          workers.delete(worker);
          
          // Get next file to process
          const nextIndex = completedCount + failedCount + workers.size;
          if (nextIndex < imageFiles.length) {
            createWorker(imageFiles[nextIndex]);
          } else if (workers.size === 0) {
            // All files processed
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log('\nConversion completed!');
            console.log(`Successfully converted: ${completedCount} files`);
            console.log(`Failed to convert: ${failedCount} files`);
            console.log(`Total original size: ${(totalOriginalSize / 1024).toFixed(2)} MB`);
            console.log(`Total new size: ${(totalNewSize / 1024).toFixed(2)} MB`);
            console.log(`Space saved: ${((totalOriginalSize - totalNewSize) / 1024).toFixed(2)} MB (${(100 - (totalNewSize / totalOriginalSize * 100)).toFixed(2)}%)`);
            console.log(`Time taken: ${duration.toFixed(2)} seconds`);
          }
        });
        
        worker.on('error', (error) => {
          failedCount++;
          console.error(`Worker error for ${filePath}: ${error.message}`);
          workers.delete(worker);
          
          // Process next file
          const nextIndex = completedCount + failedCount + workers.size;
          if (nextIndex < imageFiles.length) {
            createWorker(imageFiles[nextIndex]);
          }
        });
      }
      
      // Start initial batch of workers
      const initialBatchSize = Math.min(config.concurrency, imageFiles.length);
      for (let i = 0; i < initialBatchSize; i++) {
        createWorker(imageFiles[i]);
      }
      
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }
  
  // Helper function to get all files in a directory recursively
  async function getFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    const files = await Promise.all(entries.map(entry => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? getFiles(fullPath) : fullPath;
    }));
    
    return files.flat();
  }
  
  // Run the conversion process
  processFiles();
}
