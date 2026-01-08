import sharp from "sharp";
import { optimize } from "svgo";
import * as fs from "fs/promises";
import * as path from "path";
import {
  parseSize,
  formatSize,
  getExtension,
  isSupportedFormat,
  isRasterFormat,
  getOutputPath,
  type OutputFormat,
  type Options,
  type ProcessResult,
} from "./utils.js";

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
  quality: number
): Promise<Buffer> {
  const svgBuffer = await fs.readFile(inputPath);
  let pipeline = sharp(svgBuffer, { density: 300 });

  switch (outputFormat) {
    case "png":
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
      break;
    case "jpg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
  }

  return pipeline.toBuffer();
}

// 래스터 이미지 압축/변환
async function compressRaster(
  inputPath: string,
  outputFormat: OutputFormat,
  quality: number
): Promise<Buffer> {
  let pipeline = sharp(inputPath);

  switch (outputFormat) {
    case "png":
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
      break;
    case "jpg":
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    default:
      throw new Error(`지원하지 않는 출력 포맷: ${outputFormat}`);
  }

  return pipeline.toBuffer();
}

// 목표 용량에 맞춰 압축 (이진 탐색)
async function compressToTargetSize(
  inputPath: string,
  outputFormat: OutputFormat,
  targetSize: number,
  inputExt: string
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
      buffer = await svgToRaster(inputPath, outputFormat, mid);
    } else {
      buffer = await compressRaster(inputPath, outputFormat, mid);
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
async function processImage(
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
  const outputPath = getOutputPath(absolutePath, options.format, options.keep);

  try {
    let outputBuffer: Buffer;

    if (inputExt === "svg" && outputFormat === "svg") {
      outputBuffer = await optimizeSvg(absolutePath, outputPath);
    } else if (options.targetSize) {
      const result = await compressToTargetSize(
        absolutePath,
        outputFormat,
        options.targetSize,
        inputExt
      );
      outputBuffer = result.buffer;
      await fs.writeFile(outputPath, outputBuffer);
    } else if (inputExt === "svg") {
      outputBuffer = await svgToRaster(absolutePath, outputFormat, options.quality);
      await fs.writeFile(outputPath, outputBuffer);
    } else {
      outputBuffer = await compressRaster(absolutePath, outputFormat, options.quality);
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

function printUsage(): void {
  console.log(`
이미지 압축/변환 도구

사용법:
  imgc <파일...> [옵션]

옵션:
  -q, --quality <값>     압축 품질 1-100 (기본: 80)
  -f, --format <포맷>    출력 포맷: png, jpg, webp, svg
  -k, --keep             원본 파일 보존 (새 파일 생성)
  -r, --replace          원본 파일 대치 (기본값)
  -t, --target-size <크기>  목표 파일 크기 (예: 200KB, 1MB)
  -h, --help             도움말 출력

예시:
  imgc image.png                    # 기본 압축 (80%)
  imgc *.png -q 60                  # 60% 품질로 압축
  imgc photo.jpg -f webp            # WebP로 변환
  imgc logo.png -k                  # 원본 보존
  imgc banner.jpg -t 100KB          # 100KB 목표 압축

지원 포맷: PNG, JPG, WebP, SVG
※ 래스터(PNG/JPG/WebP) → SVG 변환은 지원하지 않습니다
`);
}

function parseArgs(args: string[]): { files: string[]; options: Options } {
  const files: string[] = [];
  const options: Options = {
    quality: 80,
    keep: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    } else if (arg === "-q" || arg === "--quality") {
      const value = parseInt(args[++i], 10);
      if (isNaN(value) || value < 1 || value > 100) {
        console.error("오류: 품질은 1-100 사이의 값이어야 합니다");
        process.exit(1);
      }
      options.quality = value;
    } else if (arg === "-f" || arg === "--format") {
      const format = args[++i]?.toLowerCase();
      if (!format || !["png", "jpg", "webp", "svg"].includes(format)) {
        console.error("오류: 포맷은 png, jpg, webp, svg 중 하나여야 합니다");
        process.exit(1);
      }
      options.format = format as OutputFormat;
    } else if (arg === "-k" || arg === "--keep") {
      options.keep = true;
    } else if (arg === "-r" || arg === "--replace") {
      options.keep = false;
    } else if (arg === "-t" || arg === "--target-size") {
      const sizeStr = args[++i];
      if (!sizeStr) {
        console.error("오류: 목표 크기를 지정해야 합니다");
        process.exit(1);
      }
      try {
        options.targetSize = parseSize(sizeStr);
      } catch (err) {
        console.error(`오류: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    } else if (!arg.startsWith("-")) {
      files.push(arg);
    } else {
      console.error(`알 수 없는 옵션: ${arg}`);
      printUsage();
      process.exit(1);
    }
    i++;
  }

  return { files, options };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const { files, options } = parseArgs(args);

  if (files.length === 0) {
    console.error("오류: 처리할 파일을 지정해야 합니다");
    printUsage();
    process.exit(1);
  }

  console.log(`\n📷 이미지 처리 시작 (품질: ${options.quality}%)\n`);

  const results: ProcessResult[] = [];

  for (const file of files) {
    process.stdout.write(`처리 중: ${path.basename(file)}... `);
    const result = await processImage(file, options);
    results.push(result);

    if (result.success) {
      const reduction = (
        ((result.inputSize - result.outputSize) / result.inputSize) *
        100
      ).toFixed(1);
      console.log(
        `✅ ${formatSize(result.inputSize)} → ${formatSize(result.outputSize)} (${reduction}% 감소)`
      );
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("\n📊 처리 완료");
  console.log(`   성공: ${successful.length}개`);
  if (failed.length > 0) {
    console.log(`   실패: ${failed.length}개`);
  }

  if (successful.length > 0) {
    const totalInput = successful.reduce((sum, r) => sum + r.inputSize, 0);
    const totalOutput = successful.reduce((sum, r) => sum + r.outputSize, 0);
    const totalReduction = (
      ((totalInput - totalOutput) / totalInput) *
      100
    ).toFixed(1);
    console.log(
      `   총 용량: ${formatSize(totalInput)} → ${formatSize(totalOutput)} (${totalReduction}% 감소)`
    );
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("오류:", err);
  process.exit(1);
});
