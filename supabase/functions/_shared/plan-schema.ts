// Output schema for Claude structured outputs + runtime validation with zod.
import { z } from 'npm:zod@4.6.7'

const dateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['value', 'source', 'quote'],
  properties: {
    value: { type: ['string', 'null'], description: 'ISO date YYYY-MM-DD, or null if unknown.' },
    source: {
      type: 'string',
      enum: ['document', 'suggested', 'none'],
      description:
        '"document" only when the date is explicitly stated in the document; "suggested" when you propose it; "none" when value is null.',
    },
    quote: {
      type: ['string', 'null'],
      description: 'For "document" dates: the exact wording from the document. Otherwise null.',
    },
  },
} as const

const stringOrNull = { type: ['string', 'null'] } as const
const stringArray = { type: 'array', items: { type: 'string' } } as const

/** JSON Schema passed to output_config.format. */
export const PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['project', 'milestones', 'tasks', 'risks', 'questions', 'assumptions'],
  properties: {
    project: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'summary', 'objectives', 'deliverables', 'start_date', 'end_date'],
      properties: {
        title: { type: 'string' },
        summary: stringOrNull,
        objectives: stringArray,
        deliverables: stringArray,
        start_date: dateSchema,
        end_date: dateSchema,
      },
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'title', 'description', 'due_date'],
        properties: {
          key: { type: 'string', description: 'Short id such as "m1".' },
          title: { type: 'string' },
          description: stringOrNull,
          due_date: dateSchema,
        },
      },
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'key',
          'title',
          'description',
          'phase',
          'priority',
          'estimated_days',
          'start_date',
          'due_date',
          'depends_on',
          'milestone_key',
          'responsible',
        ],
        properties: {
          key: { type: 'string', description: 'Short id such as "t1".' },
          title: { type: 'string' },
          description: stringOrNull,
          phase: stringOrNull,
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          estimated_days: { type: ['integer', 'null'] },
          start_date: dateSchema,
          due_date: dateSchema,
          depends_on: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keys of tasks that must finish first.',
          },
          milestone_key: stringOrNull,
          responsible: {
            type: ['string', 'null'],
            description: 'Person or role named in the document, if any.',
          },
        },
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['description', 'severity', 'mitigation'],
        properties: {
          description: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          mitigation: stringOrNull,
        },
      },
    },
    questions: {
      ...stringArray,
      description: 'Missing or ambiguous information the user should clarify.',
    },
    assumptions: {
      ...stringArray,
      description: 'Assumptions you made when proposing suggested dates or tasks.',
    },
  },
} as const

// Runtime validation (defence in depth, plus length limits the database enforces).
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.slice(0, max))
const optText = (max: number) =>
  z
    .string()
    .nullable()
    .transform((s) => (s && s.trim() ? s.trim().slice(0, max) : null))

const zDate = z.object({
  value: z.string().nullable(),
  source: z.enum(['document', 'suggested', 'none']),
  quote: optText(500),
})

export const AiPlanSchema = z.object({
  project: z.object({
    title: text(120),
    summary: optText(5000),
    objectives: z.array(text(500)).max(30),
    deliverables: z.array(text(500)).max(50),
    start_date: zDate,
    end_date: zDate,
  }),
  milestones: z
    .array(
      z.object({ key: text(40), title: text(200), description: optText(2000), due_date: zDate }),
    )
    .max(50),
  tasks: z
    .array(
      z.object({
        key: text(40),
        title: text(200),
        description: optText(5000),
        phase: optText(100),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
        estimated_days: z.number().int().min(0).max(3650).nullable(),
        start_date: zDate,
        due_date: zDate,
        depends_on: z.array(z.string()).max(50),
        milestone_key: z.string().nullable(),
        responsible: optText(120),
      }),
    )
    .min(1)
    .max(200),
  risks: z
    .array(
      z.object({
        description: text(1000),
        severity: z.enum(['low', 'medium', 'high']),
        mitigation: optText(1000),
      }),
    )
    .max(30),
  questions: z.array(text(500)).max(30),
  assumptions: z.array(text(500)).max(30),
})
