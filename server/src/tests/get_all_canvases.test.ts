import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable } from '../db/schema';
import { getAllCanvases } from '../handlers/get_all_canvases';
import { desc } from 'drizzle-orm';

describe('getAllCanvases', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no canvases exist', async () => {
    const result = await getAllCanvases();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all canvases with correct field types', async () => {
    // Insert test canvases
    await db.insert(canvasTable)
      .values([
        {
          id: 'canvas-1',
          name: 'Test Canvas 1',
          description: 'First test canvas',
          width: '1920',
          height: '1080',
          backgroundColor: '#FFFFFF',
          zoom: '1.5',
          panX: '100',
          panY: '200'
        },
        {
          id: 'canvas-2',
          name: 'Test Canvas 2',
          description: null, // Test nullable field
          width: '800',
          height: '600',
          backgroundColor: '#000000',
          zoom: '0.8',
          panX: '-50',
          panY: '-25'
        }
      ])
      .execute();

    const result = await getAllCanvases();

    expect(result).toHaveLength(2);
    
    // Check first canvas
    const canvas1 = result.find(c => c.id === 'canvas-1');
    expect(canvas1).toBeDefined();
    expect(canvas1!.name).toBe('Test Canvas 1');
    expect(canvas1!.description).toBe('First test canvas');
    expect(canvas1!.width).toBe(1920);
    expect(typeof canvas1!.width).toBe('number');
    expect(canvas1!.height).toBe(1080);
    expect(typeof canvas1!.height).toBe('number');
    expect(canvas1!.backgroundColor).toBe('#FFFFFF');
    expect(canvas1!.zoom).toBe(1.5);
    expect(typeof canvas1!.zoom).toBe('number');
    expect(canvas1!.panX).toBe(100);
    expect(typeof canvas1!.panX).toBe('number');
    expect(canvas1!.panY).toBe(200);
    expect(typeof canvas1!.panY).toBe('number');
    expect(canvas1!.createdAt).toBeInstanceOf(Date);
    expect(canvas1!.updatedAt).toBeInstanceOf(Date);

    // Check second canvas with nullable description
    const canvas2 = result.find(c => c.id === 'canvas-2');
    expect(canvas2).toBeDefined();
    expect(canvas2!.name).toBe('Test Canvas 2');
    expect(canvas2!.description).toBe(null);
    expect(canvas2!.width).toBe(800);
    expect(canvas2!.height).toBe(600);
    expect(canvas2!.backgroundColor).toBe('#000000');
    expect(canvas2!.zoom).toBe(0.8);
    expect(canvas2!.panX).toBe(-50);
    expect(canvas2!.panY).toBe(-25);
  });

  it('should return canvases in database insertion order', async () => {
    // Insert canvases with different names to test ordering
    const canvases = [
      { id: 'canvas-a', name: 'Alpha Canvas' },
      { id: 'canvas-b', name: 'Beta Canvas' },
      { id: 'canvas-c', name: 'Gamma Canvas' }
    ];

    for (const canvas of canvases) {
      await db.insert(canvasTable)
        .values({
          id: canvas.id,
          name: canvas.name,
          width: '1920',
          height: '1080'
        })
        .execute();
    }

    const result = await getAllCanvases();
    
    expect(result).toHaveLength(3);
    
    // Verify all canvases are returned
    expect(result.map(c => c.id)).toContain('canvas-a');
    expect(result.map(c => c.id)).toContain('canvas-b');
    expect(result.map(c => c.id)).toContain('canvas-c');
  });

  it('should handle canvases with default values correctly', async () => {
    // Insert canvas with minimal data to test defaults
    await db.insert(canvasTable)
      .values({
        id: 'minimal-canvas',
        name: 'Minimal Canvas'
        // Using database defaults for other fields
      })
      .execute();

    const result = await getAllCanvases();
    
    expect(result).toHaveLength(1);
    
    const canvas = result[0];
    expect(canvas.id).toBe('minimal-canvas');
    expect(canvas.name).toBe('Minimal Canvas');
    expect(canvas.description).toBe(null);
    expect(canvas.width).toBe(1920); // Default value converted to number
    expect(canvas.height).toBe(1080); // Default value converted to number
    expect(canvas.backgroundColor).toBe('#FFFFFF'); // Default value
    expect(canvas.zoom).toBe(1); // Default value converted to number
    expect(canvas.panX).toBe(0); // Default value converted to number
    expect(canvas.panY).toBe(0); // Default value converted to number
    expect(canvas.createdAt).toBeInstanceOf(Date);
    expect(canvas.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle large number of canvases', async () => {
    // Create many canvases to test performance and pagination-like behavior
    const canvasData = Array.from({ length: 50 }, (_, i) => ({
      id: `canvas-${i + 1}`,
      name: `Canvas ${i + 1}`,
      description: i % 2 === 0 ? `Description for canvas ${i + 1}` : null,
      width: (1000 + i * 10).toString(),
      height: (600 + i * 5).toString(),
      zoom: (1 + i * 0.1).toString(),
      panX: (i * 10).toString(),
      panY: (i * -5).toString()
    }));

    await db.insert(canvasTable)
      .values(canvasData)
      .execute();

    const result = await getAllCanvases();
    
    expect(result).toHaveLength(50);
    
    // Verify numeric conversions work for all records
    result.forEach((canvas, index) => {
      expect(typeof canvas.width).toBe('number');
      expect(typeof canvas.height).toBe('number');
      expect(typeof canvas.zoom).toBe('number');
      expect(typeof canvas.panX).toBe('number');
      expect(typeof canvas.panY).toBe('number');
      expect(canvas.width).toBe(1000 + index * 10);
      expect(canvas.height).toBe(600 + index * 5);
    });
  });

  it('should handle negative numeric values correctly', async () => {
    await db.insert(canvasTable)
      .values({
        id: 'negative-canvas',
        name: 'Negative Values Canvas',
        width: '1920',
        height: '1080',
        zoom: '0.5',
        panX: '-500.75',
        panY: '-300.25'
      })
      .execute();

    const result = await getAllCanvases();
    
    expect(result).toHaveLength(1);
    
    const canvas = result[0];
    expect(canvas.panX).toBe(-500.75);
    expect(canvas.panY).toBe(-300.25);
    expect(canvas.zoom).toBe(0.5);
    expect(typeof canvas.panX).toBe('number');
    expect(typeof canvas.panY).toBe('number');
    expect(typeof canvas.zoom).toBe('number');
  });
});