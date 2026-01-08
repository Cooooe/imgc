import { describe, it, expect } from "vitest";
import {
  parseSize,
  formatSize,
  getExtension,
  isSupportedFormat,
  isRasterFormat,
  getOutputPath,
} from "../src/utils.js";

describe("parseSize", () => {
  it("바이트 단위를 파싱한다", () => {
    expect(parseSize("1000")).toBe(1000);
    expect(parseSize("1000B")).toBe(1000);
  });

  it("KB 단위를 파싱한다", () => {
    expect(parseSize("100KB")).toBe(100 * 1024);
    expect(parseSize("1.5KB")).toBe(1.5 * 1024);
  });

  it("MB 단위를 파싱한다", () => {
    expect(parseSize("1MB")).toBe(1024 * 1024);
    expect(parseSize("2.5MB")).toBe(2.5 * 1024 * 1024);
  });

  it("대소문자를 구분하지 않는다", () => {
    expect(parseSize("100kb")).toBe(100 * 1024);
    expect(parseSize("1mb")).toBe(1024 * 1024);
  });

  it("잘못된 형식은 에러를 던진다", () => {
    expect(() => parseSize("abc")).toThrow();
    expect(() => parseSize("100GB")).toThrow();
  });
});

describe("formatSize", () => {
  it("바이트를 포맷한다", () => {
    expect(formatSize(500)).toBe("500B");
  });

  it("KB를 포맷한다", () => {
    expect(formatSize(1024)).toBe("1.0KB");
    expect(formatSize(1536)).toBe("1.5KB");
  });

  it("MB를 포맷한다", () => {
    expect(formatSize(1024 * 1024)).toBe("1.00MB");
    expect(formatSize(2.5 * 1024 * 1024)).toBe("2.50MB");
  });
});

describe("getExtension", () => {
  it("파일 확장자를 반환한다", () => {
    expect(getExtension("/path/to/image.png")).toBe("png");
    expect(getExtension("/path/to/image.JPG")).toBe("jpg");
    expect(getExtension("file.webp")).toBe("webp");
  });

  it("확장자가 없으면 빈 문자열을 반환한다", () => {
    expect(getExtension("/path/to/file")).toBe("");
  });
});

describe("isSupportedFormat", () => {
  it("지원하는 포맷은 true를 반환한다", () => {
    expect(isSupportedFormat("png")).toBe(true);
    expect(isSupportedFormat("jpg")).toBe(true);
    expect(isSupportedFormat("jpeg")).toBe(true);
    expect(isSupportedFormat("webp")).toBe(true);
    expect(isSupportedFormat("svg")).toBe(true);
  });

  it("지원하지 않는 포맷은 false를 반환한다", () => {
    expect(isSupportedFormat("gif")).toBe(false);
    expect(isSupportedFormat("bmp")).toBe(false);
    expect(isSupportedFormat("tiff")).toBe(false);
  });

  it("ico는 입력 포맷으로 지원하지 않는다", () => {
    expect(isSupportedFormat("ico")).toBe(false);
  });
});

describe("isRasterFormat", () => {
  it("래스터 포맷은 true를 반환한다", () => {
    expect(isRasterFormat("png")).toBe(true);
    expect(isRasterFormat("jpg")).toBe(true);
    expect(isRasterFormat("jpeg")).toBe(true);
    expect(isRasterFormat("webp")).toBe(true);
  });

  it("벡터 포맷은 false를 반환한다", () => {
    expect(isRasterFormat("svg")).toBe(false);
  });
});

describe("getOutputPath", () => {
  it("keep=true일 때 _compressed 접미사를 추가한다", () => {
    expect(getOutputPath("/path/to/image.png", undefined, true)).toBe(
      "/path/to/image_compressed.png"
    );
  });

  it("포맷 변환 시 확장자를 변경한다", () => {
    expect(getOutputPath("/path/to/image.png", "webp", false)).toBe(
      "/path/to/image.webp"
    );
  });

  it("같은 포맷이고 keep=false일 때 원본 경로를 반환한다", () => {
    expect(getOutputPath("/path/to/image.png", "png", false)).toBe(
      "/path/to/image.png"
    );
    expect(getOutputPath("/path/to/image.png", undefined, false)).toBe(
      "/path/to/image.png"
    );
  });

  it("keep=true이고 포맷 변환 시 접미사와 확장자 모두 변경한다", () => {
    expect(getOutputPath("/path/to/image.png", "webp", true)).toBe(
      "/path/to/image_compressed.webp"
    );
  });

  it("ico 포맷으로 변환 시 확장자를 ico로 변경한다", () => {
    expect(getOutputPath("/path/to/logo.png", "ico", false)).toBe(
      "/path/to/logo.ico"
    );
    expect(getOutputPath("/path/to/logo.png", "ico", true)).toBe(
      "/path/to/logo_compressed.ico"
    );
  });
});
