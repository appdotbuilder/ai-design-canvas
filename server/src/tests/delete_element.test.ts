import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasTable, canvasElementsTable } from '../db/schema';
import { deleteElement } from '../handlers/delete_element';
import { eq } from 'drizzle-orm';

describe('deleteElement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing element', async () => {
    // Create a test canvas first
    const canvasResult = await db.insert(canvasTable)
      .values({
        id: 'test-canvas-id',
        name: 'Test Canvas'
      })
      .returning()
      .execute();

    // Create a test element
    const elementResult = await db.insert(canvasElementsTable)
      .values({
        id: 'test-element-id',
        type: 'rectangle',
        canvasId: 'test-canvas-id',
        positionX: '100',
        positionY: '200',
        width: '150',
        height: '100'
      })
      .returning()
      .execute();

    const elementId = elementResult[0].id;

    // Verify element exists before deletion
    const beforeDelete = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, elementId))
      .execute();
    expect(beforeDelete).toHaveLength(1);

    // Delete the element
    await deleteElement(elementId);

    // Verify element no longer exists
    const afterDelete = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, elementId))
      .execute();
    expect(afterDelete).toHaveLength(0);
  });

  it('should handle deletion of non-existent element gracefully', async () => {
    // Attempt to delete an element that doesn't exist
    await expect(deleteElement('non-existent-id')).resolves.toBeUndefined();
    
    // Should not throw an error, just complete successfully
  });

  it('should delete specific element without affecting others', async () => {
    // Create a test canvas first
    await db.insert(canvasTable)
      .values({
        id: 'test-canvas-id',
        name: 'Test Canvas'
      })
      .execute();

    // Create multiple test elements
    await db.insert(canvasElementsTable)
      .values([
        {
          id: 'element-1',
          type: 'rectangle',
          canvasId: 'test-canvas-id',
          positionX: '100',
          positionY: '200',
          width: '150',
          height: '100'
        },
        {
          id: 'element-2',
          type: 'circle',
          canvasId: 'test-canvas-id',
          positionX: '300',
          positionY: '400',
          width: '200',
          height: '200'
        },
        {
          id: 'element-3',
          type: 'text',
          canvasId: 'test-canvas-id',
          positionX: '500',
          positionY: '600',
          width: '100',
          height: '50'
        }
      ])
      .execute();

    // Verify all elements exist before deletion
    const beforeDelete = await db.select()
      .from(canvasElementsTable)
      .execute();
    expect(beforeDelete).toHaveLength(3);

    // Delete only the second element
    await deleteElement('element-2');

    // Verify only the targeted element was deleted
    const afterDelete = await db.select()
      .from(canvasElementsTable)
      .execute();
    expect(afterDelete).toHaveLength(2);
    
    const remainingIds = afterDelete.map(el => el.id);
    expect(remainingIds).toContain('element-1');
    expect(remainingIds).toContain('element-3');
    expect(remainingIds).not.toContain('element-2');
  });

  it('should delete elements with different types correctly', async () => {
    // Create a test canvas first
    await db.insert(canvasTable)
      .values({
        id: 'test-canvas-id',
        name: 'Test Canvas'
      })
      .execute();

    // Create elements of different types with various properties
    await db.insert(canvasElementsTable)
      .values([
        {
          id: 'text-element',
          type: 'text',
          canvasId: 'test-canvas-id',
          positionX: '100',
          positionY: '100',
          width: '200',
          height: '50',
          textProps: { content: 'Test text', maxWidth: 200 },
          textStyle: { fontSize: 16, fontFamily: 'Arial' }
        },
        {
          id: 'line-element',
          type: 'line',
          canvasId: 'test-canvas-id',
          positionX: '0',
          positionY: '0',
          lineProps: { x1: 0, y1: 0, x2: 100, y2: 100 },
          stroke: { color: '#000000', width: 2 }
        }
      ])
      .execute();

    // Delete text element
    await deleteElement('text-element');

    // Verify text element deleted, line element remains
    const remaining = await db.select()
      .from(canvasElementsTable)
      .execute();
    
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('line-element');
    expect(remaining[0].type).toBe('line');
  });
});