import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable, chatMessagesTable } from '../db/schema';
import { getChatMessages } from '../handlers/get_chat_messages';
import { randomUUID } from 'crypto';

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for canvas with no messages', async () => {
    // Create a canvas first
    const canvasId = randomUUID();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Test Canvas'
      })
      .execute();

    const result = await getChatMessages(canvasId);

    expect(result).toEqual([]);
  });

  it('should retrieve all messages for a canvas', async () => {
    // Create a canvas
    const canvasId = randomUUID();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Test Canvas'
      })
      .execute();

    // Create test messages
    const message1Id = randomUUID();
    const message2Id = randomUUID();
    const message3Id = randomUUID();

    await db.insert(chatMessagesTable)
      .values([
        {
          id: message1Id,
          canvasId: canvasId,
          role: 'user',
          content: 'Create a red rectangle',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: message2Id,
          canvasId: canvasId,
          role: 'assistant',
          content: 'I have created a red rectangle for you.',
          timestamp: new Date('2024-01-01T10:01:00Z'),
          elementsCreated: ['element-1']
        },
        {
          id: message3Id,
          canvasId: canvasId,
          role: 'user',
          content: 'Make it bigger',
          timestamp: new Date('2024-01-01T10:02:00Z')
        }
      ])
      .execute();

    const result = await getChatMessages(canvasId);

    expect(result).toHaveLength(3);
    
    // Verify messages are ordered by timestamp descending (newest first)
    expect(result[0].content).toEqual('Make it bigger');
    expect(result[0].role).toEqual('user');
    expect(result[0].timestamp).toEqual(new Date('2024-01-01T10:02:00Z'));
    expect(result[0].elementsCreated).toBeUndefined();
    expect(result[0].elementsModified).toBeUndefined();

    expect(result[1].content).toEqual('I have created a red rectangle for you.');
    expect(result[1].role).toEqual('assistant');
    expect(result[1].timestamp).toEqual(new Date('2024-01-01T10:01:00Z'));
    expect(result[1].elementsCreated).toEqual(['element-1']);
    expect(result[1].elementsModified).toBeUndefined();

    expect(result[2].content).toEqual('Create a red rectangle');
    expect(result[2].role).toEqual('user');
    expect(result[2].timestamp).toEqual(new Date('2024-01-01T10:00:00Z'));

    // Verify all messages have the correct canvas ID
    result.forEach(message => {
      expect(message.canvasId).toEqual(canvasId);
      expect(message.id).toBeDefined();
    });
  });

  it('should only return messages for the specified canvas', async () => {
    // Create two canvases
    const canvas1Id = randomUUID();
    const canvas2Id = randomUUID();
    
    await db.insert(canvasTable)
      .values([
        {
          id: canvas1Id,
          name: 'Canvas 1'
        },
        {
          id: canvas2Id,
          name: 'Canvas 2'
        }
      ])
      .execute();

    // Create messages for both canvases
    await db.insert(chatMessagesTable)
      .values([
        {
          id: randomUUID(),
          canvasId: canvas1Id,
          role: 'user',
          content: 'Message for canvas 1',
          timestamp: new Date()
        },
        {
          id: randomUUID(),
          canvasId: canvas2Id,
          role: 'user',
          content: 'Message for canvas 2',
          timestamp: new Date()
        },
        {
          id: randomUUID(),
          canvasId: canvas1Id,
          role: 'assistant',
          content: 'Another message for canvas 1',
          timestamp: new Date()
        }
      ])
      .execute();

    const result = await getChatMessages(canvas1Id);

    expect(result).toHaveLength(2);
    result.forEach(message => {
      expect(message.canvasId).toEqual(canvas1Id);
      expect(message.content).toMatch(/canvas 1/);
    });
  });

  it('should handle messages with all optional fields', async () => {
    // Create a canvas
    const canvasId = randomUUID();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Test Canvas'
      })
      .execute();

    // Create a message with both elementsCreated and elementsModified
    const messageId = randomUUID();
    await db.insert(chatMessagesTable)
      .values({
        id: messageId,
        canvasId: canvasId,
        role: 'assistant',
        content: 'I have updated the design',
        elementsCreated: ['element-1', 'element-2'],
        elementsModified: ['element-3', 'element-4']
      })
      .execute();

    const result = await getChatMessages(canvasId);

    expect(result).toHaveLength(1);
    expect(result[0].elementsCreated).toEqual(['element-1', 'element-2']);
    expect(result[0].elementsModified).toEqual(['element-3', 'element-4']);
  });

  it('should return messages in chronological order (newest first)', async () => {
    // Create a canvas
    const canvasId = randomUUID();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Test Canvas'
      })
      .execute();

    // Create messages with different timestamps
    const baseTime = new Date('2024-01-01T10:00:00Z');
    const messages = [];
    
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(baseTime.getTime() + i * 60000); // 1 minute apart
      messages.push({
        id: randomUUID(),
        canvasId: canvasId,
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i}`,
        timestamp: timestamp
      });
    }

    await db.insert(chatMessagesTable)
      .values(messages)
      .execute();

    const result = await getChatMessages(canvasId);

    expect(result).toHaveLength(5);
    
    // Verify descending order (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].timestamp.getTime()).toBeGreaterThan(result[i + 1].timestamp.getTime());
    }

    expect(result[0].content).toEqual('Message 4'); // Latest message
    expect(result[4].content).toEqual('Message 0'); // Oldest message
  });
});