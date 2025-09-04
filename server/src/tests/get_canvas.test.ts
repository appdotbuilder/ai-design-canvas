import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable } from '../db/schema';
import { getCanvas } from '../handlers/get_canvas';
import { eq } from 'drizzle-orm';

// Simple UUID v4 generator for tests
const generateTestId = () => 'test-' + Math.random().toString(36).substring(2) + '-' + Date.now().toString(36);

describe('getCanvas', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a canvas by ID', async () => {
    // Create test canvas
    const canvasId = generateTestId();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Test Canvas',
        description: 'A canvas for testing',
        width: '1920',
        height: '1080',
        backgroundColor: '#FFFFFF',
        zoom: '1',
        panX: '0',
        panY: '0'
      })
      .execute();

    // Retrieve the canvas
    const result = await getCanvas(canvasId);

    // Verify the result
    expect(result.id).toEqual(canvasId);
    expect(result.name).toEqual('Test Canvas');
    expect(result.description).toEqual('A canvas for testing');
    expect(result.width).toEqual(1920);
    expect(result.height).toEqual(1080);
    expect(result.backgroundColor).toEqual('#FFFFFF');
    expect(result.zoom).toEqual(1);
    expect(result.panX).toEqual(0);
    expect(result.panY).toEqual(0);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle canvas with null description', async () => {
    // Create test canvas with null description
    const canvasId = generateTestId();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Canvas with null description',
        description: null,
        width: '800',
        height: '600',
        backgroundColor: '#F0F0F0',
        zoom: '1.5',
        panX: '100',
        panY: '200'
      })
      .execute();

    // Retrieve the canvas
    const result = await getCanvas(canvasId);

    // Verify the result
    expect(result.id).toEqual(canvasId);
    expect(result.name).toEqual('Canvas with null description');
    expect(result.description).toBeNull();
    expect(result.width).toEqual(800);
    expect(result.height).toEqual(600);
    expect(result.backgroundColor).toEqual('#F0F0F0');
    expect(result.zoom).toEqual(1.5);
    expect(result.panX).toEqual(100);
    expect(result.panY).toEqual(200);
  });

  it('should handle canvas with custom dimensions and viewport', async () => {
    // Create test canvas with custom values
    const canvasId = generateTestId();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Custom Canvas',
        description: 'Canvas with custom settings',
        width: '2560.50',
        height: '1440.25',
        backgroundColor: '#123456',
        zoom: '0.75',
        panX: '-150.5',
        panY: '300.25'
      })
      .execute();

    // Retrieve the canvas
    const result = await getCanvas(canvasId);

    // Verify numeric conversions are handled correctly
    expect(result.width).toEqual(2560.50);
    expect(result.height).toEqual(1440.25);
    expect(result.zoom).toEqual(0.75);
    expect(result.panX).toEqual(-150.5);
    expect(result.panY).toEqual(300.25);
    expect(result.backgroundColor).toEqual('#123456');
  });

  it('should verify all numeric fields are properly converted', async () => {
    // Create test canvas
    const canvasId = generateTestId();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Numeric Test Canvas',
        width: '1920.75',
        height: '1080.25',
        zoom: '2.5',
        panX: '-100.5',
        panY: '50.75'
      })
      .execute();

    // Retrieve the canvas
    const result = await getCanvas(canvasId);

    // Verify all numeric fields are actual numbers, not strings
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');
    expect(typeof result.zoom).toBe('number');
    expect(typeof result.panX).toBe('number');
    expect(typeof result.panY).toBe('number');
  });

  it('should throw error when canvas does not exist', async () => {
    const nonExistentId = generateTestId();

    await expect(getCanvas(nonExistentId)).rejects.toThrow(/not found/i);
  });

  it('should throw error for invalid ID format', async () => {
    const invalidId = 'invalid-id';

    await expect(getCanvas(invalidId)).rejects.toThrow(/not found/i);
  });

  it('should verify canvas exists in database after retrieval', async () => {
    // Create test canvas
    const canvasId = generateTestId();
    await db.insert(canvasTable)
      .values({
        id: canvasId,
        name: 'Verification Canvas',
        description: 'Canvas for verification test'
      })
      .execute();

    // Retrieve via handler
    const result = await getCanvas(canvasId);

    // Verify it matches what's in the database
    const dbCanvas = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, canvasId))
      .execute();

    expect(dbCanvas).toHaveLength(1);
    expect(result.id).toEqual(dbCanvas[0].id);
    expect(result.name).toEqual(dbCanvas[0].name);
    expect(result.description).toEqual(dbCanvas[0].description);
    expect(result.createdAt).toEqual(dbCanvas[0].createdAt);
    expect(result.updatedAt).toEqual(dbCanvas[0].updatedAt);
  });
});