import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  jsonb,
  varchar,
  pgEnum
} from 'drizzle-orm/pg-core';

// Enums for design elements
export const elementTypeEnum = pgEnum('element_type', ['rectangle', 'circle', 'line', 'text']);
export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant']);

// Canvas table
export const canvasTable = pgTable('canvas', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  width: numeric('width', { precision: 10, scale: 2 }).notNull().default('1920'),
  height: numeric('height', { precision: 10, scale: 2 }).notNull().default('1080'),
  backgroundColor: varchar('background_color', { length: 7 }).notNull().default('#FFFFFF'),
  zoom: numeric('zoom', { precision: 5, scale: 2 }).notNull().default('1'),
  panX: numeric('pan_x', { precision: 10, scale: 2 }).notNull().default('0'),
  panY: numeric('pan_y', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Canvas elements table
export const canvasElementsTable = pgTable('canvas_elements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  type: elementTypeEnum('type').notNull(),
  canvasId: varchar('canvas_id', { length: 36 }).notNull().references(() => canvasTable.id, { onDelete: 'cascade' }),
  
  // Position and layout
  positionX: numeric('position_x', { precision: 10, scale: 2 }).notNull(),
  positionY: numeric('position_y', { precision: 10, scale: 2 }).notNull(),
  width: numeric('width', { precision: 10, scale: 2 }), // Nullable for lines
  height: numeric('height', { precision: 10, scale: 2 }), // Nullable for lines
  zIndex: integer('z_index').notNull().default(0),
  
  // State
  visible: boolean('visible').notNull().default(true),
  locked: boolean('locked').notNull().default(false),
  
  // Style properties stored as JSONB for flexibility
  fill: jsonb('fill'), // Nullable - stores fill style object
  stroke: jsonb('stroke'), // Nullable - stores stroke style object
  textStyle: jsonb('text_style'), // Nullable - stores text style object
  
  // Element-specific properties stored as JSONB
  rectangleProps: jsonb('rectangle_props'), // Nullable - for rectangles
  lineProps: jsonb('line_props'), // Nullable - for lines
  textProps: jsonb('text_props'), // Nullable - for text elements
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chat messages table for AI interactions
export const chatMessagesTable = pgTable('chat_messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  canvasId: varchar('canvas_id', { length: 36 }).notNull().references(() => canvasTable.id, { onDelete: 'cascade' }),
  role: chatRoleEnum('role').notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  
  // Optional metadata for tracking AI-generated/modified elements
  elementsCreated: jsonb('elements_created'), // Array of element IDs
  elementsModified: jsonb('elements_modified'), // Array of element IDs
});

// TypeScript types for the table schemas
export type Canvas = typeof canvasTable.$inferSelect;
export type NewCanvas = typeof canvasTable.$inferInsert;

export type CanvasElement = typeof canvasElementsTable.$inferSelect;
export type NewCanvasElement = typeof canvasElementsTable.$inferInsert;

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  canvas: canvasTable,
  canvasElements: canvasElementsTable,
  chatMessages: chatMessagesTable
};