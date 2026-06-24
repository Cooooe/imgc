import * as fs from "fs/promises";
import * as path from "path";
import { getExtension, isSupportedFormat, isCompressedArtifact } from "./utils.js";

// 디렉터리 하위의 지원 이미지를 수집 (재귀 옵션)
async function walkDir(dir: string, recursive: boolean): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        const nested = await walkDir(fullPath, recursive);
        results.push(...nested);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = getExtension(entry.name);
    if (isSupportedFormat(ext) && !isCompressedArtifact(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

// 입력 경로(파일 또는 디렉터리)로부터 처리 대상 이미지 목록을 만든다.
// - 파일: 그대로 반환 (지원 여부 판별은 호출부에서 처리해 사용자에게 피드백)
// - 디렉터리: 지원 이미지만 수집, _compressed 산출물은 제외
export async function collectImages(
  inputPath: string,
  recursive: boolean
): Promise<string[]> {
  const stats = await fs.stat(inputPath);

  if (stats.isFile()) {
    return [inputPath];
  }

  if (stats.isDirectory()) {
    return walkDir(inputPath, recursive);
  }

  return [];
}
