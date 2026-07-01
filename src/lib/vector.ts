import { pipeline, env } from '@huggingface/transformers';

// Cache the ONNX model in .next directory to prevent repeated downloads
env.cacheDir = './.next/cache/transformers';

type ExtractorType = (
  text: string | string[],
  options?: { pooling?: 'mean' | 'none'; normalize?: boolean }
) => Promise<{ data: number[] | Float32Array }>;

let extractorInstance: ExtractorType | null = null;
let extractorPromise: Promise<ExtractorType> | null = null;

async function getExtractor(): Promise<ExtractorType> {
  if (extractorInstance) {
    return extractorInstance;
  }
  if (!extractorPromise) {
    // Force CPU execution and single-thread if needed to run stably on serverless
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (data: any) => {
        if (data.status === 'downloading') {
          console.log(`Downloading embedding model: ${data.file} - ${Math.round(data.progress || 0)}%`);
        }
      }
    }).then((instance) => {
      extractorInstance = instance as unknown as ExtractorType;
      return extractorInstance;
    }).catch((err) => {
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/**
 * Generates a 384-dimensional vector embedding for the input text using MiniLM-L6-v2
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate vector embedding: ${(error as Error).message}`);
  }
}

/**
 * Generates vector embeddings for a batch of texts in a single ONNX inference run.
 * This is significantly faster than generating them sequentially.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const extractor = await getExtractor();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    
    // Flat Float32Array containing embeddings back-to-back
    const flatData = Array.from(output.data) as number[];
    const dimensions = 384;
    
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      embeddings.push(flatData.slice(i * dimensions, (i + 1) * dimensions));
    }
    return embeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch vector embeddings: ${(error as Error).message}`);
  }
}


/**
 * Calculates dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculates the magnitude of a vector
 */
export function magnitude(a: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

/**
 * Calculates cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}
