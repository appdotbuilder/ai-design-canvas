import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable } from '../db/schema';
import { type UpdateCanvasInput, type CreateCanvasInput } from '../schema';
import { updateCanvas } from '../handlers/update_canvas';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Helper function to create a test canvas
async function createTestCanvas(overrides: Partial<CreateCanvasInput> = {}) {
  const canvasData = {
    id: randomUUID(),
    name: overrides.name || 'Test Canvas',
    description: overrides.description !== undefined ? overrides.description : 'A test canvas',
    width: (overrides.width || 1920).toString(),
    height: (overrides.height || 1080).toString(),
    backgroundColor: overrides.backgroundColor || '#FFFFFF',
    zoom: '1',
    panX: '0',
    panY: '0',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.insert(canvasTable)
    .values(canvasData)
    .returning()
    .execute();

  return result[0];
}

describe('updateCanvas', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update canvas name', async () => {
    // Create test canvas
    const testCanvas = await createTestCanvas();
    
    const updateInput: UpdateCanvasInput = {
      id: testCanvas.id,
      name: 'Updated Canvas Name'
    };

    const result = await updateCanvas(updateInput);

    expect(result.id).toEqual(testCanvas.id);
    expect(result.name).toEqual('Updated Canvas Name');
    expect(result.description).toEqual('A test canvas'); // Should remain unchanged
    expect(result.width).toEqual(1920);
    expect(result.height).toEqual(1080);
    expect(result.backgroundColor).toEqual('#FFFFFF');
    expect(result.zoom).toEqual(1);
    expect(result.panX).toEqual(0);
    expect(result.panY).toEqual(0);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt).toEqual(testCanvas.createdAt);
  });

  it('should update multiple canvas properties', async () => {
    // Create test canvas
    const testCanvas = await createTestCanvas();
    
    const updateInput: UpdateCanvasInput = {
      id: testCanvas.id,
      name: 'Multi-Update Canvas',
      description: 'Updated description',
      width: 2560,
      height: 1440,
      backgroundColor: '#FF0000',
      zoom: 1.5,
      panX: 100,
      panY: 200
    };

    const result = await updateCanvas(updateInput);

    expect(result.id).toEqual(testCanvas.id);
    expect(result.name).toEqual('Multi-Update Canvas');
    expect(result.description).toEqual('Updated description');
    expect(result.width).toEqual(2560);
    expect(result.height).toEqual(1440);
    expect(result.backgroundColor).toEqual('#FF0000');
    expect(result.zoom).toEqual(1.5);
    expect(result.panX).toEqual(100);
    expect(result.panY).toEqual(200);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt).toEqual(testCanvas.createdAt);
    
    // Verify numeric type conversions
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');
    expect(typeof result.zoom).toBe('number');
    expect(typeof result.panX).toBe('number');
    expect(typeof result.panY).toBe('number');
  });

  it('should update description to null', async () => {
    // Create test canvas with description
    const testCanvas = await createTestCanvas({ description: 'Original description' });
    
    const updateInput: UpdateCanvasInput = {
      id: testCanvas.id,
      description: null
    };

    const result = await updateCanvas(updateInput);

    expect(result.id).toEqual(testCanvas.id);
    expect(result.description).toBeNull();
    expect(result.name).toEqual('Test Canvas'); // Should remain unchanged
  });

  it('should update only zoom and pan values', async () => {
    // Create test canvas
    const testCanvas = await createTestCanvas();
    
    const updateInput: UpdateCanvasInput = {
      id: testCanvas.id,
      zoom: 0.75,
      panX: -50.5,
      panY: 100.25
    };

    const result = await updateCanvas(updateInput);

    expect(result.id).toEqual(testCanvas.id);
    expect(result.zoom).toEqual(0.75);
    expect(result.panX).toEqual(-50.5);
    expect(result.panY).toEqual(100.25);
    expect(result.name).toEqual('Test Canvas'); // Should remain unchanged
    expect(result.description).toEqual('A test canvas'); // Should remain unchanged
    expect(result.width).toEqual(1920); // Should remain unchanged
    expect(result.height).toEqual(1080); // Should remain unchanged
  });

  it('should save updated canvas to database', async () => {
    // Create test canvas
    const testCanvas = await createTestCanvas();
    
    const updateInput: UpdateCanvasInput = {
      id: testCanvas.id,
      name: 'DB Update Test',
      width: 3840,
      height: 2160
    };

    const result = await updateCanvas(updateInput);

    // Verify in database
    const canvases = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, result.id))
      .execute();

    expect(canvases).toHaveLength(1);
    const dbCanvas = canvases[0];
    expect(dbCanvas.name).toEqual('DB Update Test');
    expect(parseFloat(dbCanvas.width)).toEqual(3840);
    expect(parseFloat(dbCanvas.height)).toEqual(2160);
    expect(dbCanvas.updatedAt).toBeInstanceOf(Date);
    expect(dbCanvas.updatedAt > testCanvas.updatedAt).toBe(true);
  });

  it('should throw error when canvas not found', async () => {
    const nonExistentId = randomUUID();
    
    const updateInput: UpdateCanvasInput = {
      id: nonExistentId,
      name: 'Non-existent Canvas'
    };

    expect(updateCanvas(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle edge case values correctly', async () => {
    // Create test canvas
    const testCanvas = await createTestCanvas();
    
    const updateInput: UpdateCanvasInput = {
      id: testCanvas.id,
      width: 0.01, // Very small positive number
      height: 9999.99, // Large number with decimals
      zoom: 0.1, // Minimum zoom
      panX: -1000.5, // Negative pan
      panY: 1000.5 // Positive pan with decimals
    };

    const result = await updateCanvas(updateInput);

    expect(result.width).toEqual(0.01);
    expect(result.height).toEqual(9999.99);
    expect(result.zoom).toEqual(0.1);
    expect(result.panX).toEqual(-1000.5);
    expect(result.panY).toEqual(1000.5);
    
    // Verify precision is maintained
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');
    expect(typeof result.zoom).toBe('number');
    expect(typeof result.panX).toBe('number');
    expect(typeof result.panY).toBe('number');
  });

  it('should preserve unchanged properties', async () => {
    // Create test canvas with specific properties
    const testCanvas = await createTestCanvas({
      name: 'Preserve Test',
      description: 'Original description',
      width: 1600,
      height: 900,
      backgroundColor: '#00FF00'
    });
    
    // Update only one property
    const updateInput: UpdateCanvasInput = {
      id: testCanvas.id,
      zoom: 2.0
    };

    const result = await updateCanvas(updateInput);

    // Verify unchanged properties are preserved
    expect(result.name).toEqual('Preserve Test');
    expect(result.description).toEqual('Original description');
    expect(result.width).toEqual(1600);
    expect(result.height).toEqual(900);
    expect(result.backgroundColor).toEqual('#00FF00');
    expect(result.panX).toEqual(0);
    expect(result.panY).toEqual(0);
    
    // Verify changed property
    expect(result.zoom).toEqual(2.0);
    
    // Verify updatedAt was changed but createdAt preserved
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt).toEqual(testCanvas.createdAt);
    expect(result.updatedAt > testCanvas.updatedAt).toBe(true);
  });
});