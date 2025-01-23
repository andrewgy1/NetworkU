'use client'
import Image from "next/image";
import { useEffect, useState } from "react";

// Logo animation
export default function Logo() {
  const [showByRecruitU, setShowByRecruitU] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Show by RecruitU subtitle and fade animation
  useEffect(() => {
    const byRecruitUTimer = setTimeout(() => setShowByRecruitU(true), 1500); 
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000); 

    return () => {
      clearTimeout(byRecruitUTimer);
      clearTimeout(fadeTimer);
    };
  }, []);

 return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div
        className={`flex flex-col items-center transition-opacity duration-1000 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
      >
        <Image 
          src="/NetworkU.png"
          alt=""
          width="500"
          height="200"
        />
        <div className="h-16 flex items-center justify-center">
        {showByRecruitU && (
          <Image
          src="/recruitUText.png"
          alt=""
          width="200"
          height="200"
          className="opacity-100"
          />
        )}
        </div>
      </div>
    </div>
  );
}
