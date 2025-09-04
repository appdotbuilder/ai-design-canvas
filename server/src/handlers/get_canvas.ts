import { db } from '../db';
import { canvasTable } from '../db/schema';
import { type Canvas } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Retrieves a canvas by its ID
 * This handler will fetch a canvas from the database and return it, or throw an error if not found
 */
export async function getCanvas(id: string): Promise<Canvas> {
  try {
    // Query the canvas from the database
    const results = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error(`Canvas with id ${id} not found`);
    }

    const canvas = results[0];

    // Convert numeric fields back to numbers for proper typing
    return {
      ...canvas,
      width: parseFloat(canvas.width),
      height: parseFloat(canvas.height),
      zoom: parseFloat(canvas.zoom),
      panX: parseFloat(canvas.panX),
      panY: parseFloat(canvas.panY)
    };
  } catch (error) {
    console.error('Canvas retrieval failed:', error);
    throw error;
  }
}