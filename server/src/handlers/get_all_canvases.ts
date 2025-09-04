import { db } from '../db';
import { canvasTable } from '../db/schema';
import { type Canvas } from '../schema';

/**
 * Retrieves all canvases in the system
 * This handler will fetch all available canvases for listing/browsing purposes
 */
export const getAllCanvases = async (): Promise<Canvas[]> => {
  try {
    const results = await db.select()
      .from(canvasTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(canvas => ({
      ...canvas,
      width: parseFloat(canvas.width),
      height: parseFloat(canvas.height),
      zoom: parseFloat(canvas.zoom),
      panX: parseFloat(canvas.panX),
      panY: parseFloat(canvas.panY)
    }));
  } catch (error) {
    console.error('Failed to retrieve canvases:', error);
    throw error;
  }
};