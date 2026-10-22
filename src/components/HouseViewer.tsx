"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Cloud,
  Download,
  Loader2,
  MousePointer2,
  Moon,
  Orbit,
  PencilRuler,
  RotateCcw,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  HouseScene,
  type CameraPreset,
  type SkyMode,
} from "@/lib/three-house/house-scene";

const SKY_OPTIONS: Array<{ id: SkyMode; label: string; icon: typeof Sun }> = [
  { id: "day", label: "Ban ngày", icon: Sun },
  { id: "night", label: "Ban đêm", icon: Moon },
  { id: "gray", label: "U ám", icon: Cloud },
];

const PRESET_OPTIONS: Array<{ id: CameraPreset; label: string }> = [
  { id: "overview", label: "Tổng thể" },
  { id: "front", label: "Mặt tiền" },
  { id: "pool", label: "Hồ bơi" },
  { id: "aerial", label: "Từ trên cao" },
  { id: "entrance", label: "Cửa vào" },
];

const SPECS: Array<[string, string]> = [
  ["Tổng diện tích nền", "≈ 14.0 × 7.0 m"],
  ["Chiều cao khối chính", "6.6 m (2 tầng)"],
  ["Phòng chức năng", "4 ngủ · 3 vệ sinh"],
  ["Công trình phụ trợ", "Hồ bơi 6 × 3.1 m"],
  ["Sân gỗ & khu nghỉ", "9.6 × 4.6 m"],
  ["Phong cách", "Hiện đại — mái bằng"],
];

function lowPowerInitial(): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  return p.has("lite") || p.has("static");
}

export function HouseViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HouseScene | null>(null);
  const [ready, setReady] = useState(false);
  const [sky, setSky] = useState<SkyMode>("day");
  const [autoRotate, setAutoRotate] = useState(true);
  const [blueprint, setBlueprint] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!containerRef.current) return;
    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const lite = params?.has("lite") ?? false;
    const staticMode = params?.has("static") ?? false;
    if (lite || staticMode) {
      // Khởi tạo một lần theo chế độ tiết kiệm — tắt xoay tự động
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoRotate(false);
    }
    const scene = new HouseScene(containerRef.current, () => setReady(true), {
      lite,
      static: staticMode,
    });
    // Hook gỡ lỗi cho môi trường headless / devtools
    (window as unknown as { __houseScene?: HouseScene }).__houseScene = scene;
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handleSky = useCallback(
    (mode: SkyMode) => {
      setSky(mode);
      sceneRef.current?.setSkyMode(mode);
      setBlueprint(false);
      sceneRef.current?.setBlueprint(false);
    },
    []
  );

  const handlePreset = useCallback((p: CameraPreset) => {
    setAutoRotate(false);
    sceneRef.current?.setAutoRotate(false);
    sceneRef.current?.setCameraPreset(p);
  }, []);

  const handleAutoRotate = useCallback((on: boolean) => {
    setAutoRotate(on);
    sceneRef.current?.setAutoRotate(on);
  }, []);

  const handleBlueprint = useCallback(
    (on: boolean) => {
      setBlueprint(on);
      sceneRef.current?.setBlueprint(on);
    },
    []
  );

  const handleExport = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    try {
      const dataUrl = scene.exportPNG();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `thiet-ke-nha-${Date.now()}.png`;
      a.click();
      toast({
        title: "Đã xuất ảnh PNG",
        description: "Bản vẽ 3D hiện tại đã được lưu về máy của bạn.",
      });
    } catch {
      toast({
        title: "Không xuất được ảnh",
        description: "Trình duyệt chặn thao tác tải xuống. Hãy thử lại.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      {/* Khung cảnh 3D */}
      <div className="relative min-h-[380px] flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] lg:min-h-0">
        <div ref={containerRef} className="absolute inset-0" aria-label="Cảnh 3D bản thiết kế nhà" />

        {!ready && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0d1117] text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm">Đang tải skybox ArtCraft &amp; dựng cảnh…</p>
          </div>
        )}

        {ready && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
            <MousePointer2 className="h-3.5 w-3.5" />
            Kéo để xoay · Cuộn để thu phóng
          </div>
        )}

        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <Badge
            variant="outline"
            className="border-white/15 bg-black/55 text-[11px] font-medium text-slate-200 backdrop-blur"
          >
            {blueprint ? "Chế độ bản vẽ" : SKY_OPTIONS.find((s) => s.id === sky)?.label}
          </Badge>
        </div>
      </div>

      {/* Bảng điều khiển */}
      <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto pb-2 lg:w-[320px]">
        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Sun className="h-4 w-4 text-amber-300" /> Bầu trời
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Skybox cubemap trích trực tiếp từ repo ArtCraft.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SKY_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSky(id)}
                aria-pressed={sky === id && !blueprint}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                  sky === id && !blueprint
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.07]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Camera className="h-4 w-4 text-sky-300" /> Góc nhìn
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PRESET_OPTIONS.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset(id)}
                className="min-h-[38px] justify-center border-white/10 bg-white/[0.03] text-xs text-slate-200 hover:border-white/25 hover:bg-white/[0.08]"
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-slate-300">
              <Orbit className="h-4 w-4 text-slate-400" /> Tự động xoay
            </span>
            <Switch
              checked={autoRotate}
              onCheckedChange={handleAutoRotate}
              aria-label="Bật/tắt xoay tự động"
            />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-slate-300">
              <PencilRuler className="h-4 w-4 text-slate-400" /> Chế độ bản vẽ
            </span>
            <Switch
              checked={blueprint}
              onCheckedChange={handleBlueprint}
              aria-label="Bật/tắt chế độ bản vẽ"
            />
          </div>
        </section>

        <Button
          type="button"
          onClick={handleExport}
          disabled={!ready}
          className="min-h-[44px] w-full bg-emerald-500 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
        >
          <Download className="mr-2 h-4 w-4" /> Tải bản render PNG
        </Button>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <PencilRuler className="h-4 w-4 text-rose-300" /> Thông số thiết kế
          </h2>
          <Separator className="my-3 bg-white/10" />
          <dl className="space-y-2.5">
            {SPECS.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 text-xs">
                <dt className="text-slate-400">{k}</dt>
                <dd className="text-right font-medium text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-sm font-semibold text-slate-200">Tài nguyên dùng từ ArtCraft</h2>
          <ul className="mt-3 space-y-2 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Skybox cubemap ngày / đêm / u ám (6 mặt .webp)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
              Engine Three.js + bộ shape kitbashing (cube, cylinder, sphere…)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              Font Inter từ app desktop ArtCraft
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
              Logo &amp; nhận diện ArtCraft (MIT / Apache-2.0)
            </li>
          </ul>
        </section>

        <p className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
          <RotateCcw className="h-3 w-3" /> Mẹo: bật “Chế độ bản vẽ” để xem khối kiến trúc kèm
          kích thước.
        </p>
      </aside>
    </div>
  );
}
