import React from 'react'

import { seoLinkStyle, seoMutedStyle, seoPanelStyle } from '../components/seoStyles.js'

/**
 * Server view: Search Console console entry page. Links to the five
 * GSC endpoints; data loads client-side (or via the endpoints directly)
 * since credentials live server-side only.
 */
export const GscView: React.FC = () =>
  React.createElement(
    'div',
    { style: { ...seoPanelStyle, margin: 16 } },
    React.createElement('h1', null, 'Search Console'),
    React.createElement(
      'p',
      { style: seoMutedStyle },
      'Query performance, URL inspection, and sitemap management.',
    ),
    React.createElement(
      'div',
      null,
      React.createElement('a', { href: '/api/seo/gsc/status', style: seoLinkStyle }, 'Status'),
      React.createElement('a', { href: '/api/seo/gsc/analytics', style: seoLinkStyle }, 'Analytics (last 30 days)'),
      React.createElement('a', { href: '/api/seo/gsc/sitemaps', style: seoLinkStyle }, 'Sitemaps'),
    ),
  )
