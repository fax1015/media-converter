# UI Components Inventory

This document lists the reusable UI components already present in the app. Prefer these classes/structures before introducing new ones.

## Naming Rules
- Reuse existing component classes before creating new ones.
- Use kebab-case for new class names (e.g., `example-block`).
- Prefer a single base class with modifiers instead of new one-off classes (e.g., `action-btn` + `danger`).
- Scope new component classes by feature only when needed (e.g., `queue-item`, not `queue-item-blue`).
- Add new utility classes sparingly; prefer component-level classes for UI structure.
- Use hyphenated state classes (e.g., `drag-over`, `is-active`).

## Layout and Structure
- App shell: `app-container`, `content-wrapper`, `main-content` in [renderer/index.html](renderer/index.html#L13)
- Background decor: `bg-wrapper`, `bg-orb`, `orb-1`, `orb-2`, `orb-3` in [renderer/index.html](renderer/index.html#L14)
- Header: `app-header`, `logo`, `status-badge` in [renderer/index.html](renderer/index.html#L19)

## Navigation
- Sidebar: `app-sidebar`, `sidebar-nav`, `sidebar-bottom`, `sidebar-divider`, `sidebar-active-indicator` in [renderer/index.html](renderer/index.html#L40)
- Nav items: `nav-item` (icon-only buttons) and `queue-badge` in [renderer/index.html](renderer/index.html#L43)

## Views and Dashboards
- Drop zones: `drop-zone`, `drop-zone-inner`, `icon-container`, `supported-formats` in [renderer/index.html](renderer/index.html#L87)
- Dashboard containers: `dashboard` (tool views) in [renderer/index.html](renderer/index.html#L156)
- Progress/complete views: `progress-view`, `complete-view` in [renderer/index.html](renderer/index.html#L335)

## Cards and Panels
- File card: `file-card`, `file-icon`, `file-details`, `file-meta`, `meta-tag` in [renderer/index.html](renderer/index.html#L165)
- Settings panels: `settings-panel`, `panel-title`, `panel-header-actions` in [renderer/index.html](renderer/index.html#L195)
- Advanced panel: `advanced-panel`, `advanced-section-toggle` in [renderer/index.html](renderer/index.html#L968)

## Forms and Input Groups
- Control group: `control-group` (label + input/select/textarea) in [renderer/index.html](renderer/index.html#L221)
- Settings grids: `settings-grid`, `settings-grid-large`, `settings-section` in [renderer/index.html](renderer/index.html#L1176)
- Checkbox row: `checkbox-label` in [renderer/index.html](renderer/index.html#L733)
- Radio group: `radio-group`, `radio-label` in [renderer/index.html](renderer/index.html#L722)
- Number input: `number-input-container`, `number-stepper-btn`, `number-input-field`, `number-input-display`, `number-input-value`, `number-input-text-box` in [renderer/index.html](renderer/index.html#L865)
- Folder input: `folder-input-group` in [renderer/index.html](renderer/index.html#L1220)
- Drop input for files: `import-zone` in [renderer/index.html](renderer/index.html#L938)
- Help text: `help-text` in [renderer/index.html](renderer/index.html#L1191)

## Buttons
- Primary/secondary: `primary-btn`, `secondary-btn` in [renderer/index.html](renderer/index.html#L321)
- Action buttons: `action-btn` (including `small`, `danger`) in [renderer/index.html](renderer/index.html#L1222) and [renderer/index.html](renderer/index.html#L1329)
- Text buttons: `text-btn` in [renderer/index.html](renderer/index.html#L961)
- Back buttons: `back-btn` in [renderer/index.html](renderer/index.html#L157)
- Cancel button: `cancel-btn` in [renderer/index.html](renderer/index.html#L361)

## Tabs
- Tab group: `tab-btn-group` in [renderer/index.html](renderer/index.html#L198)
- Tabs: `tab-btn` in [renderer/index.html](renderer/index.html#L199)
- Tab content: `tab-content` in [renderer/index.html](renderer/index.html#L709)
- Settings tabs row: `settings-tabs` in [renderer/index.html](renderer/index.html#L706)

## Dropdowns and Custom Selects
- Preset dropdown: `preset-container`, `preset-dropdown`, `preset-group`, `preset-category`, `preset-item`, `text-btn`, `text-btn-accent`, `preset-empty` in [renderer/index.html](renderer/index.html#L753)
- Custom select system: `dropdown-container`, `dropdown-trigger`, `dropdown-trigger-text`, `dropdown-text-value`, `dropdown-trigger-icon`, `dropdown-menu`, `dropdown-item`, `custom-select` in [renderer/modules/ui-utils.js](renderer/modules/ui-utils.js)

## Status, Badges, and Tags
- Status badge: `status-badge` in [renderer/index.html](renderer/index.html#L29)
- Queue badge: `queue-badge` in [renderer/index.html](renderer/index.html#L62)
- Auto tag: `auto-tag` in [renderer/index.html](renderer/index.html#L847)
- Output path: `output-path` in [renderer/index.html](renderer/index.html#L382)

## Lists and Grids
- Apps grid: `apps-grid` in [renderer/index.html](renderer/index.html#L1102)
- Track lists: `track-list` in [renderer/index.html](renderer/index.html#L700)
- Formats list: `formats-list` and `formats-actions` in [renderer/index.html](renderer/index.html#L203)
- Queue: `queue-header`, `queue-actions`, `queue-list`, `empty-queue-msg` in [renderer/index.html](renderer/index.html#L1318)

## Progress and Loading
- Progress ring: `progress-ring`, `progress-ring-bg`, `progress-ring-fill` in [renderer/index.html](renderer/index.html#L341)
- Progress stats: `progress-stats`, `stat`, `stat-label`, `stat-value` in [renderer/index.html](renderer/index.html#L347)
- Loader shell: `loader-shell` (uses `data-loader`) in [renderer/index.html](renderer/index.html#L545)
- Loader variant: `loader-bars` in [renderer/modules/ui-utils.js](renderer/modules/ui-utils.js)

## Media Preview and Trim Controls
- Video preview: `video-preview-container`, `trim-video-preview`, `video-overlay`, `play-pause-icon` in [renderer/index.html](renderer/index.html#L543)
- Playback controls: `video-controls`, `video-time`, `volume-control`, `mute-btn`, `volume-slider-container`, `volume-slider` in [renderer/index.html](renderer/index.html#L560)
- Timeline: `trim-timeline`, `trim-track-area`, `trim-playhead`, `trim-waveform-wrap`, `trim-timeline-track`, `trim-timeline-active`, `trim-timeline-inactive`, `trim-handle` in [renderer/index.html](renderer/index.html#L586)
- Trim inputs and stats: `trim-range-inputs`, `trim-info-stats`, `trim-info-value` in [renderer/index.html](renderer/index.html#L614)

## Tooltips and Modals
- Tooltip: `info-tooltip-trigger`, `info-tooltip` in [renderer/index.html](renderer/index.html#L137)
- Popup modal: `popup-overlay`, `popup-content`, `popup-message`, `popup-actions`, `popup-btn` in [renderer/index.html](renderer/index.html#L1360)

## Theme Utilities
- Theme classes: `light-theme`, `oled-theme`, `high-contrast-theme` in [renderer/styles.css](renderer/styles.css)
