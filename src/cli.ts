import { parseSize, type OutputFormat, type Options } from "./utils.js";

const VALID_FORMATS = ["png", "jpg", "webp", "svg", "ico", "avif"];

export function printUsage(): void {
  console.log(`
이미지 압축/변환 도구

사용법:
  imgc <파일 또는 폴더...> [옵션]

옵션:
  -q, --quality <값>       압축 품질 1-100 (기본: 80)
  -f, --format <포맷>      출력 포맷: png, jpg, webp, avif, svg, ico
  -k, --keep               원본 파일 보존 (_compressed 접미사로 생성)
  -r, --replace            원본 파일 대치 (기본값)
  -t, --target-size <크기> 목표 파일 크기 (예: 200KB, 1MB)
  -w, --max-width <px>     최대 가로 픽셀 (비율 유지 다운스케일)
  -R, --recursive          하위 폴더까지 재귀 처리
  -y, --yes                재귀 대치 시 확인 프롬프트 생략
  -h, --help               도움말 출력

예시:
  imgc image.png                    # 기본 압축 (80%, 원본 대치)
  imgc *.png -q 60                  # 60% 품질로 압축
  imgc photo.jpg -f webp            # WebP로 변환
  imgc photo.jpg -f avif            # AVIF로 변환 (더 강한 압축)
  imgc logo.png -f ico              # 파비콘(ICO) 생성
  imgc banner.jpg -t 100KB          # 100KB 목표 압축
  imgc photo.jpg -w 1920            # 가로 1920px로 축소
  imgc ./assets -R                  # 폴더 하위 이미지 일괄 처리
  imgc image.png -k                 # 원본 보존 (_compressed 생성)

지원 포맷: PNG, JPG, WebP, SVG (입력) / PNG, JPG, WebP, AVIF, SVG, ICO (출력)
※ 래스터(PNG/JPG/WebP) → SVG 변환은 지원하지 않습니다
※ ICO 출력은 16x16, 32x32, 48x48 크기를 포함합니다
`);
}

export function parseArgs(args: string[]): { files: string[]; options: Options } {
  const files: string[] = [];
  const options: Options = {
    quality: 80,
    keep: false,
    recursive: false,
    yes: false,
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
      if (!format || !VALID_FORMATS.includes(format)) {
        console.error(
          "오류: 포맷은 png, jpg, webp, avif, svg, ico 중 하나여야 합니다"
        );
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
    } else if (arg === "-w" || arg === "--max-width") {
      const value = parseInt(args[++i], 10);
      if (isNaN(value) || value < 1) {
        console.error("오류: 최대 가로 픽셀은 1 이상의 정수여야 합니다");
        process.exit(1);
      }
      options.maxWidth = value;
    } else if (arg === "-R" || arg === "--recursive") {
      options.recursive = true;
    } else if (arg === "-y" || arg === "--yes") {
      options.yes = true;
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
