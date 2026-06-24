import sharp from "sharp";
import { optimize } from "svgo";
import pngToIco from "png-to-ico";
import * as fs from "fs/promises";
import * as path from "path";
import {
  getExtension,
  isSupportedFormat,
  isRasterFormat,
  getOutputPath,
  type OutputFormat,
  type Options,
  type ProcessResult,
} from "./utils.js";

// 지정 포맷으로 sharp 파이프라인에 인코딩 설정 적용
function applyFormat(
  pipeline: sharp.Sharp,
  format: OutputFormat,
  quality: number
): sharp.Sharp {
  switch (format) {
    case "png":
      // sharp는 quality 지정 시 palette 양자화를 자동 활성화한다
      return pipeline.png({ quality, compressionLevel: 9 });
    case "jpg":
    case "jpeg":
      return pipeline.jpeg({ quality, mozjpeg: true });
    case "webp":
      return pipeline.webp({ quality, effort: 6, smartSubsample: true });
    case "avif":
      return pipeline.avif({ quality, effort: 4 });
    default:
      throw new Error(`지원하지 않는 출력 포맷: ${format}`);
  }
}

// maxWidth가 지정되면 비율 유지 다운스케일 (확대는 하지 않음)
function applyResize(pipeline: sharp.Sharp, maxWidth?: number): sharp.Sharp {
  if (!maxWidth) {
    return pipeline;
  }
  return pipeline.resize({ width: maxWidth, withoutEnlargement: true });
}

// SVG 최적화
async function optimizeSvg(
  inputPath: string,
  outputPath: string
): Promise<Buffer> {
  const svgContent = await fs.readFile(inputPath, "utf-8");
  const result = optimize(svgContent, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
      "removeDimensions",
    ],
  });

  const optimizedBuffer = Buffer.from(result.data);
  await fs.writeFile(outputPath, optimizedBuffer);
  return optimizedBuffer;
}

// SVG를 래스터 포맷으로 변환
async function svgToRaster(
  inputPath: string,
  outputFormat: OutputFormat,
  quality: number,
  maxWidth?: number
): Promise<Buffer> {
  const svgBuffer = await fs.readFile(inputPath);
  const pipeline = applyResize(sharp(svgBuffer, { density: 300 }), maxWidth);
  return applyFormat(pipeline, outputFormat, quality).toBuffer();
}

// 래스터 이미지 압축/변환
async function compressRaster(
  inputPath: string,
  outputFormat: OutputFormat,
  quality: number,
  maxWidth?: number
): Promise<Buffer> {
  // .rotate(): EXIF 오리엔테이션을 적용한 뒤 메타데이터를 정리한다
  const pipeline = applyResize(sharp(inputPath).rotate(), maxWidth);
  return applyFormat(pipeline, outputFormat, quality).toBuffer();
}

// ICO 변환 (파비콘용)
async function convertToIco(
  inputPath: string,
  inputExt: string
): Promise<Buffer> {
  const sizes = [16, 32, 48];

  let sourceBuffer: Buffer;
  if (inputExt === "svg") {
    // SVG는 고해상도로 래스터화 후 리사이즈
    sourceBuffer = await sharp(await fs.readFile(inputPath), { density: 300 })
      .png()
      .toBuffer();
  } else {
    sourceBuffer = await fs.readFile(inputPath);
  }

  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(sourceBuffer)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
    )
  );

  return pngToIco(pngBuffers);
}

// 목표 용량에 맞춰 압축 (이진 탐색)
async function compressToTargetSize(
  inputPath: string,
  outputFormat: OutputFormat,
  targetSize: number,
  inputExt: string,
  maxWidth?: number
): Promise<{ buffer: Buffer; quality: number }> {
  let low = 1;
  let high = 100;
  let bestBuffer: Buffer | null = null;
  let bestQuality = 80;
  let bestDiff = Infinity;

  for (let i = 0; i < 10 && low <= high; i++) {
    const mid = Math.floor((low + high) / 2);

    let buffer: Buffer;
    if (inputExt === "svg") {
      buffer = await svgToRaster(inputPath, outputFormat, mid, maxWidth);
    } else {
      buffer = await compressRaster(inputPath, outputFormat, mid, maxWidth);
    }

    const diff = Math.abs(buffer.length - targetSize);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestBuffer = buffer;
      bestQuality = mid;
    }

    if (buffer.length > targetSize) {
      high = mid - 1;
    } else if (buffer.length < targetSize) {
      low = mid + 1;
    } else {
      break;
    }
  }

  if (!bestBuffer) {
    throw new Error("압축 실패");
  }

  return { buffer: bestBuffer, quality: bestQuality };
}

// 단일 이미지 처리
export async function processImage(
  inputPath: string,
  options: Options
): Promise<ProcessResult> {
  const absolutePath = path.resolve(inputPath);
  const inputExt = getExtension(absolutePath);

  try {
    await fs.access(absolutePath);
  } catch {
    return {
      inputPath: absolutePath,
      outputPath: "",
      inputSize: 0,
      outputSize: 0,
      format: inputExt,
      success: false,
      error: "파일을 찾을 수 없습니다",
    };
  }

  if (!isSupportedFormat(inputExt)) {
    return {
      inputPath: absolutePath,
      outputPath: "",
      inputSize: 0,
      outputSize: 0,
      format: inputExt,
      success: false,
      error: `지원하지 않는 포맷: ${inputExt}. (png, jpg, webp, svg만 지원)`,
    };
  }

  const outputFormat =
    options.format ||
    ((inputExt === "jpeg" ? "jpg" : inputExt) as OutputFormat);

  if (isRasterFormat(inputExt) && outputFormat === "svg") {
    return {
      inputPath: absolutePath,
      outputPath: "",
      inputSize: 0,
      outputSize: 0,
      format: inputExt,
      success: false,
      error: "래스터 이미지를 SVG로 변환할 수 없습니다 (벡터화 불가)",
    };
  }

  const inputStats = await fs.stat(absolutePath);
  const inputSize = inputStats.size;
  const outputPath = getOutputPath(absolutePath, outputFormat, options.keep);

  try {
    let outputBuffer: Buffer;

    if (outputFormat === "ico") {
      if (options.targetSize) {
        throw new Error("ICO 변환에서는 목표 크기 옵션을 사용할 수 없습니다");
      }
      outputBuffer = await convertToIco(absolutePath, inputExt);
      await fs.writeFile(outputPath, outputBuffer);
    } else if (inputExt === "svg" && outputFormat === "svg") {
      outputBuffer = await optimizeSvg(absolutePath, outputPath);
    } else if (options.targetSize) {
      const result = await compressToTargetSize(
        absolutePath,
        outputFormat,
        options.targetSize,
        inputExt,
        options.maxWidth
      );
      outputBuffer = result.buffer;
      await fs.writeFile(outputPath, outputBuffer);
    } else if (inputExt === "svg") {
      outputBuffer = await svgToRaster(
        absolutePath,
        outputFormat,
        options.quality,
        options.maxWidth
      );
      await fs.writeFile(outputPath, outputBuffer);
    } else {
      outputBuffer = await compressRaster(
        absolutePath,
        outputFormat,
        options.quality,
        options.maxWidth
      );
      await fs.writeFile(outputPath, outputBuffer);
    }

    if (!options.keep && outputPath !== absolutePath) {
      await fs.unlink(absolutePath);
    }

    return {
      inputPath: absolutePath,
      outputPath,
      inputSize,
      outputSize: outputBuffer.length,
      format: outputFormat,
      success: true,
    };
  } catch (err) {
    return {
      inputPath: absolutePath,
      outputPath,
      inputSize,
      outputSize: 0,
      format: outputFormat,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
