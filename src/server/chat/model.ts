import type { LanguageModel } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import type { AssistantServerConfig, ChatModelId } from '../../../site.config';

// Thinking is on by default for these models and bills inside the output budget,
// so each candidate gets the switch it needs.
function settingsFor(model: ChatModelId) {
  return model === '@cf/zai-org/glm-4.7-flash'
    ? { chat_template_kwargs: { enable_thinking: false } }
    : {};
}

// The only file that knows the provider. The scripted model replaces it in
// local builds; production builds drop that branch and its import.
export async function chatModel(
  ai: Ai | undefined,
  config: AssistantServerConfig,
  sessionId: string,
): Promise<LanguageModel | null> {
  if (__CHAT_FAKE__) {
    return (await import('@/server/chat/fake-model')).fakeChatModel();
  }
  if (!ai || config.model === 'fake') return null;
  const provider = createWorkersAI({
    binding: ai,
    ...(config.aiGatewayName
      ? {
          gateway: {
            id: config.aiGatewayName,
            skipCache: true,
            collectLog: false,
            metadata: { site: 'zenetlabs-web' },
          },
        }
      : {}),
  });
  return provider(config.model, {
    sessionAffinity: sessionId,
    ...settingsFor(config.model),
  });
}
