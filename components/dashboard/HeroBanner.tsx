"use client";

import { useContext, useEffect, useState } from "react";
import { Announcement } from "@/app/generated/prisma/edge";
import { LocaleContext } from "@/lib/locale-context";

interface HeroBannerProps {
  announcements: Announcement[];
}

export default function HeroBanner({ announcements }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const locale = useContext(LocaleContext);
  const isTh = locale === "th";

  const slides = [

    ...announcements.map((a) => ({
      tag: a.sourceSystem || (isTh ? "ประกาศ" : "Announcement"),
      title: a.title,
      content: a.content,
      bgClass: "from-[oklch(35%_0.12_264)] to-[oklch(20%_0.12_264)]",
      link: a.spWebUrl,
    })),
  ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative overflow-hidden rounded-xl shadow-sm min-h-55 flex items-center group max-w-full bg-base-300">
      {/* Sliding track container */}
      <div 
        className="flex w-full h-full transition-transform duration-500 ease-[ease]"
        style={{ 
          transform: `translateX(-${current * 100}%)`,
        }}
      >
        {slides.map((slide, idx) => (
          <div 
            key={idx} 
            className={`w-full shrink-0 min-h-55 bg-linear-to-r ${slide.bgClass} p-10 lg:p-14 text-white relative flex flex-col justify-center`}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            
            <div className="relative z-10 max-w-3xl">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold tracking-wider mb-4 border border-white/10 uppercase">
                {slide.tag}
              </span>
              <h1 className="text-xl md:text-2xl font-bold mb-4 tracking-tight drop-shadow-md">
                {slide.title}
              </h1>
              <p className="text-white/90 text-xs md:text-sm leading-relaxed max-w-2xl drop-shadow-sm font-medium">
                {slide.content}
              </p>
              {slide.link && (
                <a 
                  href={slide.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-white transition-colors"
                >
                  {isTh ? "ดูรายละเอียดเพิ่มเติม" : "View Details"}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/30 transition-colors z-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/30 transition-colors z-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Indicator dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                idx === current ? "bg-white w-3" : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
