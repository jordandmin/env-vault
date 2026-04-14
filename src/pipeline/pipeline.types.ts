export type PipelineStage = {
  name: string;
  handler: (ctx: PipelineContext) => Promise<PipelineContext>;
};

export type PipelineContext = {
  vaultId: string;
  actorId: string;
  action: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  aborted: boolean;
  abortReason?: string;
};

export type Pipeline = {
  id: string;
  name: string;
  stages: PipelineStage[];
};

export type PipelineResult = {
  success: boolean;
  context: PipelineContext;
  stagesRun: string[];
  error?: string;
};
