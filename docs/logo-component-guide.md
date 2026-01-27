# Logo Component Styling Guide

Create a logo component with the following structure and styling (using Tailwind CSS).

## Structure

```
[Icon Box] [App Name™] [AI Badge]
```

## Specifications

### Container

- Flexbox row with `items-center` and `gap-2` spacing

### Icon Box

- Size: `w-8 h-8` (32x32px)
- Border radius: `rounded-lg`
- Background: `bg-slate-100` (light) / `bg-slate-800` (dark)
- Icon inside: `w-5 h-5` (20x20px)
- Icon color: `text-slate-700` (light) / `text-slate-300` (dark)
- Center the icon with `flex items-center justify-center`

### App Name

- Font: `text-xl font-bold`
- Color: inherit (dark: `text-white`)

### Trademark Symbol (™)

- Element: `<sup>` (superscript)
- Size: `text-[0.6em]` (60% of parent text size)
  - If parent is `text-xl` (20px), ™ is ~12px
  - If parent is `text-2xl` (24px), ™ is ~14px
- Weight: `font-normal` (not bold like the app name)
- Color: `text-slate-400` (muted, same in light/dark mode)

### AI Badge (or similar product suffix)

- Shape: `rounded-full` pill
- Background: `bg-slate-100` (light) / `bg-slate-800` (dark)
- Padding: `px-2 py-0.5`
- Font: `text-xs font-medium`
- Color: `text-slate-700` (light) / `text-slate-300` (dark)
- Spacing: `ml-0.5` from the app name
- Use `inline-flex items-center justify-center`

## Example JSX

```jsx
<div className="flex items-center gap-2">
  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
    <YourIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
  </div>
  <span className="text-xl font-bold dark:text-white">
    AppName<sup className="text-[0.6em] font-normal text-slate-400">™</sup>
  </span>
  <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
    AI
  </span>
</div>
```

## Size Variants

### Large (auth pages)

- Icon box: `w-12 h-12`
- Icon inside: `w-7 h-7`
- Name: `text-2xl`
- Badge: `text-sm px-2 py-0.5`

### Small (sidebar collapsed)

- Icon box: `w-8 h-8`
- Badge: `text-[10px] px-1.5 py-0.5`

## Color Palette

The slate color scheme provides a neutral, professional look that works well in both light and dark modes:

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `slate-100` | `slate-800` |
| Icon/Text | `slate-700` | `slate-300` |
| Trademark | `slate-400` | `slate-400` |
