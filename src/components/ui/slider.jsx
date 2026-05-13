"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  showTooltip = false,
  formatTooltip,
  ...props
}) {
  const [isHovering, setIsHovering] = React.useState(false);
  const [tooltipValue, setTooltipValue] = React.useState(0);

  const _values = React.useMemo(() =>
    Array.isArray(value)
      ? value
      : Array.isArray(defaultValue)
        ? defaultValue
        : [min, max], [value, defaultValue, min, max])

  const handlePointerMove = (event) => {
    if (!showTooltip) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const percentage = (event.clientX - rect.left) / rect.width;
    const newValue = min + percentage * (max - min);
    setTooltipValue(Math.max(min, Math.min(max, newValue)));
  };

  const formatTime = (time) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative">
      <SliderPrimitive.Root
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        className={cn(
          "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col group",
          className
        )}
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => setIsHovering(false)}
        onPointerMove={handlePointerMove}
        {...props}>
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "bg-zinc-600 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1 transition-all duration-200"
          )}>
          <SliderPrimitive.Range
            data-slot="slider-range"
            className={cn(
              "bg-zinc-200 absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full transition-colors duration-200"
            )} />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="block size-3 shrink-0 rounded-full border-0 bg-zinc-200 shadow-sm transition-all duration-200 hover:ring-0 focus-visible:ring-0 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 opacity-0 group-hover:opacity-100 hover:scale-110" />
        ))}
      </SliderPrimitive.Root>

      {/* Tooltip */}
      {showTooltip && isHovering && (
        <div
          className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded pointer-events-none z-10 border border-border"
          style={{
            left: `${((tooltipValue - min) / (max - min)) * 100}%`
          }}
        >
          {formatTooltip ? formatTooltip(tooltipValue) : formatTime(tooltipValue)}
        </div>
      )}
    </div>
  );
}

export { Slider }
