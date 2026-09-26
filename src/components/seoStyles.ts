/**
 * Shared admin styles built exclusively on Payload's admin theme CSS
 * variables (see @payloadcms/ui styles.css) so every component follows the
 * admin light/dark/auto scheme automatically. Buttons and status pills use
 * Payload's own `.btn` / `.pill` classes at render sites.
 */

export const seoPanelStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-0)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-s)',
  fontSize: 12,
  lineHeight: 1.45,
  // UI fields render flush against sibling fields; keep the panel border from
  // touching the field above/below.
  marginBottom: 12,
  marginTop: 12,
  padding: 12,
}

export const seoViewPanelStyle: React.CSSProperties = {
  ...seoPanelStyle,
  fontSize: 13,
  margin: 16,
  padding: 16,
}

export const seoMutedStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-500)',
}

export const seoLinkStyle: React.CSSProperties = {
  color: 'var(--theme-text)',
  marginRight: 16,
  textDecoration: 'underline',
}

/** Payload-native compact checklist row. */
export const seoRowStyle: React.CSSProperties = {
  alignItems: 'baseline',
  borderTop: '1px solid var(--theme-elevation-150)',
  display: 'flex',
  gap: 6,
  padding: '2px 0',
}

export const seoErrorStyle: React.CSSProperties = {
  color: 'var(--theme-error-500)',
}

export const seoSuccessStyle: React.CSSProperties = {
  color: 'var(--theme-success-500)',
}

/**
 * Accent for primary actions (Run analysis, Validate schema, Generate with
 * AI). Payload's stock `.btn--style-primary` is elevation-800/0, which inverts
 * to near-white in dark mode; these overrides recolor the button with the
 * theme's success ramp. `--theme-elevation-200/800` are locally remapped so
 * `.btn:hover` (which paints literal elevation-200/800) keeps the accent.
 */
export const seoActionButtonStyle = {
  '--bg-color': 'var(--theme-success-500)',
  '--color': 'var(--theme-elevation-0)',
  '--theme-elevation-200': 'var(--theme-success-600)',
  '--theme-elevation-800': 'var(--theme-elevation-0)',
} as React.CSSProperties

/** Payload pill style class per analysis status. */
export const seoStatusPillClass = (status: string): string => {
  const variant =
    status === 'good'
      ? 'success'
      : status === 'poor'
        ? 'error'
        : status === 'ok'
          ? 'warning'
          : 'light'

  return `pill pill--size-small pill--style-${variant}`
}
