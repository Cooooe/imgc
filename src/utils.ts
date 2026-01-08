import * as path from "path";

// 타입 정의
export type SupportedFormat = "png" | "jpg" | "jpeg" | "webp" | "svg";
export type OutputFormat = "png" | "jpg" | "webp" | "svg" | "jpeg";

export interface Options {
  quality: number;
  format?: OutputFormat;
  keep: boolean;
  targetSize?: number;
}

export interface ProcessResult {
  inputPath: string;
  outputPath: string;
  inputSize: number;
  outputSize: number;
  format: string;
  success: boolean;
  error?: string;
}

export function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|B)?$/i);
  if (!match) {
    throw new Error(`잘못된 크기 형식: ${sizeStr}. 예: 100KB, 1MB, 500000`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();

  switch (unit) {
    case "KB":
      return value * 1024;
    case "MB":
      return value * 1024 * 1024;
    default:
      return value;
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1);
}

export function isSupportedFormat(ext: string): ext is SupportedFormat {
  return ["png", "jpg", "jpeg", "webp", "svg"].includes(ext);
}

export function isRasterFormat(ext: string): boolean {
  return ["png", "jpg", "jpeg", "webp"].includes(ext);
}

export function getOutputPath(
  inputPath: string,
  outputFormat: OutputFormat | undefined,
  keep: boolean
): string {
  const dir = path.dirname(inputPath);
  const ext = getExtension(inputPath);
  const baseName = path.basename(inputPath, `.${ext}`);
  const newExt = outputFormat || ext;

  if (keep) {
    return path.join(dir, `${baseName}_compressed.${newExt}`);
  }

  if (outputFormat && outputFormat !== ext) {
    return path.join(dir, `${baseName}.${newExt}`);
  }

  return inputPath;
}
