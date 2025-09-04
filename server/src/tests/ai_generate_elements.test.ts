import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable, canvasElementsTable } from '../db/schema';
import { type AIGenerateRequest } from '../schema';
import { aiGenerateElements } from '../handlers/ai_generate_elements';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('aiGenerateElements', () => {
  let testCanvasId: string;

  beforeEach(async () => {
    await createDB();
    
    // Create a test canvas
    testCanvasId = randomUUID();
    await db.insert(canvasTable).values({
      id: testCanvasId,
      name: 'Test Canvas',
      width: '1920',
      height: '1080',
      backgroundColor: '#FFFFFF',
    }).execute();
  });

  afterEach(resetDB);

  describe('basic element generation', () => {
    it('should create a rectangle from prompt', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a blue rectangle'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rectangle');
      expect(result[0].canvasId).toBe(testCanvasId);
      expect(result[0].fill?.color).toBe('#3B82F6'); // Blue
      expect(result[0].dimensions).toBeDefined();
      expect(result[0].position).toBeDefined();
      expect(result[0].rectangleProps).toBeDefined();
    });

    it('should create a circle from prompt', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Add a red circle'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('circle');
      expect(result[0].fill?.color).toBe('#EF4444'); // Red
      expect(result[0].dimensions?.width).toBe(100);
      expect(result[0].dimensions?.height).toBe(100);
    });

    it('should create a line from prompt', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Draw a green line'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('line');
      expect(result[0].stroke?.color).toBe('#10B981'); // Green
      expect(result[0].lineProps).toBeDefined();
      expect(result[0].lineProps?.x1).toBeDefined();
      expect(result[0].lineProps?.y1).toBeDefined();
      expect(result[0].lineProps?.x2).toBeDefined();
      expect(result[0].lineProps?.y2).toBeDefined();
    });

    it('should create text element from prompt', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Add text that says "Hello World"'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].textProps?.content).toBe('Hello World');
      expect(result[0].textStyle?.fontSize).toBe(16);
      expect(result[0].textStyle?.fontFamily).toBe('Arial');
    });
  });

  describe('element variations', () => {
    it('should create a square when specified', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a yellow square'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rectangle');
      expect(result[0].fill?.color).toBe('#F59E0B'); // Yellow
      expect(result[0].dimensions?.width).toBe(100);
      expect(result[0].dimensions?.height).toBe(100);
    });

    it('should create rounded rectangle when specified', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Add a rounded purple rectangle'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rectangle');
      expect(result[0].fill?.color).toBe('#8B5CF6'); // Purple
      expect(result[0].rectangleProps?.borderRadius).toBe(10);
    });

    it('should create title text with larger font', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a title that says "Main Header"'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].textProps?.content).toBe('Main Header');
      expect(result[0].textStyle?.fontSize).toBe(24);
    });

    it('should create bold text when specified', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Add bold text "Important Note"'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].textProps?.content).toBe('Important Note');
      expect(result[0].textStyle?.fontWeight).toBe(700);
    });
  });

  describe('color detection', () => {
    it('should detect multiple colors correctly', async () => {
      const colorTests = [
        { prompt: 'red rectangle', expectedColor: '#EF4444' },
        { prompt: 'green circle', expectedColor: '#10B981' },
        { prompt: 'orange line', expectedColor: '#F97316' },
        { prompt: 'pink text', expectedColor: '#EC4899' },
        { prompt: 'gray box', expectedColor: '#6B7280' },
        { prompt: 'black square', expectedColor: '#000000' },
      ];

      for (const test of colorTests) {
        const input: AIGenerateRequest = {
          canvasId: testCanvasId,
          prompt: test.prompt
        };

        const result = await aiGenerateElements(input);
        expect(result).toHaveLength(1);
        
        if (test.prompt.includes('line')) {
          expect(result[0].stroke?.color).toBe(test.expectedColor);
        } else {
          expect(result[0].fill?.color).toBe(test.expectedColor);
        }
      }
    });

    it('should default to blue when no color specified', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a rectangle'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].fill?.color).toBe('#3B82F6'); // Default blue
    });
  });

  describe('default behavior', () => {
    it('should create default rectangle for unrecognized prompts', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'xyz abc random prompt'
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rectangle');
      expect(result[0].fill?.color).toBe('#3B82F6'); // Default blue
      expect(result[0].dimensions?.width).toBe(150);
      expect(result[0].dimensions?.height).toBe(100);
    });
  });

  describe('canvas positioning', () => {
    it('should position elements near canvas center', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a rectangle'
      };

      const result = await aiGenerateElements(input);
      const element = result[0];
      
      // Canvas is 1920x1080, so center is 960, 540
      expect(element.position.x).toBeCloseTo(960 - 75, 0); // Rectangle width/2
      expect(element.position.y).toBeCloseTo(540 - 50, 0); // Rectangle height/2
    });
  });

  describe('context elements', () => {
    it('should adjust positions when context elements provided', async () => {
      // First create a context element
      const contextElementId = randomUUID();
      await db.insert(canvasElementsTable).values({
        id: contextElementId,
        type: 'rectangle',
        canvasId: testCanvasId,
        positionX: '100',
        positionY: '100',
        width: '50',
        height: '50',
        zIndex: 0,
        visible: true,
        locked: false,
      }).execute();

      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a blue rectangle',
        contextElementIds: [contextElementId]
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      // Position should be offset from default due to context
      const expectedBaseX = 960 - 75; // 885 (default center position)
      const expectedAdjustedX = expectedBaseX + 50; // 935 (with context offset)
      expect(result[0].position.x).toBe(expectedAdjustedX);
    });

    it('should work without context elements', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a rectangle',
        contextElementIds: []
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rectangle');
    });
  });

  describe('database persistence', () => {
    it('should save generated elements to database', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a red circle'
      };

      const result = await aiGenerateElements(input);
      const elementId = result[0].id;

      // Verify element exists in database
      const dbElements = await db.select()
        .from(canvasElementsTable)
        .where(eq(canvasElementsTable.id, elementId))
        .execute();

      expect(dbElements).toHaveLength(1);
      expect(dbElements[0].type).toBe('circle');
      expect(dbElements[0].canvasId).toBe(testCanvasId);
    });

    it('should handle numeric field conversions correctly', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a rectangle'
      };

      const result = await aiGenerateElements(input);
      const element = result[0];

      // Check that numeric fields are properly converted
      expect(typeof element.position.x).toBe('number');
      expect(typeof element.position.y).toBe('number');
      expect(typeof element.dimensions?.width).toBe('number');
      expect(typeof element.dimensions?.height).toBe('number');
      expect(typeof element.zIndex).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent canvas', async () => {
      const input: AIGenerateRequest = {
        canvasId: 'non-existent-id',
        prompt: 'Create a rectangle'
      };

      await expect(aiGenerateElements(input)).rejects.toThrow(/Canvas with ID .* not found/);
    });

    it('should handle invalid context element IDs gracefully', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a rectangle',
        contextElementIds: ['invalid-id-1', 'invalid-id-2']
      };

      const result = await aiGenerateElements(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rectangle');
    });
  });

  describe('multiple element types', () => {
    it('should prioritize first element type in prompt', async () => {
      const input: AIGenerateRequest = {
        canvasId: testCanvasId,
        prompt: 'Create a blue rectangle and add text that says "Label"'
      };

      const result = await aiGenerateElements(input);

      // Should create only one element (rectangle takes priority)
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rectangle');
      expect(result[0].fill?.color).toBe('#3B82F6'); // Blue
    });
  });
});