import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { collectImages } from "../src/walk.js";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgc-walk-"));
  await fs.writeFile(path.join(tmpDir, "a.png"), "x");
  await fs.writeFile(path.join(tmpDir, "b.jpg"), "x");
  await fs.writeFile(path.join(tmpDir, "note.txt"), "x");
  await fs.writeFile(path.join(tmpDir, "c_compressed.png"), "x");
  const sub = path.join(tmpDir, "sub");
  await fs.mkdir(sub);
  await fs.writeFile(path.join(sub, "d.webp"), "x");
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("collectImages", () => {
  it("파일 경로는 그대로 반환한다", async () => {
    const file = path.join(tmpDir, "a.png");
    expect(await collectImages(file, false)).toEqual([file]);
  });

  it("디렉터리에서 지원 이미지만 수집하고 _compressed/비이미지는 제외한다", async () => {
    const result = (await collectImages(tmpDir, false)).map((p) =>
      path.basename(p)
    );
    expect(result.sort()).toEqual(["a.png", "b.jpg"]);
  });

  it("비재귀일 때 하위 폴더는 탐색하지 않는다", async () => {
    const result = await collectImages(tmpDir, false);
    expect(result.some((p) => p.includes("sub"))).toBe(false);
  });

  it("재귀일 때 하위 폴더까지 수집한다", async () => {
    const result = (await collectImages(tmpDir, true)).map((p) =>
      path.basename(p)
    );
    expect(result.sort()).toEqual(["a.png", "b.jpg", "d.webp"]);
  });
});
