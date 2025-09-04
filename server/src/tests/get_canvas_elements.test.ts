import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable, canvasElementsTable } from '../db/schema';
import { getCanvasElements } from '../handlers/get_canvas_elements';
import { nanoid } from 'nanoid';

const testCanvasId = nanoid();
const testCanvas2Id = nanoid();
const testElementId1 = nanoid();
const testElementId2 = nanoid();
const testElementId3 = nanoid();

// Test data for canvas
const testCanvas = {
  id: testCanvasId,
  name: 'Test Canvas',
  description: 'A canvas for testing',
  width: '1920',
  height: '1080',
  backgroundColor: '#FFFFFF',
  zoom: '1',
  panX: '0',
  panY: '0'
};

const testCanvas2 = {
  id: testCanvas2Id,
  name: 'Second Canvas',
  description: 'Another canvas for testing isolation',
  width: '800',
  height: '600',
  backgroundColor: '#F0F0F0',
  zoom: '1',
  panX: '0',
  panY: '0'
};

// Test elements with different types and properties
const testElement1 = {
  id: testElementId1,
  type: 'rectangle' as const,
  canvasId: testCanvasId,
  positionX: '100',
  positionY: '100',
  width: '200',
  height: '150',
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
    cap: 'butt',
    join: 'miter'
  },
  rectangleProps: {
    borderRadius: 10
  }
};

const testElement2 = {
  id: testElementId2,
  type: 'text' as const,
  canvasId: testCanvasId,
  positionX: '300',
  positionY: '200',
  width: '150',
  height: '50',
  zIndex: 2,
  visible: true,
  locked: true,
  textStyle: {
    fontFamily: 'Arial',
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.5
  },
  textProps: {
    content: 'Hello World',
    maxWidth: 150
  }
};

const testElement3 = {
  id: testElementId3,
  type: 'line' as const,
  canvasId: testCanvasId,
  positionX: '0',
  positionY: '0',
  zIndex: 0,
  visible: false,
  locked: false,
  stroke: {
    color: '#0000FF',
    width: 3,
    opacity: 0.7,
    cap: 'round',
    join: 'round'
  },
  lineProps: {
    x1: 50,
    y1: 50,
    x2: 150,
    y2: 100
  }
};

// Element for second canvas to test isolation
const testElement4 = {
  id: nanoid(),
  type: 'circle' as const,
  canvasId: testCanvas2Id,
  positionX: '400',
  positionY: '300',
  width: '100',
  height: '100',
  zIndex: 0,
  visible: true,
  locked: false,
  fill: {
    color: '#00FF00',
    opacity: 1
  }
};

describe('getCanvasElements', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test canvases first
    await db.insert(canvasTable).values([testCanvas, testCanvas2]).execute();
    
    // Create test elements
    await db.insert(canvasElementsTable).values([
      testElement1,
      testElement2,
      testElement3,
      testElement4
    ]).execute();
  });

  afterEach(resetDB);

  it('should retrieve all elements for a canvas', async () => {
    const result = await getCanvasElements(testCanvasId);

    expect(result).toHaveLength(3);
    
    // Should be ordered by zIndex, then by createdAt
    expect(result[0].id).toEqual(testElementId3); // zIndex 0
    expect(result[1].id).toEqual(testElementId1); // zIndex 1
    expect(result[2].id).toEqual(testElementId2); // zIndex 2
  });

  it('should return elements ordered by zIndex and creation time', async () => {
    const result = await getCanvasElements(testCanvasId);

    // Check ordering by zIndex
    expect(result[0].zIndex).toEqual(0);
    expect(result[1].zIndex).toEqual(1);
    expect(result[2].zIndex).toEqual(2);
    
    // All elements should have creation timestamps
    result.forEach(element => {
      expect(element.createdAt).toBeInstanceOf(Date);
      expect(element.updatedAt).toBeInstanceOf(Date);
    });
  });

  it('should convert numeric fields correctly', async () => {
    const result = await getCanvasElements(testCanvasId);
    
    const rectangleElement = result.find(el => el.type === 'rectangle');
    expect(rectangleElement).toBeDefined();
    
    // Check numeric conversions
    expect(typeof rectangleElement!.position.x).toBe('number');
    expect(typeof rectangleElement!.position.y).toBe('number');
    expect(rectangleElement!.position.x).toEqual(100);
    expect(rectangleElement!.position.y).toEqual(100);
    
    expect(rectangleElement!.dimensions).toBeDefined();
    expect(typeof rectangleElement!.dimensions!.width).toBe('number');
    expect(typeof rectangleElement!.dimensions!.height).toBe('number');
    expect(rectangleElement!.dimensions!.width).toEqual(200);
    expect(rectangleElement!.dimensions!.height).toEqual(150);
  });

  it('should preserve JSONB data structures', async () => {
    const result = await getCanvasElements(testCanvasId);
    
    const rectangleElement = result.find(el => el.type === 'rectangle');
    expect(rectangleElement).toBeDefined();
    
    // Check fill properties
    expect(rectangleElement!.fill).toEqual({
      color: '#FF0000',
      opacity: 0.8
    });
    
    // Check stroke properties
    expect(rectangleElement!.stroke).toEqual({
      color: '#000000',
      width: 2,
      opacity: 1,
      cap: 'butt',
      join: 'miter'
    });
    
    // Check rectangle-specific properties
    expect(rectangleElement!.rectangleProps).toEqual({
      borderRadius: 10
    });
  });

  it('should handle elements without dimensions (lines)', async () => {
    const result = await getCanvasElements(testCanvasId);
    
    const lineElement = result.find(el => el.type === 'line');
    expect(lineElement).toBeDefined();
    
    // Line should not have dimensions
    expect(lineElement!.dimensions).toBeUndefined();
    
    // But should have line-specific properties
    expect(lineElement!.lineProps).toEqual({
      x1: 50,
      y1: 50,
      x2: 150,
      y2: 100
    });
  });

  it('should handle text elements with proper properties', async () => {
    const result = await getCanvasElements(testCanvasId);
    
    const textElement = result.find(el => el.type === 'text');
    expect(textElement).toBeDefined();
    
    // Check text style properties
    expect(textElement!.textStyle).toEqual({
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 700,
      textAlign: 'center',
      lineHeight: 1.5
    });
    
    // Check text-specific properties
    expect(textElement!.textProps).toEqual({
      content: 'Hello World',
      maxWidth: 150
    });
    
    expect(textElement!.locked).toBe(true);
  });

  it('should only return elements for the specified canvas', async () => {
    const result1 = await getCanvasElements(testCanvasId);
    const result2 = await getCanvasElements(testCanvas2Id);

    expect(result1).toHaveLength(3);
    expect(result2).toHaveLength(1);
    
    // Ensure no cross-contamination
    result1.forEach(element => {
      expect(element.canvasId).toEqual(testCanvasId);
    });
    
    result2.forEach(element => {
      expect(element.canvasId).toEqual(testCanvas2Id);
    });
  });

  it('should return empty array for non-existent canvas', async () => {
    const result = await getCanvasElements('non-existent-id');
    expect(result).toEqual([]);
  });

  it('should return empty array for canvas with no elements', async () => {
    // Create a canvas with no elements
    const emptyCanvasId = nanoid();
    await db.insert(canvasTable).values({
      id: emptyCanvasId,
      name: 'Empty Canvas',
      description: 'Canvas with no elements',
      width: '1920',
      height: '1080',
      backgroundColor: '#FFFFFF',
      zoom: '1',
      panX: '0',
      panY: '0'
    }).execute();

    const result = await getCanvasElements(emptyCanvasId);
    expect(result).toEqual([]);
  });

  it('should handle all element visibility and lock states', async () => {
    const result = await getCanvasElements(testCanvasId);

    const visibleUnlocked = result.find(el => el.visible && !el.locked);
    const visibleLocked = result.find(el => el.visible && el.locked);
    const hiddenUnlocked = result.find(el => !el.visible && !el.locked);

    expect(visibleUnlocked).toBeDefined();
    expect(visibleLocked).toBeDefined();
    expect(hiddenUnlocked).toBeDefined();
  });
});