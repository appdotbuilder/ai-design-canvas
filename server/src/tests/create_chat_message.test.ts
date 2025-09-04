import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatMessagesTable, canvasTable } from '../db/schema';
import { type CreateChatMessageInput } from '../schema';
import { createChatMessage } from '../handlers/create_chat_message';
import { eq } from 'drizzle-orm';

// Test canvas data
const testCanvas = {
  id: 'test-canvas-123',
  name: 'Test Canvas',
  description: 'A canvas for testing',
  width: '1920',
  height: '1080',
  backgroundColor: '#FFFFFF'
};

// Simple test input
const testInput: CreateChatMessageInput = {
  canvasId: 'test-canvas-123',
  role: 'user',
  content: 'Create a blue rectangle in the center'
};

// Test input with element tracking
const testInputWithElements: CreateChatMessageInput = {
  canvasId: 'test-canvas-123',
  role: 'assistant',
  content: 'I created a blue rectangle for you',
  elementsCreated: ['element-1', 'element-2'],
  elementsModified: ['element-3']
};

describe('createChatMessage', () => {
  beforeEach(async () => {
    await createDB();
    // Create test canvas first
    await db.insert(canvasTable).values(testCanvas).execute();
  });
  
  afterEach(resetDB);

  it('should create a chat message', async () => {
    const result = await createChatMessage(testInput);

    // Basic field validation
    expect(result.canvasId).toEqual('test-canvas-123');
    expect(result.role).toEqual('user');
    expect(result.content).toEqual('Create a blue rectangle in the center');
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.elementsCreated).toBeUndefined();
    expect(result.elementsModified).toBeUndefined();
  });

  it('should create a chat message with element tracking', async () => {
    const result = await createChatMessage(testInputWithElements);

    // Validate element tracking arrays
    expect(result.canvasId).toEqual('test-canvas-123');
    expect(result.role).toEqual('assistant');
    expect(result.content).toEqual('I created a blue rectangle for you');
    expect(result.elementsCreated).toEqual(['element-1', 'element-2']);
    expect(result.elementsModified).toEqual(['element-3']);
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should save chat message to database', async () => {
    const result = await createChatMessage(testInput);

    // Query database to verify storage
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].canvasId).toEqual('test-canvas-123');
    expect(messages[0].role).toEqual('user');
    expect(messages[0].content).toEqual('Create a blue rectangle in the center');
    expect(messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('should save element tracking data to database', async () => {
    const result = await createChatMessage(testInputWithElements);

    // Query database to verify JSON storage
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    
    // JSONB fields are automatically parsed by Drizzle
    expect(messages[0].elementsCreated).toEqual(['element-1', 'element-2']);
    expect(messages[0].elementsModified).toEqual(['element-3']);
  });

  it('should throw error when canvas does not exist', async () => {
    const invalidInput: CreateChatMessageInput = {
      canvasId: 'non-existent-canvas',
      role: 'user',
      content: 'This should fail'
    };

    await expect(createChatMessage(invalidInput)).rejects.toThrow(/Canvas with id non-existent-canvas not found/i);
  });

  it('should handle empty element arrays', async () => {
    const inputWithEmptyArrays: CreateChatMessageInput = {
      canvasId: 'test-canvas-123',
      role: 'assistant',
      content: 'No elements were created or modified',
      elementsCreated: [],
      elementsModified: []
    };

    const result = await createChatMessage(inputWithEmptyArrays);

    expect(result.elementsCreated).toEqual([]);
    expect(result.elementsModified).toEqual([]);
  });

  it('should generate unique IDs for multiple messages', async () => {
    const result1 = await createChatMessage(testInput);
    const result2 = await createChatMessage(testInput);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should handle different role types', async () => {
    const userMessage: CreateChatMessageInput = {
      canvasId: 'test-canvas-123',
      role: 'user',
      content: 'User message'
    };

    const assistantMessage: CreateChatMessageInput = {
      canvasId: 'test-canvas-123',
      role: 'assistant',
      content: 'Assistant response'
    };

    const userResult = await createChatMessage(userMessage);
    const assistantResult = await createChatMessage(assistantMessage);

    expect(userResult.role).toEqual('user');
    expect(assistantResult.role).toEqual('assistant');
  });
});