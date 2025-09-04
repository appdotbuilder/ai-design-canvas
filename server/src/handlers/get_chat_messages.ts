import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type ChatMessage } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Retrieves all chat messages for a specific canvas
 * This handler will fetch the conversation history for AI interactions on a canvas
 */
export async function getChatMessages(canvasId: string): Promise<ChatMessage[]> {
  try {
    // Query chat messages for the canvas, ordered by timestamp (newest first)
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.canvasId, canvasId))
      .orderBy(desc(chatMessagesTable.timestamp))
      .execute();

    // Transform database results to match the schema type
    return messages.map(message => ({
      id: message.id,
      canvasId: message.canvasId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      elementsCreated: message.elementsCreated ? (message.elementsCreated as string[]) : undefined,
      elementsModified: message.elementsModified ? (message.elementsModified as string[]) : undefined
    }));
  } catch (error) {
    console.error('Failed to retrieve chat messages:', error);
    throw error;
  }
}