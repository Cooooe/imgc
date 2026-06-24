import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("기본값은 replace(대치) 모드이다", () => {
    const { options } = parseArgs(["image.png"]);
    expect(options.keep).toBe(false);
    expect(options.quality).toBe(80);
    expect(options.recursive).toBe(false);
    expect(options.yes).toBe(false);
  });

  it("-k 로 원본 보존을 켤 수 있다", () => {
    expect(parseArgs(["image.png", "-k"]).options.keep).toBe(true);
  });

  it("파일과 옵션을 분리한다", () => {
    const { files, options } = parseArgs([
      "a.png",
      "b.jpg",
      "-q",
      "60",
      "-f",
      "webp",
    ]);
    expect(files).toEqual(["a.png", "b.jpg"]);
    expect(options.quality).toBe(60);
    expect(options.format).toBe("webp");
  });

  it("재귀/확인생략 플래그를 파싱한다", () => {
    const { options } = parseArgs(["./dir", "-R", "-y"]);
    expect(options.recursive).toBe(true);
    expect(options.yes).toBe(true);
  });

  it("--max-width 를 정수로 파싱한다", () => {
    expect(parseArgs(["a.png", "-w", "1920"]).options.maxWidth).toBe(1920);
  });

  it("avif 포맷을 허용한다", () => {
    expect(parseArgs(["a.png", "-f", "avif"]).options.format).toBe("avif");
  });
});
