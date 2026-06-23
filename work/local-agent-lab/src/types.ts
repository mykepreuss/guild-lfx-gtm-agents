export type AgentId =
  | "foundation-setup"
  | "newsletter-composition"
  | "social-content"
  | "event-creation"
  | "event-promotion"
  | "audience-segmentation"
  | "owned-media-production"
  | "campaign-performance"
  | "campaigns-paid-media";

export type AgentHubCategory = "gtm-marketing-os";

export type SourceSafetyLevel = "public_fixture_only";

export type VisibilityReadiness = "local_lab_only";

export type AgentHubPackageStatus = "not_packaged";

export type AgentHubValidationStatus = "not_run";

export type AgentHubVisibility = "draft_only";

export type Workstream =
  | "foundation"
  | "content"
  | "events"
  | "audience"
  | "owned_media"
  | "performance"
  | "paid_media";

export type ApprovalStatus =
  | "needs_project_leader_review"
  | "ready_for_review"
  | "ready_for_budget_review"
  | "plan_ready"
  | "draft_ready";

export type DecisionType =
  | "approve_or_edit"
  | "choose_next_action"
  | "confirm_budget"
  | "confirm_segment"
  | "confirm_launch";

export type SourceConfidence = "fixture_assumption" | "fixture_metric";

export type DashboardSignalValue = string | number | boolean | null;

export type DashboardSignals = Record<string, DashboardSignalValue>;

export type AdapterNote = [system: string, action: string];

export interface AssetBlock {
  title: string;
  body: string;
}

export interface AgentHubReadiness {
  packageStatus: AgentHubPackageStatus;
  validationStatus: AgentHubValidationStatus;
  visibility: AgentHubVisibility;
  notes: string[];
}

export interface AgentMetadata {
  category: AgentHubCategory;
  tags: string[];
  workstream: Workstream;
  primaryUser: string;
  sourceSafetyLevel: SourceSafetyLevel;
  visibilityReadiness: VisibilityReadiness;
  agentHubReadiness: AgentHubReadiness;
}

export interface ApprovalModel {
  ownerRole: string;
  requiredApprovers: string[];
  decisionType: DecisionType;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: DashboardSignalValue;
  unit?: string;
}

export interface DashboardContract {
  workstream: Workstream;
  ownerRole: string;
  approvalStatus: ApprovalStatus;
  decisionRequired: string;
  blockers: string[];
  nextAction: string;
  metrics: DashboardMetric[];
  sourceConfidence: SourceConfidence;
  downstreamAgents: AgentId[];
}

export interface AgentDefinition {
  id: AgentId;
  hubName: string;
  displayName: string;
  order: number;
  metadata: AgentMetadata;
  aliases: string[];
  keywords: string[];
  trigger: string;
  summary: string;
  demoPrompt: string;
  questions: string[];
  assumptions: string[];
  assetBlocks: AssetBlock[];
  approvalModel: ApprovalModel;
  approvalChecklist: string[];
  dashboard: DashboardContract;
  dashboardSignals: DashboardSignals;
  adapters: AdapterNote[];
  nextAction: string;
}

export interface SharedContext {
  project: string;
  projectLeader: string;
  primaryAudience: string;
  tone: string;
  reviewState: string;
  mode: string;
  liveExecution: boolean;
  dateContext: string;
}

export interface DashboardPayload {
  agentId: AgentId;
  agentHubName: string;
  agentDisplayName: string;
  category: AgentHubCategory;
  tags: string[];
  mode: string;
  liveExecution: boolean;
  project: string;
  status: string;
  sourceRequest: string;
  workstream: Workstream;
  ownerRole: string;
  approvalStatus: ApprovalStatus;
  decisionRequired: string;
  blockers: string[];
  nextAction: string;
  metrics: DashboardMetric[];
  sourceConfidence: SourceConfidence;
  downstreamAgents: AgentId[];
  agentHubReadiness: AgentHubReadiness;
  signals: DashboardSignals;
}

export interface RankedAgent {
  agent: AgentDefinition;
  score: number;
}
