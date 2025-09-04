import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable } from '../db/schema';
import { type CreateCanvasInput } from '../schema';
import { createCanvas } from '../handlers/create_canvas';
import { eq } from 'drizzle-orm';

describe('createCanvas', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a canvas with minimal input', async () => {
    const testInput: CreateCanvasInput = {
      name: 'Test Canvas'
    };

    const result = await createCanvas(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Canvas');
    expect(result.description).toBeNull();
    expect(result.width).toEqual(1920); // Default value
    expect(result.height).toEqual(1080); // Default value
    expect(result.backgroundColor).toEqual('#FFFFFF'); // Default value
    expect(result.zoom).toEqual(1); // Default value
    expect(result.panX).toEqual(0); // Default value
    expect(result.panY).toEqual(0); // Default value
    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID format
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create a canvas with all optional fields', async () => {
    const testInput: CreateCanvasInput = {
      name: 'Custom Canvas',
      description: 'A canvas for testing with custom properties',
      width: 800,
      height: 600,
      backgroundColor: '#FF0000'
    };

    const result = await createCanvas(testInput);

    expect(result.name).toEqual('Custom Canvas');
    expect(result.description).toEqual('A canvas for testing with custom properties');
    expect(result.width).toEqual(800);
    expect(result.height).toEqual(600);
    expect(result.backgroundColor).toEqual('#FF0000');
    expect(result.zoom).toEqual(1); // Default value
    expect(result.panX).toEqual(0); // Default value
    expect(result.panY).toEqual(0); // Default value
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);

    // Verify numeric types are correctly converted
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');
    expect(typeof result.zoom).toBe('number');
    expect(typeof result.panX).toBe('number');
    expect(typeof result.panY).toBe('number');
  });

  it('should save canvas to database', async () => {
    const testInput: CreateCanvasInput = {
      name: 'Database Test Canvas',
      description: 'Testing database persistence',
      width: 1024,
      height: 768,
      backgroundColor: '#00FF00'
    };

    const result = await createCanvas(testInput);

    // Query the database to verify the canvas was saved
    const canvases = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, result.id))
      .execute();

    expect(canvases).toHaveLength(1);
    
    const savedCanvas = canvases[0];
    expect(savedCanvas.name).toEqual('Database Test Canvas');
    expect(savedCanvas.description).toEqual('Testing database persistence');
    expect(parseFloat(savedCanvas.width)).toEqual(1024); // Stored as string, needs parsing
    expect(parseFloat(savedCanvas.height)).toEqual(768); // Stored as string, needs parsing
    expect(savedCanvas.backgroundColor).toEqual('#00FF00');
    expect(parseFloat(savedCanvas.zoom)).toEqual(1);
    expect(parseFloat(savedCanvas.panX)).toEqual(0);
    expect(parseFloat(savedCanvas.panY)).toEqual(0);
    expect(savedCanvas.createdAt).toBeInstanceOf(Date);
    expect(savedCanvas.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const testInput: CreateCanvasInput = {
      name: 'Canvas with null description',
      description: null
    };

    const result = await createCanvas(testInput);

    expect(result.description).toBeNull();

    // Verify in database
    const canvases = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, result.id))
      .execute();

    expect(canvases[0].description).toBeNull();
  });

  it('should generate unique IDs for multiple canvases', async () => {
    const testInput1: CreateCanvasInput = {
      name: 'Canvas 1'
    };

    const testInput2: CreateCanvasInput = {
      name: 'Canvas 2'
    };

    const result1 = await createCanvas(testInput1);
    const result2 = await createCanvas(testInput2);

    // IDs should be different
    expect(result1.id).not.toEqual(result2.id);

    // Both should be valid UUIDs
    expect(result1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(result2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Verify both are saved in database
    const canvases = await db.select()
      .from(canvasTable)
      .execute();

    expect(canvases).toHaveLength(2);
    const names = canvases.map(c => c.name);
    expect(names).toContain('Canvas 1');
    expect(names).toContain('Canvas 2');
  });

  it('should set timestamps correctly', async () => {
    const before = new Date();
    
    const testInput: CreateCanvasInput = {
      name: 'Timestamp Test Canvas'
    };

    const result = await createCanvas(testInput);
    const after = new Date();

    // Timestamps should be within reasonable range
    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());

    // For new canvas, createdAt and updatedAt should be very close (same second)
    const timeDiff = Math.abs(result.updatedAt.getTime() - result.createdAt.getTime());
    expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
  });
});