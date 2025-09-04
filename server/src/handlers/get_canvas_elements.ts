import { db } from '../db';
import { canvasElementsTable } from '../db/schema';
import { type CanvasElement } from '../schema';
import { eq, asc } from 'drizzle-orm';

/**
 * Retrieves all elements for a specific canvas
 * This handler will fetch all canvas elements from the database for the given canvas ID
 */
export const getCanvasElements = async (canvasId: string): Promise<CanvasElement[]> => {
  try {
    const results = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.canvasId, canvasId))
      .orderBy(asc(canvasElementsTable.zIndex), asc(canvasElementsTable.createdAt))
      .execute();

    // Convert database results to CanvasElement format with proper type conversions
    return results.map(element => ({
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
      fill: element.fill as any, // JSONB data is already parsed
      stroke: element.stroke as any, // JSONB data is already parsed
      textStyle: element.textStyle as any, // JSONB data is already parsed
      rectangleProps: element.rectangleProps as any, // JSONB data is already parsed
      lineProps: element.lineProps as any, // JSONB data is already parsed
      textProps: element.textProps as any, // JSONB data is already parsed
      createdAt: element.createdAt,
      updatedAt: element.updatedAt
    }));
  } catch (error) {
    console.error('Failed to retrieve canvas elements:', error);
    throw error;
  }
};