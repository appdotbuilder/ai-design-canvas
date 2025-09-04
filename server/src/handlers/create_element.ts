import { db } from '../db';
import { canvasElementsTable, canvasTable } from '../db/schema';
import { type CreateElementInput, type CanvasElement } from '../schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Creates a new canvas element (shape or text) on the specified canvas
 * This handler will generate a unique ID for the element and persist it to the database
 */
export async function createElement(input: CreateElementInput): Promise<CanvasElement> {
  try {
    // Verify that the canvas exists
    const canvas = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, input.canvasId))
      .execute();

    if (canvas.length === 0) {
      throw new Error(`Canvas with id ${input.canvasId} not found`);
    }

    // Generate unique ID
    const elementId = randomUUID();

    // Insert the element into the database
    const result = await db.insert(canvasElementsTable)
      .values({
        id: elementId,
        type: input.type,
        canvasId: input.canvasId,
        positionX: input.position.x.toString(),
        positionY: input.position.y.toString(),
        width: input.dimensions?.width?.toString() || null,
        height: input.dimensions?.height?.toString() || null,
        zIndex: input.zIndex || 0,
        visible: input.visible !== undefined ? input.visible : true,
        locked: input.locked !== undefined ? input.locked : false,
        fill: input.fill || null,
        stroke: input.stroke || null,
        textStyle: input.textStyle || null,
        rectangleProps: input.rectangleProps || null,
        lineProps: input.lineProps || null,
        textProps: input.textProps || null
      })
      .returning()
      .execute();

    // Convert the database result back to the expected format
    const element = result[0];
    return {
      id: element.id,
      type: element.type,
      canvasId: element.canvasId,
      position: {
        x: parseFloat(element.positionX),
        y: parseFloat(element.positionY)
      },
      dimensions: element.width && element.height ? {
        width: parseFloat(element.width),
        height: parseFloat(element.height)
      } : undefined,
      zIndex: element.zIndex,
      visible: element.visible,
      locked: element.locked,
      fill: element.fill as any,
      stroke: element.stroke as any,
      textStyle: element.textStyle as any,
      rectangleProps: element.rectangleProps as any,
      lineProps: element.lineProps as any,
      textProps: element.textProps as any,
      createdAt: element.createdAt,
      updatedAt: element.updatedAt
    };
  } catch (error) {
    console.error('Element creation failed:', error);
    throw error;
  }
}