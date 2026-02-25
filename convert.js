const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { cpus } = require("os");
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

const DEFAULT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tiff",
  ".svg",
];

function getDefaultConfig() {
  return {
    sourceDir: "./assets",
    outputDir: "./assets_webp",
    quality: 80,
    targetSize: 200,
    minQuality: 80,
    resize: {
      enabled: false,
      width: 1200,
      height: 630,
    },
    extensions: DEFAULT_EXTENSIONS,
    concurrency: Math.max(1, cpus().length - 1),
  };
}

function normalizeConfig(configData) {
  const defaults = getDefaultConfig();
  const normalized = {
    ...defaults,
    ...configData,
    resize: { ...defaults.resize, ...(configData.resize || {}) },
    extensions: configData.extensions || defaults.extensions,
  };

  if (typeof normalized.minQuality !== "number") {
    normalized.minQuality = normalized.quality;
  }
  if (normalized.targetSize == null) {
    normalized.targetSize = null;
  }
  if (!normalized.concurrency) {
    normalized.concurrency = Math.max(1, cpus().length - 1);
  }

  return normalized;
}

function listAvailableConfigs() {
  console.log("\nAvailable configs:");
  const configsDir = path.join(__dirname, "configs");
  if (fs.existsSync(configsDir)) {
    fs.readdirSync(configsDir)
      .filter((f) => f.endsWith(".json"))
      .forEach((f) => console.log(`  - ${f.replace(".json", "")}`));
  }
}

// Load configuration from file(s) or use default
function loadConfigs() {
  const args = process.argv.slice(2);
  const configArg = args.find((arg) => arg.startsWith("--config="));

  if (!configArg) {
    return [getDefaultConfig()];
  }

  const configNames = configArg
    .split("=")[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (configNames.length === 0) {
    console.error("Error: No config names provided.");
    listAvailableConfigs();
    process.exit(1);
  }

  return configNames.map((configName) => {
    const configPath = path.join(__dirname, "configs", `${configName}.json`);

    if (!fs.existsSync(configPath)) {
      console.error(`Error: Config file not found: ${configPath}`);
      listAvailableConfigs();
      process.exit(1);
    }

    try {
      const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const normalized = normalizeConfig(configData);

      console.log(`\nLoaded config: ${normalized.name}`);
      console.log(`Description: ${normalized.description}\n`);

      return normalized;
    } catch (error) {
      console.error(`Error parsing config file: ${error.message}`);
      process.exit(1);
    }
  });
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
          fit: "inside",
          withoutEnlargement: true,
        };
        image = image.resize(resizeOptions);
      }

      // First attempt at conversion with initial quality
      let buffer = await image.webp({ quality: currentQuality }).toBuffer();
      let fileSize = buffer.length / 1024; // Convert to KB

      // Binary search for appropriate quality to meet target size
      if (
        settings.targetSize != null &&
        fileSize > settings.targetSize &&
        currentQuality > settings.minQuality
      ) {
        let minQuality = settings.minQuality;
        let maxQuality = currentQuality;

        // Try up to 5 iterations to find the right quality
        for (let i = 0; i < 5; i++) {
          if (
            Math.abs(fileSize - settings.targetSize) < 1 ||
            maxQuality - minQuality <= 1
          ) {
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
        compressionRatio,
      });
    } catch (error) {
      parentPort.postMessage({
        success: false,
        filePath,
        error: error.message,
      });
    }
  }

  convertImage().catch((error) => {
    parentPort.postMessage({
      success: false,
      filePath,
      error: error.message,
    });
  });
}

// Main thread logic
if (isMainThread) {
  async function processFiles(config) {
    return new Promise(async (resolve) => {
      try {
        // Ensure output directory exists
        if (!fs.existsSync(config.outputDir)) {
          fs.mkdirSync(config.outputDir, { recursive: true });
        }

        // Get all files in the source directory recursively
        const files = await getFiles(config.sourceDir);

      // Filter files by extensions
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return config.extensions.includes(ext);
      });

        if (imageFiles.length === 0) {
          console.log("No image files found in the source directory.");
          resolve();
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
        const relativePath = path.relative(
          config.sourceDir,
          path.dirname(filePath)
        );
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
            settings: config,
          },
        });

        workers.add(worker);

        worker.on("message", (result) => {
          if (result.success) {
            completedCount++;
            totalOriginalSize += result.originalSize;
            totalNewSize += result.newSize;

            console.log(
              `[${completedCount + failedCount}/${
                imageFiles.length
              }] Converted: ${result.filePath} ` +
                `(${result.originalSize.toFixed(
                  2
                )} KB → ${result.newSize.toFixed(2)} KB, ` +
                `Quality: ${
                  result.quality
                }, Ratio: ${result.compressionRatio.toFixed(2)}x)`
            );
          } else {
            failedCount++;
            console.error(
              `[${completedCount + failedCount}/${
                imageFiles.length
              }] Error converting ${result.filePath}: ${result.error}`
            );
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

            console.log("\nConversion completed!");
            console.log(`Successfully converted: ${completedCount} files`);
            console.log(`Failed to convert: ${failedCount} files`);
            console.log(
              `Total original size: ${(totalOriginalSize / 1024).toFixed(2)} MB`
            );
            console.log(
              `Total new size: ${(totalNewSize / 1024).toFixed(2)} MB`
            );
            console.log(
              `Space saved: ${(
                (totalOriginalSize - totalNewSize) /
                1024
              ).toFixed(2)} MB (${(
                100 -
                (totalNewSize / totalOriginalSize) * 100
              ).toFixed(2)}%)`
            );
            console.log(`Time taken: ${duration.toFixed(2)} seconds`);
            resolve();
          }
        });

        worker.on("error", (error) => {
          failedCount++;
          console.error(`Worker error for ${filePath}: ${error.message}`);
          workers.delete(worker);

          // Process next file
          const nextIndex = completedCount + failedCount + workers.size;
          if (nextIndex < imageFiles.length) {
            createWorker(imageFiles[nextIndex]);
          } else if (workers.size === 0) {
            resolve();
          }
        });
      }

      // Start initial batch of workers
        const initialBatchSize = Math.min(
          config.concurrency,
          imageFiles.length
        );
        for (let i = 0; i < initialBatchSize; i++) {
          createWorker(imageFiles[i]);
        }
      } catch (error) {
        console.error("An error occurred:", error);
        resolve();
      }
    });
  }

  // Helper function to get all files in a directory recursively
  async function getFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries.map((entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? getFiles(fullPath) : fullPath;
      })
    );

    return files.flat();
  }

  // Run the conversion process
  async function run() {
    const configs = loadConfigs();
    for (const config of configs) {
      await processFiles(config);
    }
  }

  run().catch((error) => {
    console.error("An unexpected error occurred:", error);
  });
}
