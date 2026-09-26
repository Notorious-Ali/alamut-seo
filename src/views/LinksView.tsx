import React from 'react'

import { seoLinkStyle, seoMutedStyle, seoPanelStyle } from '../components/seoStyles.js'

/**
 * Server view: internal link graph report entry page. The report itself is
 * served by GET /api/seo/links (admin-only) since it must query every
 * SEO-enabled collection server-side.
 */
export const LinksView: React.FC = () =>
  React.createElement(
    'div',
    { style: { ...seoPanelStyle, margin: 16 } },
    React.createElement('h1', null, 'Link Graph'),
    React.createElement(
      'p',
      { style: seoMutedStyle },
      'Internal link graph, orphan pages, link equity, and cross-link suggestions.',
    ),
    React.createElement(
      'a',
      { href: '/api/seo/links', style: seoLinkStyle },
      'Open link report (JSON)',
    ),
  )
