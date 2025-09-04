import { db } from '../db';
import { canvasElementsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Deletes a canvas element by its ID
 * This handler will remove the specified element from the database
 */
export async function deleteElement(elementId: string): Promise<void> {
  try {
    await db.delete(canvasElementsTable)
      .where(eq(canvasElementsTable.id, elementId))
      .execute();
  } catch (error) {
    console.error('Element deletion failed:', error);
    throw error;
  }
}