import { Loader2, Play, Save, Sparkles, Trash2 } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sentry } from '@/lib/sentry/sentry'
import { synthesizeAzureSpeech } from '@/lib/voice/azure-speech-client'
import {
  AZURE_SPEECH_VOICES,
  type AzureSpeechConfig,
  DEFAULT_AZURE_SPEECH_VOICE,
  isAzureSpeechConfigured,
  useAzureSpeechConfig,
} from '@/lib/voice/azure-speech-storage'

const PREVIEW_TEXT =
  "Hi, I'm here whenever you want to talk. Take a breath, and tell me what's on your mind."

export const VoiceSettingsCard: FC = () => {
  const { config, isLoading, save, clear } = useAzureSpeechConfig()
  const [draft, setDraft] = useState<AzureSpeechConfig>(config)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  useEffect(() => {
    setDraft(config)
  }, [config])

  const isDraftReady = isAzureSpeechConfigured(draft)
  const hasChanges =
    draft.key !== config.key ||
    draft.region !== config.region ||
    draft.voice !== config.voice

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await save({
        key: draft.key.trim(),
        region: draft.region.trim(),
        voice: draft.voice || DEFAULT_AZURE_SPEECH_VOICE,
      })
      toast.success('Voice saved', {
        description: (
          <span className="text-sm">Coach now uses Azure AI Speech.</span>
        ),
      })
    } catch (error) {
      sentry.captureException(error, {
        extra: { message: 'Failed to save Azure Speech config' },
      })
      toast.error('Could not save voice settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    await clear()
    toast.success('Voice cleared', {
      description: (
        <span className="text-sm">Coach reverted to the browser voice.</span>
      ),
    })
  }

  const handlePreview = async () => {
    if (!isDraftReady) return
    setIsPreviewing(true)
    try {
      const blob = await synthesizeAzureSpeech(PREVIEW_TEXT, {
        key: draft.key.trim(),
        region: draft.region.trim(),
        voice: draft.voice || DEFAULT_AZURE_SPEECH_VOICE,
      })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsPreviewing(false)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setIsPreviewing(false)
        toast.error('Preview failed to play')
      }
      await audio.play()
    } catch (error) {
      setIsPreviewing(false)
      sentry.captureException(error, {
        extra: { message: 'Azure Speech preview failed' },
      })
      toast.error('Preview failed', {
        description: (
          <span className="text-sm">
            {error instanceof Error ? error.message : 'Unknown error'}
          </span>
        ),
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Voice (Azure AI Speech)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Voice (Azure AI Speech)
        </CardTitle>
        <CardDescription>
          Used by the Coach orb. When configured, replaces the browser's
          built-in voice with Azure neural voices. Falls back to the browser
          voice if cleared or if a request fails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="azure-speech-region">Region</Label>
            <Input
              id="azure-speech-region"
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              placeholder="eastus"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="azure-speech-voice">Voice</Label>
            <Select
              value={draft.voice || DEFAULT_AZURE_SPEECH_VOICE}
              onValueChange={(value) => setDraft({ ...draft, voice: value })}
            >
              <SelectTrigger id="azure-speech-voice">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {AZURE_SPEECH_VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <span className="flex flex-col items-start">
                      <span className="font-medium">{voice.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {voice.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="azure-speech-key">Subscription key</Label>
          <Input
            id="azure-speech-key"
            type="password"
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
            placeholder="Paste your Azure Speech key"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-muted-foreground text-xs">
            Stored locally in this browser. Find it in the Azure portal under
            your Speech resource → Keys and Endpoint.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDraftReady || !hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreview}
            disabled={!isDraftReady || isPreviewing}
          >
            {isPreviewing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Preview
          </Button>
          {isAzureSpeechConfigured(config) && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              className="text-muted-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
