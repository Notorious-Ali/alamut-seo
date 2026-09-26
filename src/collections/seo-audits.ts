import type { CollectionConfig } from 'payload'

export const seoAuditsCollection: CollectionConfig = {
  slug: 'seo-audits',
  access: {
    create: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['url', 'score', 'createdAt'],
    useAsTitle: 'url',
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
    },
    {
      name: 'collection',
      type: 'text',
      label: 'Source collection',
    },
    {
      name: 'docId',
      type: 'text',
      label: 'Source document ID',
    },
    {
      name: 'score',
      type: 'number',
    },
    {
      name: 'result',
      type: 'json',
    },
  ],
  labels: {
    plural: 'SEO Audits',
    singular: 'SEO Audit',
  },
}
