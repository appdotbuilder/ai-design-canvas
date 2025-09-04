import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable, canvasElementsTable } from '../db/schema';
import { type UpdateElementInput } from '../schema';
import { updateElement } from '../handlers/update_element';
import { eq } from 'drizzle-orm';

describe('updateElement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCanvasId: string;
  let testElementId: string;

  beforeEach(async () => {
    // Create test canvas first
    testCanvasId = `canvas-${Math.random().toString(36).substring(2)}`;
    await db.insert(canvasTable)
      .values({
        id: testCanvasId,
        name: 'Test Canvas',
        description: 'Canvas for testing',
        width: '1920',
        height: '1080',
        backgroundColor: '#FFFFFF',
        zoom: '1',
        panX: '0',
        panY: '0',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .execute();

    // Create test element
    testElementId = `element-${Math.random().toString(36).substring(2)}`;
    await db.insert(canvasElementsTable)
      .values({
        id: testElementId,
        type: 'rectangle',
        canvasId: testCanvasId,
        positionX: '10',
        positionY: '20',
        width: '100',
        height: '50',
        zIndex: 0,
        visible: true,
        locked: false,
        fill: { color: '#FF0000', opacity: 1 },
        stroke: null,
        textStyle: null,
        rectangleProps: { borderRadius: 5 },
        lineProps: null,
        textProps: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .execute();
  });

  it('should update element position', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      position: { x: 100, y: 200 }
    };

    const result = await updateElement(input);

    expect(result.id).toEqual(testElementId);
    expect(result.position).toEqual({ x: 100, y: 200 });
    expect(result.dimensions).toEqual({ width: 100, height: 50 }); // Should preserve original dimensions
    expect(result.zIndex).toEqual(0); // Should preserve original zIndex
    expect(result.type).toEqual('rectangle');
  });

  it('should update element dimensions', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      dimensions: { width: 300, height: 150 }
    };

    const result = await updateElement(input);

    expect(result.dimensions).toEqual({ width: 300, height: 150 });
    expect(result.position).toEqual({ x: 10, y: 20 }); // Should preserve original position
    expect(typeof result.dimensions?.width).toBe('number');
    expect(typeof result.dimensions?.height).toBe('number');
  });

  it('should update element visibility and lock state', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      visible: false,
      locked: true
    };

    const result = await updateElement(input);

    expect(result.visible).toBe(false);
    expect(result.locked).toBe(true);
    expect(result.zIndex).toEqual(0); // Should preserve original zIndex
  });

  it('should update element z-index', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      zIndex: 5
    };

    const result = await updateElement(input);

    expect(result.zIndex).toEqual(5);
    expect(result.position).toEqual({ x: 10, y: 20 }); // Should preserve other properties
  });

  it('should update fill style', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      fill: { color: '#00FF00', opacity: 0.8 }
    };

    const result = await updateElement(input);

    expect(result.fill).toEqual({ color: '#00FF00', opacity: 0.8 });
    expect(result.stroke).toBeNull(); // Should preserve original stroke (null)
  });

  it('should update stroke style', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      stroke: { 
        color: '#0000FF', 
        width: 2, 
        opacity: 1, 
        cap: 'round', 
        join: 'round' 
      }
    };

    const result = await updateElement(input);

    expect(result.stroke).toEqual({ 
      color: '#0000FF', 
      width: 2, 
      opacity: 1, 
      cap: 'round', 
      join: 'round' 
    });
    expect(result.fill).toEqual({ color: '#FF0000', opacity: 1 }); // Should preserve original fill
  });

  it('should update text style', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      textStyle: {
        fontFamily: 'Georgia',
        fontSize: 24,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.5
      }
    };

    const result = await updateElement(input);

    expect(result.textStyle).toEqual({
      fontFamily: 'Georgia',
      fontSize: 24,
      fontWeight: 700,
      textAlign: 'center',
      lineHeight: 1.5
    });
  });

  it('should update element-specific properties', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      rectangleProps: { borderRadius: 15 }
    };

    const result = await updateElement(input);

    expect(result.rectangleProps).toEqual({ borderRadius: 15 });
    expect(result.lineProps).toBeNull(); // Should preserve other element props
    expect(result.textProps).toBeNull();
  });

  it('should update multiple properties simultaneously', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      position: { x: 50, y: 75 },
      dimensions: { width: 200, height: 100 },
      zIndex: 3,
      visible: false,
      locked: true,
      fill: { color: '#FFFF00', opacity: 0.5 },
      stroke: { color: '#FF00FF', width: 3, opacity: 1, cap: 'square', join: 'bevel' }
    };

    const result = await updateElement(input);

    expect(result.position).toEqual({ x: 50, y: 75 });
    expect(result.dimensions).toEqual({ width: 200, height: 100 });
    expect(result.zIndex).toEqual(3);
    expect(result.visible).toBe(false);
    expect(result.locked).toBe(true);
    expect(result.fill).toEqual({ color: '#FFFF00', opacity: 0.5 });
    expect(result.stroke).toEqual({ color: '#FF00FF', width: 3, opacity: 1, cap: 'square', join: 'bevel' });
  });

  it('should save changes to database', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      position: { x: 999, y: 888 },
      zIndex: 10
    };

    await updateElement(input);

    // Verify changes were persisted in database
    const elements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, testElementId))
      .execute();

    expect(elements).toHaveLength(1);
    expect(parseFloat(elements[0].positionX)).toEqual(999);
    expect(parseFloat(elements[0].positionY)).toEqual(888);
    expect(elements[0].zIndex).toEqual(10);
    expect(elements[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should preserve unchanged properties', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      position: { x: 123, y: 456 }
    };

    const result = await updateElement(input);

    // Should preserve all other properties
    expect(result.type).toEqual('rectangle');
    expect(result.canvasId).toEqual(testCanvasId);
    expect(result.dimensions).toEqual({ width: 100, height: 50 });
    expect(result.zIndex).toEqual(0);
    expect(result.visible).toBe(true);
    expect(result.locked).toBe(false);
    expect(result.fill).toEqual({ color: '#FF0000', opacity: 1 });
    expect(result.rectangleProps).toEqual({ borderRadius: 5 });
  });

  it('should throw error for non-existent element', async () => {
    const nonExistentId = `nonexistent-${Math.random().toString(36).substring(2)}`;
    const input: UpdateElementInput = {
      id: nonExistentId,
      position: { x: 100, y: 200 }
    };

    expect(updateElement(input)).rejects.toThrow(/not found/i);
  });

  it('should handle null values correctly', async () => {
    const input: UpdateElementInput = {
      id: testElementId,
      fill: null,
      stroke: null,
      textStyle: null,
      rectangleProps: null
    };

    const result = await updateElement(input);

    expect(result.fill).toBeNull();
    expect(result.stroke).toBeNull();
    expect(result.textStyle).toBeNull();
    expect(result.rectangleProps).toBeNull();
  });
})