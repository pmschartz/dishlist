import { describe, expect, it } from 'vitest';
import { MAX_DIMENSION, scaledSize } from './resizeImage';

describe('scaledSize', () => {
  it('leaves small images alone', () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledSize(MAX_DIMENSION, 900)).toEqual({ width: MAX_DIMENSION, height: 900 });
  });

  it('shrinks a landscape photo to the max width, keeping the aspect ratio', () => {
    expect(scaledSize(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  });

  it('shrinks a portrait photo to the max height', () => {
    expect(scaledSize(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it('respects a custom limit', () => {
    expect(scaledSize(1000, 500, 100)).toEqual({ width: 100, height: 50 });
  });
});
