# imgc

CLI 기반 이미지 압축 및 포맷 변환 도구

## 설치

```bash
git clone <repository-url>
cd imgc
pnpm install
pnpm build

# 전역 명령어로 등록
npm link
```

설치 후 `imgc` 명령어를 전역에서 사용할 수 있습니다.

## 개발

```bash
# 의존성 설치
pnpm install

# 개발 모드 (watch)
pnpm dev

# 빌드
pnpm build

# 타입 체크
pnpm typecheck

# 테스트
pnpm test
pnpm test:watch  # watch 모드
```

## 사용법

```bash
imgc <파일...> [옵션]
```

### 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-q, --quality <값>` | 압축 품질 (1-100) | 80 |
| `-f, --format <포맷>` | 출력 포맷: png, jpg, webp, avif, svg, ico | 원본 유지 |
| `-r, --replace` | 원본 파일 대치 | (기본값) |
| `-k, --keep` | 원본 파일 보존 (`_compressed` 접미사로 생성) | - |
| `-t, --target-size <크기>` | 목표 파일 크기 (예: 200KB, 1MB) | - |
| `-w, --max-width <px>` | 최대 가로 픽셀 (비율 유지 다운스케일) | - |
| `-R, --recursive` | 하위 폴더까지 재귀 처리 | - |
| `-y, --yes` | 재귀 대치 시 확인 프롬프트 생략 | - |
| `-h, --help` | 도움말 출력 | - |

> ⚠️ 기본 동작은 **원본 대치**입니다. 원본을 남기려면 `-k`를 사용하세요.
> 폴더를 대치 모드로 처리하면 실행 전 확인 프롬프트가 표시되며, `-y`로 생략하거나
> 비대화형(파이프) 환경에서는 `--yes` 또는 `--keep`이 필요합니다.

### 예시

```bash
# 기본 압축 (80% 품질, 원본 대치)
imgc image.png

# 원본을 남기고 압축 (_compressed 생성)
imgc image.png -k

# 60% 품질로 압축
imgc *.png -q 60

# WebP / AVIF 포맷으로 변환 (AVIF가 더 강하게 압축됩니다)
imgc photo.jpg -f webp
imgc photo.jpg -f avif

# 파비콘(ICO) 생성
imgc logo.png -f ico

# 100KB 목표로 압축 (자동 품질 조절)
imgc banner.jpg -t 100KB

# 가로 1920px로 다운스케일하며 압축
imgc photo.jpg -w 1920

# 폴더 하위 이미지 일괄 처리 (재귀)
imgc ./assets -R

# 여러 파일 일괄 처리
imgc image1.png image2.jpg image3.webp -q 70
```

## 지원 포맷

| 입력 | 출력 | 비고 |
|------|------|------|
| PNG | PNG, JPG, WebP, AVIF, ICO | 래스터 포맷 간 변환 |
| JPG/JPEG | PNG, JPG, WebP, AVIF, ICO | 래스터 포맷 간 변환 |
| WebP | PNG, JPG, WebP, AVIF, ICO | 래스터 포맷 간 변환 |
| SVG | SVG, PNG, JPG, WebP, AVIF, ICO | 벡터 → 래스터 변환 가능 |

- 래스터(PNG/JPG/WebP) → SVG 변환은 지원하지 않습니다 (벡터화 불가)
- ICO 출력은 파비콘용으로 16x16, 32x32, 48x48 크기를 포함합니다
- 폴더 경로를 인자로 주면 해당 폴더의 이미지를 처리하며, `-R`로 하위 폴더까지 재귀 처리합니다

## 목표 용량 압축

`-t` 옵션을 사용하면 지정한 용량에 맞춰 자동으로 품질을 조절합니다.

```bash
imgc large-image.jpg -t 500KB
```

내부적으로 이진 탐색 알고리즘을 사용하여 목표 용량에 가장 근접한 품질 값을 찾습니다.

## 프로젝트 구조

```
imgc/
├── src/
│   ├── index.ts      # 엔트리 / 오케스트레이션 (수집·확인·병렬 처리·요약)
│   ├── cli.ts        # 인자 파싱 / 도움말
│   ├── processor.ts  # 이미지 변환·압축 로직
│   ├── walk.ts       # 디렉터리 재귀 수집
│   └── utils.ts      # 타입 / 순수 유틸리티 함수
├── tests/
│   ├── utils.test.ts
│   ├── cli.test.ts
│   ├── walk.test.ts
│   └── processor.test.ts
├── dist/           # 빌드 결과물
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## 의존성

- [sharp](https://sharp.pixelplumbing.com/) - 래스터 이미지 처리
- [svgo](https://github.com/svg/svgo) - SVG 최적화
- [png-to-ico](https://www.npmjs.com/package/png-to-ico) - ICO 변환
- [tsup](https://tsup.egoist.dev/) - 번들링
- [vitest](https://vitest.dev/) - 테스트

## 라이선스

MIT
