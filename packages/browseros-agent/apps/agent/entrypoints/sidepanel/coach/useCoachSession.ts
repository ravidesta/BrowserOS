import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { Capabilities, Feature } from '@/lib/browseros/capabilities'
import { useAgentServerUrl } from '@/lib/browseros/useBrowserOSProviders'
import { formatConversationHistory } from '@/lib/conversations/formatConversationHistory'
import { createDefaultBrowserOSProvider } from '@/lib/llm-providers/storage'
import { useLlmProviders } from '@/lib/llm-providers/useLlmProviders'
import { buildChatRequestBody } from '@/lib/messaging/server/buildChatRequestBody'
import { COACH_SYSTEM_PROMPT } from './prompts'

const COACH_CONVERSATION_PREFIX = 'coach-'

const newCoachConversationId = () =>
  `${COACH_CONVERSATION_PREFIX}${crypto.randomUUID()}`

const getLastMessageText = (messages: UIMessage[]) => {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage) return ''
  return lastMessage.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

const getAssistantTextFromMessage = (message: UIMessage | undefined) => {
  if (!message || message.role !== 'assistant') return ''
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

export const useCoachSession = () => {
  const { selectedProvider, isLoading: isLoadingProviders } = useLlmProviders()
  const {
    baseUrl: agentServerUrl,
    isLoading: isLoadingAgentUrl,
    error: agentUrlError,
  } = useAgentServerUrl()

  const [conversationId, setConversationId] = useState(newCoachConversationId)
  const conversationIdRef = useRef(conversationId)
  const agentUrlRef = useRef(agentServerUrl)
  const providerRef = useRef(selectedProvider)
  const messagesRef = useRef<UIMessage[]>([])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    agentUrlRef.current = agentServerUrl
  }, [agentServerUrl])

  useEffect(() => {
    providerRef.current = selectedProvider
  }, [selectedProvider])

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    error: chatError,
  } = useChat({
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: async ({ messages: pending }) => {
        const provider = providerRef.current ?? createDefaultBrowserOSProvider()

        const supportsArrayConversation = await Capabilities.supports(
          Feature.PREVIOUS_CONVERSATION_ARRAY,
        )

        const previousMessages = messagesRef.current
        const history =
          previousMessages.length > 0
            ? formatConversationHistory(previousMessages)
            : undefined
        const previousConversation = history?.length
          ? supportsArrayConversation
            ? history
            : history.map((m) => `${m.role}: ${m.content}`).join('\n')
          : undefined

        const message = getLastMessageText(pending)

        return {
          api: `${agentUrlRef.current}/chat`,
          body: buildChatRequestBody({
            conversationId: conversationIdRef.current,
            provider,
            message,
            mode: 'chat',
            userSystemPrompt: COACH_SYSTEM_PROMPT,
            previousConversation,
          }),
        }
      },
    }),
  })

  useEffect(() => {
    if (status === 'submitted' || status === 'streaming') {
      return
    }
    messagesRef.current = messages
  }, [messages, status])

  const resetConversation = () => {
    stop()
    setMessages([])
    messagesRef.current = []
    setConversationId(newCoachConversationId())
  }

  const sendCoachMessage = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    sendMessage({ text: trimmed })
  }

  const lastAssistantText = getAssistantTextFromMessage(
    messages[messages.length - 1]?.role === 'assistant'
      ? messages[messages.length - 1]
      : undefined,
  )

  return {
    messages,
    status,
    chatError,
    agentUrlError,
    isLoading: isLoadingProviders || isLoadingAgentUrl,
    selectedProvider,
    sendCoachMessage,
    stop,
    resetConversation,
    lastAssistantText,
  }
}

export type CoachSession = ReturnType<typeof useCoachSession>
