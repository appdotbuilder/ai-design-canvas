import { z } from 'zod';

// Enum schemas for design elements
export const elementTypeSchema = z.enum(['rectangle', 'circle', 'line', 'text']);
export const strokeCapSchema = z.enum(['butt', 'round', 'square']);
export const strokeJoinSchema = z.enum(['miter', 'round', 'bevel']);
export const textAlignSchema = z.enum(['left', 'center', 'right']);

// Base position and dimensions
export const positionSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const dimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
});

// Style properties
export const fillStyleSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Hex color
  opacity: z.number().min(0).max(1).default(1)
});

export const strokeStyleSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Hex color
  width: z.number().min(0).default(1),
  opacity: z.number().min(0).max(1).default(1),
  cap: strokeCapSchema.default('butt'),
  join: strokeJoinSchema.default('miter')
});

export const textStyleSchema = z.object({
  fontFamily: z.string().default('Arial'),
  fontSize: z.number().positive().default(16),
  fontWeight: z.number().int().min(100).max(900).default(400),
  textAlign: textAlignSchema.default('left'),
  lineHeight: z.number().positive().default(1.2)
});

// Element-specific properties
export const rectanglePropsSchema = z.object({
  borderRadius: z.number().min(0).default(0)
});

export const linePropsSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number()
});

export const textPropsSchema = z.object({
  content: z.string(),
  maxWidth: z.number().positive().optional()
});

// Main canvas element schema
export const canvasElementSchema = z.object({
  id: z.string(),
  type: elementTypeSchema,
  canvasId: z.string(),
  position: positionSchema,
  dimensions: dimensionsSchema.optional(), // Not needed for lines
  zIndex: z.number().int().default(0),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  // Style properties (optional)
  fill: fillStyleSchema.nullable().default(null),
  stroke: strokeStyleSchema.nullable().default(null),
  textStyle: textStyleSchema.nullable().default(null),
  // Element-specific properties
  rectangleProps: rectanglePropsSchema.nullable().default(null),
  lineProps: linePropsSchema.nullable().default(null),
  textProps: textPropsSchema.nullable().default(null),
  // Metadata
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type CanvasElement = z.infer<typeof canvasElementSchema>;

// Canvas schema
export const canvasSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().default(null),
  width: z.number().positive().default(1920),
  height: z.number().positive().default(1080),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF'),
  zoom: z.number().positive().default(1),
  panX: z.number().default(0),
  panY: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type Canvas = z.infer<typeof canvasSchema>;

// AI chat message schema
export const chatMessageSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.coerce.date(),
  // Optional metadata for AI responses
  elementsCreated: z.array(z.string()).optional(), // Array of element IDs created by this message
  elementsModified: z.array(z.string()).optional() // Array of element IDs modified by this message
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Input schemas for creating/updating
export const createCanvasInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

export type CreateCanvasInput = z.infer<typeof createCanvasInputSchema>;

export const updateCanvasInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  zoom: z.number().positive().optional(),
  panX: z.number().optional(),
  panY: z.number().optional()
});

export type UpdateCanvasInput = z.infer<typeof updateCanvasInputSchema>;

export const createElementInputSchema = z.object({
  type: elementTypeSchema,
  canvasId: z.string(),
  position: positionSchema,
  dimensions: dimensionsSchema.optional(),
  zIndex: z.number().int().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  fill: fillStyleSchema.nullable().optional(),
  stroke: strokeStyleSchema.nullable().optional(),
  textStyle: textStyleSchema.nullable().optional(),
  rectangleProps: rectanglePropsSchema.nullable().optional(),
  lineProps: linePropsSchema.nullable().optional(),
  textProps: textPropsSchema.nullable().optional()
});

export type CreateElementInput = z.infer<typeof createElementInputSchema>;

export const updateElementInputSchema = z.object({
  id: z.string(),
  position: positionSchema.optional(),
  dimensions: dimensionsSchema.optional(),
  zIndex: z.number().int().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  fill: fillStyleSchema.nullable().optional(),
  stroke: strokeStyleSchema.nullable().optional(),
  textStyle: textStyleSchema.nullable().optional(),
  rectangleProps: rectanglePropsSchema.nullable().optional(),
  lineProps: linePropsSchema.nullable().optional(),
  textProps: textPropsSchema.nullable().optional()
});

export type UpdateElementInput = z.infer<typeof updateElementInputSchema>;

export const createChatMessageInputSchema = z.object({
  canvasId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  elementsCreated: z.array(z.string()).optional(),
  elementsModified: z.array(z.string()).optional()
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;

// AI generation request schema
export const aiGenerateRequestSchema = z.object({
  canvasId: z.string(),
  prompt: z.string().min(1),
  contextElementIds: z.array(z.string()).optional() // Optional context elements to consider
});

export type AIGenerateRequest = z.infer<typeof aiGenerateRequestSchema>;