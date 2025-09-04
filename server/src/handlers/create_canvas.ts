import { db } from '../db';
import { canvasTable } from '../db/schema';
import { type CreateCanvasInput, type Canvas } from '../schema';
import { randomUUID } from 'crypto';

export const createCanvas = async (input: CreateCanvasInput): Promise<Canvas> => {
  try {
    // Generate unique ID
    const canvasId = randomUUID();

    // Insert canvas record with proper numeric conversions
    const result = await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: input.name,
        description: input.description || null,
        width: (input.width || 1920).toString(), // Convert number to string for numeric column
        height: (input.height || 1080).toString(), // Convert number to string for numeric column
        backgroundColor: input.backgroundColor || '#FFFFFF',
        zoom: '1', // Default zoom as string
        panX: '0', // Default panX as string
        panY: '0', // Default panY as string
      })
      .returning()
      .execute();

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
    console.error('Canvas creation failed:', error);
    throw error;
  }
};