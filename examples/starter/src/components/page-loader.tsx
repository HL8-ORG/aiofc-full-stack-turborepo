"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "./loading-spinner";
import { cn } from "@/lib/utils";

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate content loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-300",
        isLoading ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="flex flex-col items-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  );
}
