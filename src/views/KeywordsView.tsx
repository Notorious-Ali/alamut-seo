import React from 'react'

import { seoLinkStyle, seoMutedStyle, seoPanelStyle } from '../components/seoStyles.js'

/**
 * Server view: keyword research / backlink entry page. Data is served by
 * GET /api/seo/keywords and GET /api/seo/backlinks (admin-only) since the
 * Semrush/Ahrefs API keys live server-side only.
 */
export const KeywordsView: React.FC = () =>
  React.createElement(
    'div',
    { style: { ...seoPanelStyle, margin: 16 } },
    React.createElement('h1', null, 'Keyword Research'),
    React.createElement(
      'p',
      { style: seoMutedStyle },
      'Organic keywords and backlink profiles via Semrush and Ahrefs.',
    ),
    React.createElement(
      'div',
      null,
      React.createElement('a', { href: '/api/seo/keywords?domain=example.com', style: seoLinkStyle }, 'Keywords'),
      React.createElement('a', { href: '/api/seo/backlinks?domain=example.com', style: seoLinkStyle }, 'Backlinks'),
    ),
  )
