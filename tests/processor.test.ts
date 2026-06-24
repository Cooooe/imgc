import { describe, it, expect, beforeAll, afterAll } from "vitest";
import sharp from "sharp";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { processImage } from "../src/processor.js";

let tmpDir: string;

async function makePng(name: string, width: number, height: number): Promise<string> {
  const filePath = path.join(tmpDir, name);
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 200 },
    },
  })
    .png()
    .toBuffer();
  await fs.writeFile(filePath, buffer);
  return filePath;
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgc-proc-"));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("processImage", () => {
  it("keep 모드로 _compressed 산출물을 만들고 원본을 보존한다", async () => {
    const input = await makePng("keep.png", 200, 200);
    const result = await processImage(input, {
      quality: 80,
      keep: true,
      recursive: false,
      yes: false,
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toContain("keep_compressed.png");
    await expect(fs.access(input)).resolves.toBeUndefined();
    await expect(fs.access(result.outputPath)).resolves.toBeUndefined();
  });

  it("포맷을 변환하고 대치 시 원본을 삭제한다", async () => {
    const input = await makePng("conv.png", 200, 200);
    const result = await processImage(input, {
      quality: 80,
      keep: false,
      format: "webp",
      recursive: false,
      yes: false,
    });

    expect(result.success).toBe(true);
    expect(result.format).toBe("webp");
    expect(result.outputPath.endsWith(".webp")).toBe(true);
    await expect(fs.access(input)).rejects.toThrow();
  });

  it("maxWidth 로 비율 유지 다운스케일한다", async () => {
    const input = await makePng("resize.png", 800, 400);
    const result = await processImage(input, {
      quality: 80,
      keep: true,
      maxWidth: 400,
      recursive: false,
      yes: false,
    });

    expect(result.success).toBe(true);
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(200);
  });

  it("지원하지 않는 포맷은 실패로 보고한다", async () => {
    const txt = path.join(tmpDir, "x.txt");
    await fs.writeFile(txt, "hello");
    const result = await processImage(txt, {
      quality: 80,
      keep: true,
      recursive: false,
      yes: false,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("지원하지 않는 포맷");
  });
});
