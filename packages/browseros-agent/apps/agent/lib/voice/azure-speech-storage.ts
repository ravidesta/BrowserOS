import { storage } from '@wxt-dev/storage'
import { useEffect, useState } from 'react'

export interface AzureSpeechConfig {
  key: string
  region: string
  voice: string
}

export interface AzureSpeechVoiceOption {
  id: string
  label: string
  description: string
}

export const AZURE_SPEECH_VOICES: AzureSpeechVoiceOption[] = [
  {
    id: 'en-US-AvaMultilingualNeural',
    label: 'Ava',
    description: 'Warm, conversational, multilingual',
  },
  {
    id: 'en-US-EmmaMultilingualNeural',
    label: 'Emma',
    description: 'Bright, friendly, multilingual',
  },
  {
    id: 'en-US-JennyMultilingualNeural',
    label: 'Jenny',
    description: 'Steady assistant cadence',
  },
  {
    id: 'en-US-AriaNeural',
    label: 'Aria',
    description: 'Calm, expressive',
  },
  {
    id: 'en-US-AndrewMultilingualNeural',
    label: 'Andrew',
    description: 'Grounded, reflective, multilingual',
  },
  {
    id: 'en-US-BrianMultilingualNeural',
    label: 'Brian',
    description: 'Approachable, warm, multilingual',
  },
  {
    id: 'en-US-DavisNeural',
    label: 'Davis',
    description: 'Conversational, low-key',
  },
]

export const DEFAULT_AZURE_SPEECH_VOICE = 'en-US-AvaMultilingualNeural'

const EMPTY_CONFIG: AzureSpeechConfig = {
  key: '',
  region: '',
  voice: DEFAULT_AZURE_SPEECH_VOICE,
}

export const azureSpeechConfigStorage = storage.defineItem<AzureSpeechConfig>(
  'local:azure-speech-config',
  { fallback: EMPTY_CONFIG },
)

export const isAzureSpeechConfigured = (config: AzureSpeechConfig | null) =>
  !!config?.key?.trim() && !!config?.region?.trim() && !!config?.voice?.trim()

export const useAzureSpeechConfig = () => {
  const [config, setConfig] = useState<AzureSpeechConfig>(EMPTY_CONFIG)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    azureSpeechConfigStorage.getValue().then((value) => {
      if (mounted) {
        setConfig(value ?? EMPTY_CONFIG)
        setIsLoading(false)
      }
    })
    const unwatch = azureSpeechConfigStorage.watch((value) => {
      if (mounted) setConfig(value ?? EMPTY_CONFIG)
    })
    return () => {
      mounted = false
      unwatch()
    }
  }, [])

  const save = async (next: AzureSpeechConfig) => {
    await azureSpeechConfigStorage.setValue(next)
  }

  const clear = async () => {
    await azureSpeechConfigStorage.setValue(EMPTY_CONFIG)
  }

  return {
    config,
    isLoading,
    isConfigured: isAzureSpeechConfigured(config),
    save,
    clear,
  }
}
