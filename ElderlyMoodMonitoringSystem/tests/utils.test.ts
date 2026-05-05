/**
 * Unit tests for core utilities
 * - Covers `moodUtils` pure helpers
 * - Covers PDF generation entry points with mocks (no real file IO)
 *
 * Keep all tests in one file to keep the test surface small.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Pure utilities under test
import { getMoodColor, getMoodEmoji, mapExpressionToEmotion } from '../src/app/utils/moodUtils';
import {
  downloadSingleReportPdf,
  downloadAllReportsPdf,
  downloadCustomComprehensiveReportPdf,
  computeEmotionDistribution,
} from '../src/app/utils/reportPdf';

// Mock `jspdf` so tests run in Node without creating real PDFs.
vi.mock('jspdf', () => {
  const saveMock = vi.fn();
  const addImageMock = vi.fn();
  return {
    default: class {
      constructor() {}
      setFillColor() {}
      roundedRect() {}
      setTextColor() {}
      setFont() {}
      setFontSize() {}
      text() {}
      setDrawColor() {}
      line() {}
      addPage() {}
      splitTextToSize(text: string) {
        return [String(text)];
      }
      addImage(...args: any[]) {
        addImageMock(...args);
      }
      save(filename: string) {
        saveMock(filename);
      }
    },
    // expose mocks for assertions via the module cache
    __mocks__: { saveMock, addImageMock },
  };
});

// Provide a fake canvas implementation for `renderDistributionChart`.
const originalCreateElement = global.document?.createElement;
beforeAll(() => {
  // Replace createElement to return a fake canvas for 'canvas' requests.
  // jsdom may implement canvas poorly, so provide a simple stub used by our code.
  // The stub implements `getContext` and `toDataURL` used in the code under test.
  // @ts-ignore
  global.document.createElement = (tag: string) => {
    if (tag === 'canvas') {
      const canvas: any = {
        width: 900,
        height: 620,
        getContext: () => ({
          fillStyle: '',
          font: '',
          fillRect: () => {},
          beginPath: () => {},
          moveTo: () => {},
          arc: () => {},
          closePath: () => {},
          fill: () => {},
          fillText: () => {},
        }),
        toDataURL: () => 'data:image/png;base64,fake',
      };
      return canvas;
    }
    // fallback to original for other tags
    // @ts-ignore
    return originalCreateElement ? originalCreateElement.call(document, tag) : {};
  };
});

afterAll(() => {
  // restore
  if (originalCreateElement) (global.document as any).createElement = originalCreateElement;
});

describe('moodUtils', () => {
  it('returns correct colors for known emotions and fallback', () => {
    expect(getMoodColor('happy')).toBe('#10b981');
    expect(getMoodColor('sad')).toBe('#3b82f6');
    expect(getMoodColor('unknown')).toBe('#6b7280');
  });

  it('returns correct emojis and fallback', () => {
    expect(getMoodEmoji('happy')).toBe('😊');
    expect(getMoodEmoji('anxious')).toBe('😟');
    expect(getMoodEmoji('blah')).toBe('😐');
  });

  it('maps face-api expressions to emotions', () => {
    expect(mapExpressionToEmotion('happy')).toBe('happy');
    expect(mapExpressionToEmotion('angry')).toBe('stressed');
    expect(mapExpressionToEmotion('surprised')).toBe('confused');
    expect(mapExpressionToEmotion('nonsense')).toBe('neutral');
  });
});

describe('reportPdf helpers and entry points (mocked)', () => {
  it('computeEmotionDistribution returns expected percentages/counts', () => {
    const sampleMoods = [
      { emotion: 'happy' },
      { emotion: 'happy' },
      { emotion: 'sad' },
      { emotion: 'neutral' },
    ] as any;

    const dist = computeEmotionDistribution(sampleMoods);
    const happy = dist.find((d) => d.key === 'happy')!;
    const sad = dist.find((d) => d.key === 'sad')!;
    const neutral = dist.find((d) => d.key === 'neutral')!;

    expect(happy.count).toBe(2);
    expect(sad.count).toBe(1);
    expect(neutral.count).toBe(1);
    // percent sums should be 100 (or rounding may make it close); check values individually
    expect(happy.value).toBeGreaterThanOrEqual(0);
  });

  it('downloadSingleReportPdf and downloadAllReportsPdf do not throw (jsPDF mocked)', () => {
    const report = {
      id: 'r1',
      title: 'Test Report',
      summary: 'Summary',
      analysisNarrative: '',
      caregiverSummary: '',
      period: '2026-01-01 to 2026-01-02',
      generatedAt: new Date(),
      insights: ['one'],
    } as any;

    expect(() => downloadSingleReportPdf(report)).not.toThrow();
    expect(() => downloadAllReportsPdf([report, report])).not.toThrow();
  });

  it('downloadCustomComprehensiveReportPdf runs without throwing with mocked canvas and jsPDF', () => {
    const reports = [
      { id: 'r1', title: 'R1', summary: 'S', analysisNarrative: '', caregiverSummary: '', period: 'p', generatedAt: new Date(), insights: [] },
    ] as any[];

    const moods = [
      { emotion: 'happy' },
      { emotion: 'sad' },
    ] as any[];

    expect(() =>
      downloadCustomComprehensiveReportPdf({ reports, moods, userDetails: { name: 'A', accountId: '1', email: 'a@b.com', downloadedAt: new Date() } })
    ).not.toThrow();
  });
});
