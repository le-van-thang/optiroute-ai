"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Zap, RotateCcw, Check, Sparkles, Wand2, BookOpen } from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";
import { useRouter } from "next/navigation";

interface PhotoFilter {
  name: string;
  class: string;
  label: { vi: string; en: string };
}

const FILTERS: PhotoFilter[] = [
  { name: "Normal", class: "", label: { vi: "Gốc", en: "Normal" } },
  { name: "Vivid", class: "saturate-150 contrast-110", label: { vi: "Rực rỡ", en: "Vivid" } },
  { name: "Vintage", class: "sepia-[0.3] contrast-90 brightness-110 hue-rotate-[-10deg]", label: { vi: "Hoài cổ", en: "Vintage" } },
  { name: "Mono", class: "grayscale contrast-125", label: { vi: "Đen trắng", en: "Mono" } },
  { name: "Cool", class: "hue-rotate-[180deg] saturate-125", label: { vi: "Lạnh", en: "Cool" } },
];

interface HDCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoData: string, filterName: string) => void;
  lang: string;
}

export const HDCameraModal = ({ isOpen, onClose, onCapture, lang }: HDCameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 4096 }, // 4K Ideal
          height: { ideal: 2160 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraReady(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(lang === "vi" ? "Không thể truy cập camera. Vui lòng cấp quyền." : "Cannot access camera. Please grant permission.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraReady(false);
    setCapturedImage(null);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Flash Effect
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply filter to canvas context (approximated for CSS filters)
    ctx.filter = getCanvasFilter(activeFilter.class);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(data);
  };

  const getCanvasFilter = (cssClass: string) => {
    if (!cssClass) return "none";
    let filter = "";
    if (cssClass.includes("saturate-150")) filter += "saturate(1.5) ";
    if (cssClass.includes("contrast-110")) filter += "contrast(1.1) ";
    if (cssClass.includes("contrast-125")) filter += "contrast(1.25) ";
    if (cssClass.includes("sepia-[0.3]")) filter += "sepia(0.3) ";
    if (cssClass.includes("contrast-90")) filter += "contrast(0.9) ";
    if (cssClass.includes("brightness-110")) filter += "brightness(1.1) ";
    if (cssClass.includes("hue-rotate-[-10deg]")) filter += "hue-rotate(-10deg) ";
    if (cssClass.includes("grayscale")) filter += "grayscale(1) ";
    if (cssClass.includes("hue-rotate-[180deg]")) filter += "hue-rotate(180deg) ";
    if (cssClass.includes("saturate-125")) filter += "saturate(1.25) ";
    return filter.trim() || "none";
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage, activeFilter.name);
      setIsSuccess(true);
    }
  };

  const resetCamera = () => {
    setIsSuccess(false);
    setCapturedImage(null);
  };

  const handleGoToJournal = () => {
    onClose();
    router.push('/journal');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Flash Overlay */}
          <AnimatePresence>
            {isFlashActive && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                className="absolute inset-0 z-[210] bg-white pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-[220] p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Viewfinder */}
          <div className="relative w-full aspect-[3/4] sm:max-w-md bg-slate-900 overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${activeFilter.class} transition-all duration-500 ${capturedImage ? 'hidden' : 'block'}`}
            />
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* AI Focus Ring (Decorative) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border border-white/20 rounded-full animate-pulse" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                 <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">HD REC</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full max-w-md p-8 space-y-8">
            {/* Filter Slider */}
            {!capturedImage && (
              <div className="flex gap-4 overflow-x-auto pb-2 scroll-hide">
                {FILTERS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setActiveFilter(f)}
                    className={`flex flex-col items-center gap-2 flex-shrink-0 transition-all ${
                      activeFilter.name === f.name ? "opacity-100 scale-110" : "opacity-40"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl border-2 ${activeFilter.name === f.name ? "border-indigo-400" : "border-white/10"} bg-slate-800 overflow-hidden`}>
                       <div className={`w-full h-full ${f.class} bg-indigo-500/20`} />
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                      {f.label[lang as "vi" | "en"]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Buttons */}
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-4"
              >
                <button
                  onClick={resetCamera}
                  className="flex-1 h-14 rounded-2xl border-2 border-white/20 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  {lang === "vi" ? "Chụp thêm" : "Take Another"}
                </button>
                <button
                  onClick={handleGoToJournal}
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 group"
                >
                  <BookOpen className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  {lang === "vi" ? "Đến Nhật ký" : "View Journal"}
                </button>
              </motion.div>
            ) : (
              <div className="flex items-center justify-between gap-8">
                {capturedImage ? (
                  <>
                    <button
                      onClick={() => setCapturedImage(null)}
                      className="flex-1 h-14 rounded-2xl bg-white/10 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/20"
                    >
                      <RotateCcw className="w-5 h-5" />
                      {lang === "vi" ? "Chụp lại" : "Retake"}
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center gap-2 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30"
                    >
                      <Check className="w-5 h-5" />
                      {lang === "vi" ? "Lưu kỷ niệm" : "Save Memory"}
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center">
                     <button
                      onClick={handleCapture}
                      disabled={!isCameraReady}
                      className="group relative flex items-center justify-center w-20 h-20"
                    >
                      <div className="absolute inset-0 rounded-full border-4 border-white/50 group-active:scale-90 transition-transform" />
                      <div className="w-16 h-16 rounded-full bg-white group-active:scale-95 transition-transform" />
                      <Camera className="absolute w-6 h-6 text-slate-900 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
