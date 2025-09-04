import { db } from '../db';
import { canvasTable, canvasElementsTable } from '../db/schema';
import { type AIGenerateRequest, type CanvasElement, type CreateElementInput } from '../schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * AI-powered element generation based on natural language prompts
 * This handler processes user prompts and generates appropriate canvas elements
 */
export async function aiGenerateElements(input: AIGenerateRequest): Promise<CanvasElement[]> {
  try {
    // First verify that the canvas exists
    const canvas = await db.select()
      .from(canvasTable)
      .where(eq(canvasTable.id, input.canvasId))
      .limit(1)
      .execute();

    if (canvas.length === 0) {
      throw new Error(`Canvas with ID ${input.canvasId} not found`);
    }

    const canvasData = canvas[0];
    const canvasWidth = parseFloat(canvasData.width);
    const canvasHeight = parseFloat(canvasData.height);

    // Parse the prompt to determine what elements to create
    const elementsToCreate = parsePrompt(input.prompt, canvasWidth, canvasHeight);

    // Get context elements if provided
    let contextElements: CanvasElement[] = [];
    if (input.contextElementIds && input.contextElementIds.length > 0) {
      const contextResults = await db.select()
        .from(canvasElementsTable)
        .where(eq(canvasElementsTable.canvasId, input.canvasId))
        .execute();
      
      contextElements = contextResults
        .filter(el => input.contextElementIds!.includes(el.id))
        .map(convertToCanvasElement);
    }

    // Adjust positions based on context if available
    const adjustedElements = adjustElementsForContext(elementsToCreate, contextElements, canvasWidth, canvasHeight);

    // Create elements in the database
    const createdElements: CanvasElement[] = [];
    for (const elementInput of adjustedElements) {
      const elementId = randomUUID();
      
      const result = await db.insert(canvasElementsTable)
        .values({
          id: elementId,
          type: elementInput.type,
          canvasId: input.canvasId,
          positionX: elementInput.position.x.toString(),
          positionY: elementInput.position.y.toString(),
          width: elementInput.dimensions?.width?.toString() || null,
          height: elementInput.dimensions?.height?.toString() || null,
          zIndex: elementInput.zIndex || 0,
          visible: elementInput.visible ?? true,
          locked: elementInput.locked ?? false,
          fill: elementInput.fill || null,
          stroke: elementInput.stroke || null,
          textStyle: elementInput.textStyle || null,
          rectangleProps: elementInput.rectangleProps || null,
          lineProps: elementInput.lineProps || null,
          textProps: elementInput.textProps || null,
        })
        .returning()
        .execute();

      createdElements.push(convertToCanvasElement(result[0]));
    }

    return createdElements;
  } catch (error) {
    console.error('AI element generation failed:', error);
    throw error;
  }
}

/**
 * Parse natural language prompt to determine what elements to create
 */
function parsePrompt(prompt: string, canvasWidth: number, canvasHeight: number): CreateElementInput[] {
  const elements: CreateElementInput[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Common positioning helpers
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const margin = 50;

  // Pattern matching for different element types
  if (lowerPrompt.includes('rectangle') || lowerPrompt.includes('box') || lowerPrompt.includes('square')) {
    const isSquare = lowerPrompt.includes('square');
    const dimensions = isSquare ? { width: 100, height: 100 } : { width: 150, height: 100 };
    
    elements.push({
      type: 'rectangle',
      canvasId: '', // Will be set by caller
      position: { x: centerX - dimensions.width / 2, y: centerY - dimensions.height / 2 },
      dimensions,
      fill: { color: getColorFromPrompt(lowerPrompt), opacity: 1 },
      stroke: { color: '#000000', width: 2, opacity: 1, cap: 'butt', join: 'miter' },
      rectangleProps: { borderRadius: lowerPrompt.includes('rounded') ? 10 : 0 },
    });
  }

  if ((lowerPrompt.includes('circle') || lowerPrompt.includes('round')) && !elements.length) {
    const radius = 50;
    elements.push({
      type: 'circle',
      canvasId: '', // Will be set by caller
      position: { x: centerX - radius, y: centerY - radius },
      dimensions: { width: radius * 2, height: radius * 2 },
      fill: { color: getColorFromPrompt(lowerPrompt), opacity: 1 },
      stroke: { color: '#000000', width: 2, opacity: 1, cap: 'butt', join: 'miter' },
    });
  }

  if (lowerPrompt.includes('line') && !elements.length) {
    const startX = centerX - 75;
    const startY = centerY;
    const endX = centerX + 75;
    const endY = centerY;
    
    elements.push({
      type: 'line',
      canvasId: '', // Will be set by caller
      position: { x: Math.min(startX, endX), y: Math.min(startY, endY) },
      stroke: { color: getColorFromPrompt(lowerPrompt), width: 3, opacity: 1, cap: 'round', join: 'miter' },
      lineProps: { x1: startX, y1: startY, x2: endX, y2: endY },
    });
  }

  if ((lowerPrompt.includes('text') || lowerPrompt.includes('label') || lowerPrompt.includes('title')) && !elements.length) {
    const content = extractTextContent(prompt) || 'Sample Text';
    const fontSize = lowerPrompt.includes('title') ? 24 : lowerPrompt.includes('large') ? 20 : 16;
    
    elements.push({
      type: 'text',
      canvasId: '', // Will be set by caller
      position: { x: centerX - 50, y: centerY },
      dimensions: { width: 200, height: fontSize * 1.5 },
      fill: { color: getColorFromPrompt(lowerPrompt), opacity: 1 },
      textStyle: {
        fontFamily: 'Arial',
        fontSize,
        fontWeight: lowerPrompt.includes('bold') ? 700 : 400,
        textAlign: 'left',
        lineHeight: 1.2,
      },
      textProps: { content },
    });
  }

  // If no specific elements were detected, create a default rectangle
  if (elements.length === 0) {
    elements.push({
      type: 'rectangle',
      canvasId: '', // Will be set by caller
      position: { x: centerX - 75, y: centerY - 50 },
      dimensions: { width: 150, height: 100 },
      fill: { color: '#3B82F6', opacity: 1 },
      stroke: { color: '#1E40AF', width: 2, opacity: 1, cap: 'butt', join: 'miter' },
      rectangleProps: { borderRadius: 0 },
    });
  }

  return elements;
}

/**
 * Extract color from prompt, defaulting to blue if not found
 */
function getColorFromPrompt(prompt: string): string {
  const colorMap: Record<string, string> = {
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
    gray: '#6B7280',
    black: '#000000',
    white: '#FFFFFF',
  };

  for (const [colorName, hex] of Object.entries(colorMap)) {
    if (prompt.includes(colorName)) {
      return hex;
    }
  }

  return '#3B82F6'; // Default blue
}

/**
 * Extract text content from quotes in the prompt
 */
function extractTextContent(prompt: string): string | null {
  const matches = prompt.match(/["']([^"']+)["']/);
  return matches ? matches[1] : null;
}

/**
 * Adjust element positions based on context elements
 */
function adjustElementsForContext(
  elements: CreateElementInput[],
  contextElements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number
): CreateElementInput[] {
  if (contextElements.length === 0) {
    return elements;
  }

  // Simple adjustment: offset new elements to avoid overlap with context
  const offset = 50;
  return elements.map((element, index) => ({
    ...element,
    position: {
      x: element.position.x + offset + (index * 20),
      y: element.position.y + offset + (index * 20),
    },
  }));
}

/**
 * Convert database row to CanvasElement with proper type conversions
 */
function convertToCanvasElement(dbElement: any): CanvasElement {
  return {
    id: dbElement.id,
    type: dbElement.type,
    canvasId: dbElement.canvasId,
    position: {
      x: parseFloat(dbElement.positionX),
      y: parseFloat(dbElement.positionY),
    },
    dimensions: dbElement.width && dbElement.height ? {
      width: parseFloat(dbElement.width),
      height: parseFloat(dbElement.height),
    } : undefined,
    zIndex: dbElement.zIndex,
    visible: dbElement.visible,
    locked: dbElement.locked,
    fill: dbElement.fill,
    stroke: dbElement.stroke,
    textStyle: dbElement.textStyle,
    rectangleProps: dbElement.rectangleProps,
    lineProps: dbElement.lineProps,
    textProps: dbElement.textProps,
    createdAt: dbElement.createdAt,
    updatedAt: dbElement.updatedAt,
  };
}