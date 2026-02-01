import { UX_DETECTIVE_V3_PROMPT } from './prompts/ux-detective-v3.prompt.js';
import { CODE_INVESTIGATOR_PROMPT } from './prompts/code-investigator.prompt.js';
import { PROMPT_GENERATOR_PROMPT } from './prompts/prompt-generator.prompt.js';

// AgentDefinition type from @anthropic-ai/claude-agent-sdk
interface AgentDefinition {
  description: string;
  prompt: string;
  tools?: string[];
  model?: 'sonnet' | 'opus' | 'haiku';
}

export const agents: Record<string, AgentDefinition> = {
  'ux-detective': {
    description:
      'Analyzes Microsoft Clarity UX data to extract verified facts: dead clicks, rage clicks, ' +
      'excessive scrolling, quickback clicks with session counts and percentages. ' +
      'Outputs structured JSON with VerifiedIssue objects — no speculation about root causes.',
    prompt: UX_DETECTIVE_V3_PROMPT,
    tools: [
      'Read',
      'Grep',
      'Glob',
      'mcp__clarity-tools__get_clarity_data',
      'mcp__clarity-tools__classify_severity',
    ],
    model: 'sonnet',
  },

  'code-investigator': {
    description:
      'Investigates the target repository source code to generate hypotheses about UX issues. ' +
      'Produces knownFacts, unknownFactors, and possibleCauses with probability ratings (HIGH/MEDIUM/LOW). ' +
      'Does NOT propose fixes — only investigates and informs.',
    prompt: CODE_INVESTIGATOR_PROMPT,
    tools: ['Read', 'Grep', 'Glob', 'Bash'],
    model: 'sonnet',
  },

  'prompt-generator': {
    description:
      'Generates self-contained investigation prompts that developers can copy-paste into any AI assistant ' +
      '(Claude, ChatGPT, Lovable) to investigate a UX issue. Each prompt includes context, known/unknown ' +
      'factors, ranked causes, investigation tasks, and a decision checklist.',
    prompt: PROMPT_GENERATOR_PROMPT,
    tools: ['Read', 'Grep', 'Glob'],
    model: 'sonnet',
  },
};
