import { Pipeline, PipelineContext, PipelineResult, PipelineStage } from './pipeline.types';

let idCounter = 0;
function generateId(): string {
  return `pipeline-${++idCounter}-${Date.now()}`;
}

export type PipelineStore = {
  pipelines: Map<string, Pipeline>;
};

export function createPipelineStore(): PipelineStore {
  return { pipelines: new Map() };
}

export function createPipeline(
  store: PipelineStore,
  name: string,
  stages: PipelineStage[] = []
): Pipeline {
  const pipeline: Pipeline = { id: generateId(), name, stages: [...stages] };
  store.pipelines.set(pipeline.id, pipeline);
  return pipeline;
}

export function addStage(
  store: PipelineStore,
  pipelineId: string,
  stage: PipelineStage
): Pipeline | null {
  const pipeline = store.pipelines.get(pipelineId);
  if (!pipeline) return null;
  pipeline.stages.push(stage);
  return pipeline;
}

export function removeStage(
  store: PipelineStore,
  pipelineId: string,
  stageName: string
): Pipeline | null {
  const pipeline = store.pipelines.get(pipelineId);
  if (!pipeline) return null;
  pipeline.stages = pipeline.stages.filter((s) => s.name !== stageName);
  return pipeline;
}

export async function runPipeline(
  store: PipelineStore,
  pipelineId: string,
  initialContext: Omit<PipelineContext, 'aborted'>
): Promise<PipelineResult> {
  const pipeline = store.pipelines.get(pipelineId);
  if (!pipeline) {
    return {
      success: false,
      context: { ...initialContext, aborted: true, abortReason: 'Pipeline not found' },
      stagesRun: [],
      error: 'Pipeline not found',
    };
  }

  let ctx: PipelineContext = { ...initialContext, aborted: false };
  const stagesRun: string[] = [];

  for (const stage of pipeline.stages) {
    if (ctx.aborted) break;
    try {
      ctx = await stage.handler(ctx);
      stagesRun.push(stage.name);
    } catch (err) {
      return {
        success: false,
        context: { ...ctx, aborted: true, abortReason: String(err) },
        stagesRun,
        error: String(err),
      };
    }
  }

  return { success: !ctx.aborted, context: ctx, stagesRun };
}

export function getPipeline(store: PipelineStore, pipelineId: string): Pipeline | undefined {
  return store.pipelines.get(pipelineId);
}
