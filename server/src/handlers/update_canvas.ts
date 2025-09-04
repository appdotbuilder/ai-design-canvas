import { db } from '../db';
import { canvasTable } from '../db/schema';
import { type UpdateCanvasInput, type Canvas } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Updates an existing canvas with new properties
 * This handler will update the specified canvas properties in the database
 */
export async function updateCanvas(input: UpdateCanvasInput): Promise<Canvas> {
  try {
    // Build the update data object with only provided fields
    const updateData: Partial<typeof canvasTable.$inferInsert> = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.width !== undefined) {
      updateData.width = input.width.toString();
    }

    if (input.height !== undefined) {
      updateData.height = input.height.toString();
    }

    if (input.backgroundColor !== undefined) {
      updateData.backgroundColor = input.backgroundColor;
    }

    if (input.zoom !== undefined) {
      updateData.zoom = input.zoom.toString();
    }

    if (input.panX !== undefined) {
      updateData.panX = input.panX.toString();
    }

    if (input.panY !== undefined) {
      updateData.panY = input.panY.toString();
    }

    // Update the canvas record
    const result = await db.update(canvasTable)
      .set(updateData)
      .where(eq(canvasTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Canvas with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const canvas = result[0];
    return {
      ...canvas,
      width: parseFloat(canvas.width),
      height: parseFloat(canvas.height),
      zoom: parseFloat(canvas.zoom),
      panX: parseFloat(canvas.panX),
      panY: parseFloat(canvas.panY)
    };
  } catch (error) {
    console.error('Canvas update failed:', error);
    throw error;
  }
}