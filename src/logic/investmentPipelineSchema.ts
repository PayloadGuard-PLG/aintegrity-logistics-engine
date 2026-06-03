import { z } from 'zod';

// Domain vocabulary is injected at startup from DomainProfile.metricVocabulary.
// Call buildMetricNameSchema(profile.metricVocabulary) once at app init and reuse.
export function buildMetricNameSchema(vocab: string[]) {
  const vocabSet = new Set(vocab.map(s => s.toUpperCase()));
  return z.string().refine(
    (s: string) => vocabSet.has(s.toUpperCase()),
    { message: 'Unknown metric name' },
  );
}

export const MetricCaptureSchema = z.object({
  metricName:  z.string(),
  valueBefore: z.number().nonnegative().max(9999),
  gainLo:      z.number().nonnegative(),
  gainHi:      z.number().nonnegative(),
}).refine(d => d.gainHi >= d.gainLo, { message: 'gainHi must be >= gainLo' });

export const DocumentScanResultSchema = z.object({
  investmentType:     z.string().optional(),
  investmentCategory: z.string().optional(),
  cycleCount:         z.number().positive().max(1000).optional(),
  metrics:            z.array(MetricCaptureSchema),
  isRewardCycle:      z.boolean().optional(),
});

export type ValidatedDocumentScanResult = z.infer<typeof DocumentScanResultSchema>;
