import * as path from "path";
import * as fs from "fs/promises";
import * as readline from "node:readline/promises";
import { formatSize, type Options, type ProcessResult } from "./utils.js";
import { collectImages } from "./walk.js";
import { processImage } from "./processor.js";
import { parseArgs, printUsage } from "./cli.js";

const CONCURRENCY = 8;

// 입력 인자(파일/폴더)로부터 처리 대상 목록을 수집한다.
// 폴더가 하나라도 포함되면 dirTraversed=true (대치 시 확인 프롬프트 트리거)
async function gatherTargets(
  inputs: string[],
  recursive: boolean
): Promise<{ files: string[]; dirTraversed: boolean }> {
  const seen = new Set<string>();
  const files: string[] = [];
  let dirTraversed = false;

  for (const input of inputs) {
    let collected: string[];
    try {
      const stats = await fs.stat(input);
      if (stats.isDirectory()) {
        dirTraversed = true;
      }
      collected = await collectImages(input, recursive);
    } catch {
      // 존재하지 않거나 접근 불가 → processImage가 에러로 보고하도록 그대로 추가
      collected = [input];
    }

    for (const file of collected) {
      const key = path.resolve(file);
      if (!seen.has(key)) {
        seen.add(key);
        files.push(file);
      }
    }
  }

  return { files, dirTraversed };
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(message);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

// 동시성 상한을 두고 작업을 병렬 실행 (완료 순서대로 onDone 호출)
async function runWithConcurrency(
  files: string[],
  limit: number,
  options: Options,
  onDone: (result: ProcessResult) => void
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = new Array(files.length);
  let next = 0;

  async function runner(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= files.length) {
        return;
      }
      const result = await processImage(files[index], options);
      results[index] = result;
      onDone(result);
    }
  }

  const runners = Array.from({ length: Math.min(limit, files.length) }, () =>
    runner()
  );
  await Promise.all(runners);
  return results;
}

function printResult(result: ProcessResult): void {
  const name = path.basename(result.inputPath);
  if (result.success) {
    const reduction = (
      ((result.inputSize - result.outputSize) / result.inputSize) *
      100
    ).toFixed(1);
    console.log(
      `✅ ${name}  ${formatSize(result.inputSize)} → ${formatSize(result.outputSize)} (${reduction}% 감소)`
    );
  } else {
    console.log(`❌ ${name}  ${result.error}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const { files: inputs, options } = parseArgs(args);

  if (inputs.length === 0) {
    console.error("오류: 처리할 파일 또는 폴더를 지정해야 합니다");
    printUsage();
    process.exit(1);
  }

  const { files, dirTraversed } = await gatherTargets(inputs, options.recursive);

  if (files.length === 0) {
    console.error("처리할 이미지가 없습니다");
    process.exit(1);
  }

  // 폴더 일괄 대치는 되돌릴 수 없으므로 확인을 받는다
  if (!options.keep && dirTraversed && !options.yes) {
    if (!process.stdin.isTTY) {
      console.error(
        `오류: ${files.length}개 원본을 대치합니다. 비대화형 환경에서는 --yes 또는 --keep 이 필요합니다`
      );
      process.exit(1);
    }
    const ok = await confirm(
      `⚠️  ${files.length}개 원본 파일을 대치합니다 (되돌릴 수 없음). 계속할까요? [y/N] `
    );
    if (!ok) {
      console.log("취소되었습니다");
      process.exit(0);
    }
  }

  console.log(
    `\n📷 이미지 ${files.length}개 처리 시작 (품질: ${options.quality}%${options.keep ? ", 원본 보존" : ", 원본 대치"})\n`
  );

  const results = await runWithConcurrency(
    files,
    CONCURRENCY,
    options,
    printResult
  );

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
