# imgc

CLI 기반 이미지 압축 및 포맷 변환 도구

## 설치

```bash
# 프로젝트 디렉토리에서 의존성 설치 및 빌드
cd ~/Documents/Tools/imgc
pnpm install
pnpm build

# 심볼릭 링크 등록 (전역 사용)
~/Documents/Tools/link-tool add imgc
```

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
| `-f, --format <포맷>` | 출력 포맷: png, jpg, webp, svg | 원본 유지 |
| `-k, --keep` | 원본 파일 보존 (`_compressed` 접미사로 생성) | - |
| `-r, --replace` | 원본 파일 대치 | (기본값) |
| `-t, --target-size <크기>` | 목표 파일 크기 (예: 200KB, 1MB) | - |
| `-h, --help` | 도움말 출력 | - |

### 예시

```bash
# 기본 압축 (80% 품질)
imgc image.png

# 60% 품질로 압축
imgc *.png -q 60

# WebP 포맷으로 변환
imgc photo.jpg -f webp

# 원본 보존하며 압축
imgc logo.png -k

# 100KB 목표로 압축 (자동 품질 조절)
imgc banner.jpg -t 100KB

# 여러 파일 일괄 처리
imgc image1.png image2.jpg image3.webp -q 70 -k
```

## 지원 포맷

| 입력 | 출력 | 비고 |
|------|------|------|
| PNG | PNG, JPG, WebP | 래스터 포맷 간 변환 |
| JPG/JPEG | PNG, JPG, WebP | 래스터 포맷 간 변환 |
| WebP | PNG, JPG, WebP | 래스터 포맷 간 변환 |
| SVG | SVG, PNG, JPG, WebP | 벡터 → 래스터 변환 가능 |

- 래스터(PNG/JPG/WebP) → SVG 변환은 지원하지 않습니다 (벡터화 불가)

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
│   ├── index.ts    # CLI 메인
│   └── utils.ts    # 유틸리티 함수
├── tests/
│   └── utils.test.ts
├── dist/           # 빌드 결과물
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## 의존성

- [sharp](https://sharp.pixelplumbing.com/) - 래스터 이미지 처리
- [svgo](https://github.com/svg/svgo) - SVG 최적화
- [tsup](https://tsup.egoist.dev/) - 번들링
- [vitest](https://vitest.dev/) - 테스트

## 라이선스

MIT
