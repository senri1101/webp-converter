const PRESETS = {
  "high-quality": {
    quality: 80,
    minQuality: 80,
    targetSize: 200,
    resizeEnabled: false,
    maxWidth: 1200,
    maxHeight: 630,
  },
  thumbnail: {
    quality: 70,
    minQuality: 60,
    targetSize: 50,
    resizeEnabled: true,
    maxWidth: 300,
    maxHeight: 300,
  },
  "thumbnail-small": {
    quality: 65,
    minQuality: 55,
    targetSize: 30,
    resizeEnabled: true,
    maxWidth: 200,
    maxHeight: 200,
  },
  "thumbnail-large": {
    quality: 75,
    minQuality: 65,
    targetSize: 100,
    resizeEnabled: true,
    maxWidth: 512,
    maxHeight: 512,
  },
  ogp: {
    quality: 85,
    minQuality: 75,
    targetSize: 300,
    resizeEnabled: true,
    maxWidth: 1200,
    maxHeight: 630,
  },
  "thumbnail-1024": {
    quality: 25,
    minQuality: 25,
    targetSize: null,
    resizeEnabled: true,
    maxWidth: 1024,
    maxHeight: 1024,
  },
  "original-2048": {
    quality: 90,
    minQuality: 90,
    targetSize: null,
    resizeEnabled: true,
    maxWidth: 2048,
    maxHeight: 2048,
  },
  custom: null,
};

const state = {
  files: [],
  results: [],
  zip: null,
};

const elements = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  selectionLabel: document.getElementById("selection-label"),
  presetSelect: document.getElementById("preset-select"),
  qualityInput: document.getElementById("quality-input"),
  minQualityInput: document.getElementById("min-quality-input"),
  targetSizeInput: document.getElementById("target-size-input"),
  resizeEnabled: document.getElementById("resize-enabled"),
  maxWidthInput: document.getElementById("max-width-input"),
  maxHeightInput: document.getElementById("max-height-input"),
  convertButton: document.getElementById("convert-button"),
  downloadButton: document.getElementById("download-button"),
  clearButton: document.getElementById("clear-button"),
  statusText: document.getElementById("status-text"),
  progressBar: document.getElementById("progress-bar"),
  summaryText: document.getElementById("summary-text"),
  resultsBody: document.getElementById("results-body"),
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isBrowserWebpSupported() {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes.toFixed(0)} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "0.00%";
  }
  return `${value.toFixed(2)}%`;
}

function toWebpBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate WebP blob."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

function getResizedDimensions(width, height, maxWidth, maxHeight) {
  if (!maxWidth || !maxHeight || width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function loadImageElement(file) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = objectUrl;
  });

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw(ctx, targetWidth, targetHeight) {
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    },
    dispose() {
      URL.revokeObjectURL(objectUrl);
    },
  };
}

async function loadImageSource(file) {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(ctx, targetWidth, targetHeight) {
          ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        },
        dispose() {
          if (typeof bitmap.close === "function") {
            bitmap.close();
          }
        },
      };
    } catch (error) {
      return loadImageElement(file);
    }
  }

  return loadImageElement(file);
}

async function encodeWithConstraints(canvas, settings) {
  const initialQuality = clamp(settings.quality, 0, 100) / 100;
  const minQuality = clamp(Math.min(settings.minQuality, settings.quality), 0, 100) / 100;
  const targetSize = settings.targetSize;

  if (!targetSize || targetSize <= 0) {
    const blob = await toWebpBlob(canvas, initialQuality);
    return { blob, quality: Math.round(initialQuality * 100) };
  }

  const minBlob = await toWebpBlob(canvas, minQuality);
  if (minBlob.size / 1024 > targetSize) {
    return { blob: minBlob, quality: Math.round(minQuality * 100) };
  }

  let low = minQuality;
  let high = initialQuality;
  let bestBlob = minBlob;
  let bestQuality = minQuality;

  for (let iteration = 0; iteration < 7; iteration += 1) {
    const mid = (low + high) / 2;
    const blob = await toWebpBlob(canvas, mid);
    const fileSizeKB = blob.size / 1024;

    if (fileSizeKB <= targetSize) {
      bestBlob = blob;
      bestQuality = mid;
      low = mid;
    } else {
      high = mid;
    }

    if (high - low < 0.01) {
      break;
    }
  }

  return { blob: bestBlob, quality: Math.round(bestQuality * 100) };
}

function applyPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) {
    return;
  }

  elements.qualityInput.value = String(preset.quality);
  elements.minQualityInput.value = String(preset.minQuality);
  elements.targetSizeInput.value = preset.targetSize == null ? "" : String(preset.targetSize);
  elements.resizeEnabled.checked = preset.resizeEnabled;
  elements.maxWidthInput.value = String(preset.maxWidth);
  elements.maxHeightInput.value = String(preset.maxHeight);
}

function readSettings() {
  const quality = clamp(Number(elements.qualityInput.value) || 80, 0, 100);
  const minQuality = clamp(Number(elements.minQualityInput.value) || quality, 0, 100);
  const targetSizeRaw = elements.targetSizeInput.value.trim();
  const targetSize = targetSizeRaw ? Math.max(1, Number(targetSizeRaw)) : null;

  return {
    quality,
    minQuality: Math.min(minQuality, quality),
    targetSize: Number.isFinite(targetSize) ? targetSize : null,
    resizeEnabled: elements.resizeEnabled.checked,
    maxWidth: Math.max(1, Number(elements.maxWidthInput.value) || 1),
    maxHeight: Math.max(1, Number(elements.maxHeightInput.value) || 1),
  };
}

function updateSelectionLabel() {
  if (state.files.length === 0) {
    elements.selectionLabel.textContent = "No files selected.";
    return;
  }
  elements.selectionLabel.textContent = `${state.files.length} file(s) selected.`;
}

function setFiles(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  state.files = files;
  updateSelectionLabel();
}

function clearResults() {
  state.results = [];
  state.zip = null;
  elements.downloadButton.disabled = true;
  elements.summaryText.textContent = "No results yet.";
  elements.resultsBody.innerHTML = `
    <tr>
      <td colspan="6" class="placeholder">Converted files will appear here.</td>
    </tr>
  `;
}

function renderResults(results) {
  if (results.length === 0) {
    clearResults();
    return;
  }

  const totalOriginal = results.reduce((sum, item) => sum + item.originalSize, 0);
  const totalConverted = results.reduce((sum, item) => sum + item.convertedSize, 0);
  const saved = totalOriginal > 0 ? ((totalOriginal - totalConverted) / totalOriginal) * 100 : 0;

  elements.summaryText.textContent = `${results.length} file(s), ${formatPercent(saved)} total reduction.`;

  elements.resultsBody.innerHTML = "";
  results.forEach((result) => {
    const row = document.createElement("tr");

    const fileCell = document.createElement("td");
    fileCell.textContent = result.name;

    const originalCell = document.createElement("td");
    originalCell.textContent = formatSize(result.originalSize);

    const convertedCell = document.createElement("td");
    convertedCell.textContent = formatSize(result.convertedSize);

    const savedCell = document.createElement("td");
    const reduction = result.originalSize > 0
      ? ((result.originalSize - result.convertedSize) / result.originalSize) * 100
      : 0;
    savedCell.textContent = formatPercent(reduction);

    const qualityCell = document.createElement("td");
    qualityCell.textContent = `${result.quality}%`;

    const downloadCell = document.createElement("td");
    const downloadLink = document.createElement("a");
    downloadLink.href = result.objectUrl;
    downloadLink.download = result.outputName;
    downloadLink.className = "download-link";
    downloadLink.textContent = "Download";
    downloadCell.appendChild(downloadLink);

    row.append(fileCell, originalCell, convertedCell, savedCell, qualityCell, downloadCell);
    elements.resultsBody.appendChild(row);
  });
}

function resetProgress() {
  elements.progressBar.value = 0;
  elements.progressBar.max = 1;
}

function releaseObjectUrls() {
  for (const result of state.results) {
    URL.revokeObjectURL(result.objectUrl);
  }
}

async function convertAll() {
  if (!isBrowserWebpSupported()) {
    elements.statusText.textContent = "This browser does not support WebP encoding.";
    return;
  }

  if (state.files.length === 0) {
    elements.statusText.textContent = "Select at least one image file first.";
    return;
  }

  const settings = readSettings();
  const zip = typeof window.JSZip !== "undefined" ? new window.JSZip() : null;

  elements.convertButton.disabled = true;
  elements.downloadButton.disabled = true;
  elements.statusText.textContent = "Preparing conversion...";

  releaseObjectUrls();
  clearResults();

  const results = [];
  const total = state.files.length;
  let failedCount = 0;
  elements.progressBar.max = total;

  for (let index = 0; index < total; index += 1) {
    const file = state.files[index];
    elements.statusText.textContent = `Converting ${index + 1}/${total}: ${file.name}`;
    let source = null;

    try {
      source = await loadImageSource(file);
      const dimensions = settings.resizeEnabled
        ? getResizedDimensions(source.width, source.height, settings.maxWidth, settings.maxHeight)
        : { width: source.width, height: source.height };

      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const context = canvas.getContext("2d", { alpha: true });
      if (!context) {
        throw new Error("Could not create a 2D rendering context.");
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      source.draw(context, dimensions.width, dimensions.height);

      const { blob, quality } = await encodeWithConstraints(canvas, settings);

      const outputName = `${file.name.replace(/\.[^./]+$/, "")}.webp`;
      const objectUrl = URL.createObjectURL(blob);

      results.push({
        name: file.name,
        outputName,
        originalSize: file.size,
        convertedSize: blob.size,
        quality,
        blob,
        objectUrl,
      });

      if (zip) {
        zip.file(outputName, blob);
      }
    } catch (error) {
      failedCount += 1;
      console.error(`Failed to convert ${file.name}:`, error);
    } finally {
      if (source) {
        source.dispose();
      }
    }

    elements.progressBar.value = index + 1;
  }

  state.results = results;
  state.zip = zip;

  renderResults(results);

  if (results.length === 0) {
    elements.statusText.textContent = "No files were converted. Check file formats and try again.";
  } else {
    elements.statusText.textContent = `Done. Converted ${results.length} file(s).`;
    if (failedCount > 0) {
      elements.statusText.textContent += ` Failed: ${failedCount}.`;
    }
    elements.downloadButton.disabled = !zip;
    if (!zip) {
      elements.statusText.textContent += " ZIP library unavailable, use per-file download.";
    }
  }

  elements.convertButton.disabled = false;
}

async function downloadZip() {
  if (!state.zip || state.results.length === 0) {
    return;
  }

  elements.downloadButton.disabled = true;
  elements.statusText.textContent = "Building ZIP archive...";

  try {
    const zipBlob = await state.zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archiveUrl = URL.createObjectURL(zipBlob);

    const link = document.createElement("a");
    link.href = archiveUrl;
    link.download = `webp-converted-${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(archiveUrl);
    elements.statusText.textContent = "ZIP downloaded.";
  } catch (error) {
    console.error("ZIP export failed:", error);
    elements.statusText.textContent = "ZIP download failed. Use per-file downloads.";
  }

  elements.downloadButton.disabled = false;
}

function clearAll() {
  state.files = [];
  elements.fileInput.value = "";
  updateSelectionLabel();
  elements.statusText.textContent = "Ready.";
  resetProgress();
  releaseObjectUrls();
  clearResults();
}

function markCustomPreset() {
  elements.presetSelect.value = "custom";
}

function initializeEvents() {
  elements.dropzone.addEventListener("click", () => {
    elements.fileInput.click();
  });

  elements.dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.fileInput.click();
    }
  });

  elements.fileInput.addEventListener("change", (event) => {
    setFiles(event.target.files || []);
  });

  elements.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("dragover");
  });

  elements.dropzone.addEventListener("dragleave", () => {
    elements.dropzone.classList.remove("dragover");
  });

  elements.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("dragover");
    setFiles(event.dataTransfer?.files || []);
  });

  elements.presetSelect.addEventListener("change", () => {
    applyPreset(elements.presetSelect.value);
  });

  [
    elements.qualityInput,
    elements.minQualityInput,
    elements.targetSizeInput,
    elements.resizeEnabled,
    elements.maxWidthInput,
    elements.maxHeightInput,
  ].forEach((input) => {
    input.addEventListener("input", markCustomPreset);
    input.addEventListener("change", markCustomPreset);
  });

  elements.convertButton.addEventListener("click", convertAll);
  elements.downloadButton.addEventListener("click", downloadZip);
  elements.clearButton.addEventListener("click", clearAll);
}

function initialize() {
  applyPreset("high-quality");
  updateSelectionLabel();
  clearResults();
  resetProgress();
  initializeEvents();
}

initialize();
