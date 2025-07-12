"use client";

import { useCalendar } from "@/modules/calendar/contexts/calendar-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/shadcn-ui/tooltip";
import { DotIcon, PaletteIcon } from "lucide-react";
import { MotionButton } from "@/modules/calendar/components/header/calendar-header";
import { buttonHover } from "@/modules/calendar/animations";

export function ChangeBadgeVariantInput() {
  const { badgeVariant, setBadgeVariant } = useCalendar();

  return (
    <div className="space-y-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <MotionButton
              variant="outline"
              size="icon"
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() =>
                setBadgeVariant(badgeVariant === "dot" ? "colored" : "dot")
              }
            >
              {badgeVariant === "dot" ? (
                <DotIcon className="w-5 h-5" />
              ) : (
                <PaletteIcon className="w-5 h-5" />
              )}
            </MotionButton>
          </TooltipTrigger>
          <TooltipContent>Badge variant</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
