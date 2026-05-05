declare module '@vladmandic/face-api' {
  // minimal subset used in this project
  export const nets: {
    tinyFaceDetector: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceExpressionNet: {
      loadFromUri(uri: string): Promise<void>;
    };
  };
  export class TinyFaceDetectorOptions {}
  export function detectSingleFace(
    input: any,
    options: TinyFaceDetectorOptions
  ): {
    withFaceExpressions(): Promise<{ expressions: Record<string, number> } | undefined>;
  };
}
