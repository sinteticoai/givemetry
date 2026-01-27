# Navbar Styling Guide

Create a sticky navbar with frosted glass effect using Tailwind CSS.

## Structure

```
[Nav Container]
  └─ [Content Wrapper (max-width)]
       └─ [Logo] ... [Nav Items] ... [Actions]
```

## Specifications

### Container

- Position: `sticky top-0 z-50`
- Background: `bg-white/80` (light) / `bg-slate-900/80` (dark)
- Blur effect: `backdrop-blur-sm`
- Border: `border-b` (optional: `dark:border-slate-800`)

### Content Wrapper

- Max width: `max-w-7xl mx-auto`
- Padding: `px-4 sm:px-6 lg:px-8`
- Height: `h-16` (64px)
- Layout: `flex justify-between items-center`

## Example JSX

```jsx
<nav className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
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
```

## Key Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `sticky top-0` | Sticks to viewport top | Keeps nav visible on scroll |
| `z-50` | High z-index | Stays above other content |
| `bg-white/80` | 80% opacity white | Allows content to show through |
| `backdrop-blur-sm` | Subtle blur | Frosted glass effect |
| `border-b` | Bottom border | Visual separation from content |

## Responsive Considerations

- Mobile: Consider adding a hamburger menu for nav items
- The `px-4 sm:px-6 lg:px-8` pattern provides appropriate padding at all breakpoints
- Height `h-16` (64px) is standard for desktop; consider `h-14` for mobile if needed

## Color Palette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `white/80` | `slate-900/80` |
| Border | default | `slate-800` |
