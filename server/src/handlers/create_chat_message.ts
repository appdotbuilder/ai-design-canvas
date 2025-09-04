import { db } from '../db';
import { chatMessagesTable, canvasTable } from '../db/schema';
import { type CreateChatMessageInput, type ChatMessage } from '../schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const createChatMessage = async (input: CreateChatMessageInput): Promise<ChatMessage> => {
  try {
    // Verify canvas exists first
    const canvas = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, input.canvasId))
      .limit(1)
      .execute();

    if (canvas.length === 0) {
      throw new Error(`Canvas with id ${input.canvasId} not found`);
    }

    // Insert chat message record
    const result = await db.insert(chatMessagesTable)
      .values({
        id: randomUUID(),
        canvasId: input.canvasId,
        role: input.role,
        content: input.content,
        elementsCreated: input.elementsCreated || null,
        elementsModified: input.elementsModified || null
      })
      .returning()
      .execute();

    const chatMessage = result[0];
    
    // Convert null to undefined to match schema type
    return {
      ...chatMessage,
      elementsCreated: chatMessage.elementsCreated ? (chatMessage.elementsCreated as string[]) : undefined,
      elementsModified: chatMessage.elementsModified ? (chatMessage.elementsModified as string[]) : undefined
    };
  } catch (error) {
    console.error('Chat message creation failed:', error);
    throw error;
  }
};