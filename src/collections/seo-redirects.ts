import type { CollectionConfig } from 'payload'

export const seoRedirectsCollection: CollectionConfig = {
  slug: 'seo-redirects',
  access: {
    create: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['from', 'to', 'statusCode'],
    useAsTitle: 'from',
  },
  fields: [
    {
      name: 'from',
      type: 'text',
      admin: {
        description: 'Source path, e.g. /old-page or /blog/:slug',
        placeholder: '/old-page',
      },
      required: true,
    },
    {
      name: 'to',
      type: 'text',
      admin: {
        description: 'Destination path or absolute URL',
        placeholder: '/new-page',
      },
      required: true,
    },
    {
      name: 'statusCode',
      type: 'select',
      defaultValue: 301,
      label: 'Status code',
      options: [
        { label: '301 (permanent)', value: '301' },
        { label: '302 (temporary)', value: '302' },
        { label: '307 (temporary, preserves method)', value: '307' },
        { label: '308 (permanent, preserves method)', value: '308' },
        { label: '410 (gone)', value: '410' },
      ],
    },
  ],
  labels: {
    plural: 'Redirects',
    singular: 'Redirect',
  },
}
