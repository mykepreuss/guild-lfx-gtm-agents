// This is a template for creating a new agent that is fully specified by a
// system prompt and a set of tools it can use.

// TODO: Import the set of tools that you need for your agent. By
// default, your agent can search and activate account-scoped Guild skills.
// Remove `...skillsTools` below if this agent should not use skills.
import { llmAgent, pick, skillsTools } from "@guildai/agents-sdk";
import { gitHubTools } from "@guildai-services/guildai~github";

const systemPrompt: string = `
TODO: write a system prompt.

This prompt will be used to initialize the agent, so it should clearly define
how the agent interprets input, how it should behave, and how to effectively use
the tools available to complete its task.
`;

const description = `
TODO: write an agent description to explain what this agent does and how it
should be used.

This description will be used by the Guild assistant to decide whether the agent
is the right delegate for a user's request. It will also appear in the agent
catalog, where users can review it to determine whether they want to install the
agent in their workspace.

Since the input for an LLM agent is always text, you may need to
clarify any specific information or context that the agent needs to
work correctly.

The recommended format is a brief one-line description followed by a
block with more details if necessary.
`;

export default llmAgent({
  description,
  tools: {
    ...skillsTools,

    // TODO: select the tools your agent needs. For services with
    // extremely large tool sets, use `pick` to choose a subset.
    ...pick(gitHubTools, [
      "github_issues_list_for_repo",
      "github_issues_list_comments_for_repo",
      "github_issues_get",
      "github_issues_update",
      "github_issues_create_comment",
      "github_issues_add_labels",
    ]),
  },
  systemPrompt,
});