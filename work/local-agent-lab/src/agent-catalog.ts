import { audienceSegmentationAgent } from "./agents/audience-segmentation.js";
import { campaignPerformanceAgent } from "./agents/campaign-performance.js";
import { campaignsPaidMediaAgent } from "./agents/campaigns-paid-media.js";
import { eventCreationAgent } from "./agents/event-creation.js";
import { eventPromotionAgent } from "./agents/event-promotion.js";
import { foundationSetupAgent } from "./agents/foundation-setup.js";
import { newsletterCompositionAgent } from "./agents/newsletter-composition.js";
import { ownedMediaProductionAgent } from "./agents/owned-media-production.js";
import { socialContentAgent } from "./agents/social-content.js";
import type { AgentDefinition } from "./types.js";

export { sharedContext } from "./shared-context.js";

export const agents: AgentDefinition[] = [
  foundationSetupAgent,
  newsletterCompositionAgent,
  socialContentAgent,
  eventCreationAgent,
  eventPromotionAgent,
  audienceSegmentationAgent,
  ownedMediaProductionAgent,
  campaignPerformanceAgent,
  campaignsPaidMediaAgent,
];
