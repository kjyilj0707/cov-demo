import type { NextConfig } from "next";

// GitHub Pages 프로젝트 사이트는 /<저장소이름> 아래에 열린다.
// 배포 워크플로가 PAGES_BASE_PATH를 넘겨 주고, 로컬에서는 빈 문자열로 둔다.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
