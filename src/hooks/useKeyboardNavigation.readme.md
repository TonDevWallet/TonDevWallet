# Hooks

This directory contains reusable React hooks for the application.

## Keyboard Navigation

### `useKeyboardNavigation`

A general-purpose hook for adding keyboard navigation to any list or collection of items.

**Features:**
- Arrow up/down navigation (customizable keys)
- Circular navigation (wraps from first to last and vice versa)
- Auto-scrolling of selected elements into view
- Configurable enable/disable

**Usage:**
```tsx
const { scrollIntoView } = useKeyboardNavigation({
  selectedIndex: currentIndex,
  itemsCount: items.length,
  onSelect: (index) => handleSelection(index),
  enabled: true, // optional
  keys: { // optional custom keys
    up: ['ArrowUp', 'k'],
    down: ['ArrowDown', 'j']
  }
});
```

### `useVmLogsNavigation`

A specialized hook for VM logs navigation that builds on `useKeyboardNavigation`.

**Features:**
- Keyboard navigation through VM log rows
- Uses parent component state for selection state
- Auto-scrolls to selected log row

**Usage:**
```tsx
const { selectRow } = useVmLogsNavigation(
  logsData, 
  selectedStackIndex,
  setStackCallback
);
```

## Implementation Notes

When implementing keyboard navigation:

1. Add an `id` attribute to navigable elements with a consistent pattern (e.g., `vm-log-row-${index}`)
2. The selected element will be scrolled into view automatically
3. Make sure to provide visual indicators for the selected element
4. For keyboard navigation to work correctly, ensure the hook has access to the true state from the parent component 