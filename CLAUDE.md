# imgc 프로젝트 규칙

## TypeScript

- TypeScript 최신 버전을 사용합니다. 새로운 문법과 기능을 적극 활용하세요.
- `tsconfig.json`의 strict 모드를 준수합니다.
- any 는 사용하지 않습니다.

## 빌드

- tsup을 사용하여 번들링합니다.
- 빌드 결과물은 `dist/` 폴더에 생성됩니다.
- `pnpm build`로 빌드합니다.

## 테스트

- vitest를 사용합니다.
- 기능 추가/수정 시 테스트 코드 작성이 필요합니다.
- 테스트 파일은 `tests/` 폴더에 `*.test.ts` 형식으로 작성합니다.
- `pnpm test`로 테스트를 실행합니다.

## 실행 환경

- Node.js 18+ 필요
- ESM 모듈 시스템을 사용합니다 (`"type": "module"`).

## 검증

코드 작성이 완료되면, 아래와 같은 절차로 구현된 코드가 정상적인지 검증합니다.

1. `pnpm typecheck` - 타입 오류 확인
2. `pnpm test` - 모든 테스트 통과 확인
3. `pnpm build` - 빌드 성공 확인
