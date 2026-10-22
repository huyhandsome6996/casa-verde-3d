import { Github, Boxes } from "lucide-react";
import { HouseViewer } from "@/components/HouseViewer";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="font-inter flex min-h-screen flex-col bg-[#0b0e14] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0e14]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <img
            src="/artcraft/logo/artcraft-logo-color-white.svg"
            alt="Logo ArtCraft"
            className="h-7 w-auto"
          />
          <span className="hidden h-5 w-px bg-white/15 sm:block" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
              Casa Verde — Bản thiết kế nhà vườn 3D
            </h1>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Dựng cảnh theo phong cách kitbashing · Render bằng engine Three.js của ArtCraft
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25 md:inline-flex">
              <Boxes className="mr-1 h-3 w-3" /> Powered by ArtCraft resources
            </Badge>
            <a
              href="https://github.com/storytold/artcraft"
              target="_blank"
              rel="noreferrer"
              aria-label="Xem repo ArtCraft trên GitHub"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-white/30 hover:text-white"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6">
        <div className="h-[calc(100vh-190px)] min-h-[560px]">
          <HouseViewer />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#0b0e14]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-500 sm:flex-row sm:px-6">
          <p>
            Sản phẩm cá nhân được render từ tài nguyên mã nguồn mở của dự án{" "}
            <a
              className="text-slate-300 underline decoration-dotted underline-offset-2 hover:text-white"
              href="https://github.com/storytold/artcraft"
              target="_blank"
              rel="noreferrer"
            >
              storytold/artcraft
            </a>{" "}
            — dual-licensed MIT / Apache-2.0.
          </p>
          <p>Bầu trời: skybox ArtCraft · Mô hình: kitbashing Three.js · UI: Inter</p>
        </div>
      </footer>
    </div>
  );
}
