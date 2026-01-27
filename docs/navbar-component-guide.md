# Navbar Styling Guide

Create a sticky navbar with scroll-aware frosted glass effect using Tailwind CSS and React.

## Structure

```
[Nav Container]
  └─ [Content Wrapper (max-width)]
       └─ [Logo] ... [Nav Items] ... [Actions]
```

## Scroll Behavior

The navbar has two states:

| State | Background | Border | Effect |
|-------|------------|--------|--------|
| **At top** | Transparent | None | Blends with hero section |
| **On scroll** | `white/80` + `backdrop-blur` | `border-b` | Frosted glass appears |

Transition: `duration-300` (300ms smooth fade)
Scroll threshold: `50px`

## Specifications

### Container

- Position: `sticky top-0 z-50`
- Transition: `transition-all duration-300`

**At top (not scrolled):**
- Background: `bg-transparent`
- Border: `border-b border-transparent`

**On scroll:**
- Background: `bg-white/80` (light) / `bg-slate-900/80` (dark)
- Blur effect: `backdrop-blur-sm`
- Border: `border-b` (visible)

### Content Wrapper

- Max width: `max-w-7xl mx-auto`
- Padding: `px-4 sm:px-6 lg:px-8`
- Height: `h-16` (64px)
- Layout: `flex justify-between items-center`

## Example JSX (React Client Component)

```jsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b"
          : "bg-transparent dark:bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            {/* ... logo component ... */}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* ... nav items, buttons ... */}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

## Key Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `sticky top-0` | Sticks to viewport top | Keeps nav visible on scroll |
| `z-50` | High z-index | Stays above other content |
| `transition-all duration-300` | 300ms transition | Smooth state change |
| `bg-white/80` | 80% opacity white | Allows content to show through |
| `backdrop-blur-sm` | Subtle blur | Frosted glass effect |
| `border-transparent` | Invisible border | Prevents layout shift on scroll |

## Scroll Detection

```js
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 50); // 50px threshold
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

**Notes:**
- Threshold of `50px` feels natural — not too eager, not too late
- Cleanup listener on unmount to prevent memory leaks
- `useState` default `false` ensures transparent state on initial render

## Responsive Considerations

- Mobile: Consider adding a hamburger menu for nav items
- The `px-4 sm:px-6 lg:px-8` pattern provides appropriate padding at all breakpoints
- Height `h-16` (64px) is standard for desktop; consider `h-14` for mobile if needed

## Color Palette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background (scrolled) | `white/80` | `slate-900/80` |
| Background (top) | `transparent` | `transparent` |
| Border (scrolled) | default | `slate-800` |

## Static Alternative

If you don't need scroll behavior, use a simple static navbar:

```jsx
<nav className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
  {/* ... */}
</nav>
```
