import {
  createPipelineStore,
  createPipeline,
  addStage,
  removeStage,
  runPipeline,
  getPipeline,
} from './pipeline';
import { PipelineContext } from './pipeline.types';

function makeCtx(overrides: Partial<PipelineContext> = {}): Omit<PipelineContext, 'aborted'> {
  return {
    vaultId: 'vault-1',
    actorId: 'actor-1',
    action: 'set-secret',
    payload: {},
    metadata: {},
    ...overrides,
  };
}

describe('pipeline', () => {
  it('creates a pipeline store', () => {
    const store = createPipelineStore();
    expect(store.pipelines.size).toBe(0);
  });

  it('creates a pipeline and retrieves it', () => {
    const store = createPipelineStore();
    const p = createPipeline(store, 'my-pipeline');
    expect(getPipeline(store, p.id)).toEqual(p);
  });

  it('adds and removes stages', () => {
    const store = createPipelineStore();
    const p = createPipeline(store, 'test');
    addStage(store, p.id, { name: 'validate', handler: async (ctx) => ctx });
    expect(getPipeline(store, p.id)!.stages).toHaveLength(1);
    removeStage(store, p.id, 'validate');
    expect(getPipeline(store, p.id)!.stages).toHaveLength(0);
  });

  it('runs all stages and returns success', async () => {
    const store = createPipelineStore();
    const p = createPipeline(store, 'run-test', [
      { name: 'enrich', handler: async (ctx) => ({ ...ctx, metadata: { enriched: true } }) },
      { name: 'log', handler: async (ctx) => ctx },
    ]);
    const result = await runPipeline(store, p.id, makeCtx());
    expect(result.success).toBe(true);
    expect(result.stagesRun).toEqual(['enrich', 'log']);
    expect(result.context.metadata.enriched).toBe(true);
  });

  it('stops pipeline when context is aborted', async () => {
    const store = createPipelineStore();
    const p = createPipeline(store, 'abort-test', [
      { name: 'abort', handler: async (ctx) => ({ ...ctx, aborted: true, abortReason: 'denied' }) },
      { name: 'never', handler: async (ctx) => ctx },
    ]);
    const result = await runPipeline(store, p.id, makeCtx());
    expect(result.success).toBe(false);
    expect(result.stagesRun).toEqual(['abort']);
    expect(result.context.abortReason).toBe('denied');
  });

  it('returns error on stage throw', async () => {
    const store = createPipelineStore();
    const p = createPipeline(store, 'throw-test', [
      { name: 'boom', handler: async () => { throw new Error('stage failed'); } },
    ]);
    const result = await runPipeline(store, p.id, makeCtx());
    expect(result.success).toBe(false);
    expect(result.error).toMatch('stage failed');
  });

  it('returns error for unknown pipeline', async () => {
    const store = createPipelineStore();
    const result = await runPipeline(store, 'nonexistent', makeCtx());
    expect(result.success).toBe(false);
    expect(result.error).toBe('Pipeline not found');
  });
});
