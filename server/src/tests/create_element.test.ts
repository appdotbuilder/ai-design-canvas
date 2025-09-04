import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable, canvasElementsTable } from '../db/schema';
import { type CreateElementInput } from '../schema';
import { createElement } from '../handlers/create_element';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('createElement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCanvasId: string;

  beforeEach(async () => {
    // Create a test canvas for all tests
    testCanvasId = randomUUID();
    await db.insert(canvasTable)
      .values({
        id: testCanvasId,
        name: 'Test Canvas',
        description: 'A canvas for testing',
        width: '1920',
        height: '1080',
        backgroundColor: '#FFFFFF'
      })
      .execute();
  });

  it('should create a rectangle element', async () => {
    const input: CreateElementInput = {
      type: 'rectangle',
      canvasId: testCanvasId,
      position: { x: 100, y: 150 },
      dimensions: { width: 200, height: 100 },
      zIndex: 1,
      visible: true,
      locked: false,
      fill: {
        color: '#FF0000',
        opacity: 0.8
      },
      stroke: {
        color: '#000000',
        width: 2,
        opacity: 1,
        cap: 'round',
        join: 'miter'
      },
      rectangleProps: {
        borderRadius: 10
      }
    };

    const result = await createElement(input);

    // Verify basic properties
    expect(result.id).toBeDefined();
    expect(result.type).toEqual('rectangle');
    expect(result.canvasId).toEqual(testCanvasId);
    expect(result.position).toEqual({ x: 100, y: 150 });
    expect(result.dimensions).toEqual({ width: 200, height: 100 });
    expect(result.zIndex).toEqual(1);
    expect(result.visible).toEqual(true);
    expect(result.locked).toEqual(false);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);

    // Verify style properties
    expect(result.fill).toEqual({
      color: '#FF0000',
      opacity: 0.8
    });
    expect(result.stroke).toEqual({
      color: '#000000',
      width: 2,
      opacity: 1,
      cap: 'round',
      join: 'miter'
    });
    expect(result.rectangleProps).toEqual({
      borderRadius: 10
    });

    // Verify null properties
    expect(result.textStyle).toBeNull();
    expect(result.lineProps).toBeNull();
    expect(result.textProps).toBeNull();
  });

  it('should create a circle element with defaults', async () => {
    const input: CreateElementInput = {
      type: 'circle',
      canvasId: testCanvasId,
      position: { x: 50, y: 75 },
      dimensions: { width: 100, height: 100 }
    };

    const result = await createElement(input);

    // Verify defaults are applied
    expect(result.type).toEqual('circle');
    expect(result.zIndex).toEqual(0);
    expect(result.visible).toEqual(true);
    expect(result.locked).toEqual(false);
    expect(result.fill).toBeNull();
    expect(result.stroke).toBeNull();
    expect(result.textStyle).toBeNull();
    expect(result.rectangleProps).toBeNull();
    expect(result.lineProps).toBeNull();
    expect(result.textProps).toBeNull();
  });

  it('should create a line element without dimensions', async () => {
    const input: CreateElementInput = {
      type: 'line',
      canvasId: testCanvasId,
      position: { x: 0, y: 0 },
      stroke: {
        color: '#0000FF',
        width: 3,
        opacity: 1,
        cap: 'round',
        join: 'round'
      },
      lineProps: {
        x1: 10,
        y1: 10,
        x2: 100,
        y2: 50
      }
    };

    const result = await createElement(input);

    expect(result.type).toEqual('line');
    expect(result.dimensions).toBeUndefined();
    expect(result.stroke).toEqual({
      color: '#0000FF',
      width: 3,
      opacity: 1,
      cap: 'round',
      join: 'round'
    });
    expect(result.lineProps).toEqual({
      x1: 10,
      y1: 10,
      x2: 100,
      y2: 50
    });
  });

  it('should create a text element', async () => {
    const input: CreateElementInput = {
      type: 'text',
      canvasId: testCanvasId,
      position: { x: 200, y: 300 },
      dimensions: { width: 150, height: 50 },
      textStyle: {
        fontFamily: 'Helvetica',
        fontSize: 18,
        fontWeight: 600,
        textAlign: 'center',
        lineHeight: 1.4
      },
      textProps: {
        content: 'Hello World',
        maxWidth: 200
      },
      fill: {
        color: '#333333',
        opacity: 1
      }
    };

    const result = await createElement(input);

    expect(result.type).toEqual('text');
    expect(result.textStyle).toEqual({
      fontFamily: 'Helvetica',
      fontSize: 18,
      fontWeight: 600,
      textAlign: 'center',
      lineHeight: 1.4
    });
    expect(result.textProps).toEqual({
      content: 'Hello World',
      maxWidth: 200
    });
    expect(result.fill).toEqual({
      color: '#333333',
      opacity: 1
    });
  });

  it('should save element to database correctly', async () => {
    const input: CreateElementInput = {
      type: 'rectangle',
      canvasId: testCanvasId,
      position: { x: 25.5, y: 30.75 },
      dimensions: { width: 150.25, height: 80.5 },
      zIndex: 2
    };

    const result = await createElement(input);

    // Query the database to verify the element was saved
    const elements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, result.id))
      .execute();

    expect(elements).toHaveLength(1);
    const element = elements[0];
    
    expect(element.id).toEqual(result.id);
    expect(element.type).toEqual('rectangle');
    expect(element.canvasId).toEqual(testCanvasId);
    expect(parseFloat(element.positionX)).toEqual(25.5);
    expect(parseFloat(element.positionY)).toEqual(30.75);
    expect(parseFloat(element.width!)).toEqual(150.25);
    expect(parseFloat(element.height!)).toEqual(80.5);
    expect(element.zIndex).toEqual(2);
    expect(element.visible).toEqual(true);
    expect(element.locked).toEqual(false);
    expect(element.createdAt).toBeInstanceOf(Date);
    expect(element.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle numeric precision correctly', async () => {
    const input: CreateElementInput = {
      type: 'circle',
      canvasId: testCanvasId,
      position: { x: 123.45, y: 987.65 },
      dimensions: { width: 50.12, height: 75.98 }
    };

    const result = await createElement(input);

    // Verify numeric values are preserved with proper precision (PostgreSQL numeric precision)
    expect(result.position.x).toEqual(123.45);
    expect(result.position.y).toEqual(987.65);
    expect(result.dimensions?.width).toEqual(50.12);
    expect(result.dimensions?.height).toEqual(75.98);
  });

  it('should throw error when canvas does not exist', async () => {
    const input: CreateElementInput = {
      type: 'rectangle',
      canvasId: 'non-existent-canvas-id',
      position: { x: 0, y: 0 },
      dimensions: { width: 100, height: 100 }
    };

    await expect(createElement(input)).rejects.toThrow(/Canvas with id .* not found/i);
  });

  it('should handle complex JSONB data correctly', async () => {
    const input: CreateElementInput = {
      type: 'rectangle',
      canvasId: testCanvasId,
      position: { x: 0, y: 0 },
      dimensions: { width: 100, height: 100 },
      fill: {
        color: '#FF5733',
        opacity: 0.75
      },
      stroke: {
        color: '#123456',
        width: 2.5,
        opacity: 0.9,
        cap: 'square',
        join: 'bevel'
      },
      rectangleProps: {
        borderRadius: 15.5
      }
    };

    const result = await createElement(input);

    // Verify complex JSONB data is stored and retrieved correctly
    expect(result.fill).toEqual({
      color: '#FF5733',
      opacity: 0.75
    });
    expect(result.stroke).toEqual({
      color: '#123456',
      width: 2.5,
      opacity: 0.9,
      cap: 'square',
      join: 'bevel'
    });
    expect(result.rectangleProps).toEqual({
      borderRadius: 15.5
    });

    // Verify in database as well
    const elements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, result.id))
      .execute();

    const element = elements[0];
    expect(element.fill).toEqual({
      color: '#FF5733',
      opacity: 0.75
    });
    expect(element.stroke).toEqual({
      color: '#123456',
      width: 2.5,
      opacity: 0.9,
      cap: 'square',
      join: 'bevel'
    });
  });
});