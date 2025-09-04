import { db } from '../db';
import { canvasElementsTable } from '../db/schema';
import { type UpdateElementInput, type CanvasElement } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Updates an existing canvas element with new properties
 * This handler will update the specified element properties in the database
 */
export async function updateElement(input: UpdateElementInput): Promise<CanvasElement> {
  try {
    // Prepare update data, converting numeric fields to strings for database storage
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    // Convert position coordinates if provided
    if (input.position) {
      updateData['positionX'] = input.position.x.toString();
      updateData['positionY'] = input.position.y.toString();
    }

    // Convert dimensions if provided
    if (input.dimensions) {
      updateData['width'] = input.dimensions.width.toString();
      updateData['height'] = input.dimensions.height.toString();
    }

    // Handle other optional fields
    if (input.zIndex !== undefined) updateData['zIndex'] = input.zIndex;
    if (input.visible !== undefined) updateData['visible'] = input.visible;
    if (input.locked !== undefined) updateData['locked'] = input.locked;

    // Handle style properties - store as JSONB
    if (input.fill !== undefined) updateData['fill'] = input.fill;
    if (input.stroke !== undefined) updateData['stroke'] = input.stroke;
    if (input.textStyle !== undefined) updateData['textStyle'] = input.textStyle;

    // Handle element-specific properties - store as JSONB
    if (input.rectangleProps !== undefined) updateData['rectangleProps'] = input.rectangleProps;
    if (input.lineProps !== undefined) updateData['lineProps'] = input.lineProps;
    if (input.textProps !== undefined) updateData['textProps'] = input.textProps;

    // Update element in database
    const result = await db.update(canvasElementsTable)
      .set(updateData)
      .where(eq(canvasElementsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Element with id ${input.id} not found`);
    }

    const element = result[0];

    // Convert numeric fields back to numbers before returning
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
    console.error('Element update failed:', error);
    throw error;
  }
}