import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSaasModels, useRunPlayground, useSaasKeys } from '../hooks/useSaas';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sparkles,
  Bot,
  User,
  Send,
  RefreshCw,
  Copy,
  Check,
  Code2,
  Sliders,
  Trash2,
  Clock,
  Coins,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Zap,
  RotateCcw,
  Square,
  Wand2,
} from 'lucide-react';
import type { ModelInfo, PlaygroundRunOutput } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
}

interface PresetOption {
  name: string;
  description: string;
  system: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

const PRESETS: PresetOption[] = [
  {
    name: 'General Assistant',
    description: 'Thoughtful, balanced responses with high clarity and helpfulness',
    system:
      'You are a helpful, knowledgeable, and polite AI assistant. Provide concise, accurate, and actionable answers.',
    temperature: 0.7,
    maxTokens: 1024,
    topP: 1.0,
  },
  {
    name: 'Code Refactor & Review',
    description: 'Precise architectural refactoring, idiomatic patterns, and bug finding',
    system:
      'You are a principal software engineer and expert code reviewer. Provide clean, idiomatic code, identify edge cases, explain architectural trade-offs, and supply diffs when appropriate.',
    temperature: 0.2,
    maxTokens: 4096,
    topP: 0.95,
  },
  {
    name: 'System Architect',
    description: 'Distributed systems design, resilient gateways, and throughput analysis',
    system:
      'You are a principal distributed systems architect. Formulate high-throughput, low-latency architectures with clear failure modes, token bucket rate limits, and quota isolation strategies.',
    temperature: 0.4,
    maxTokens: 4096,
    topP: 1.0,
  },
  {
    name: 'Creative Writing',
    description: 'Vivid imagery, evocative prose, storytelling, and rich metaphors',
    system:
      'You are an evocative creative writer and essayist. Use poetic precision, sensory language, and engaging rhythm in your responses.',
    temperature: 0.9,
    maxTokens: 2048,
    topP: 0.9,
  },
];

export const PlaygroundView: React.FC = () => {
  const { data: models = [], isLoading: isModelsLoading } = useSaasModels();
  const { data: keys = [] } = useSaasKeys();
  const runMutation = useRunPlayground();
  const { toast } = useToast();

  // Model & Preset States
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('General Assistant');

  // Parameters
  const [systemPrompt, setSystemPrompt] = useState<string>(PRESETS[0].system);
  const [isSystemExpanded, setIsSystemExpanded] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [topP, setTopP] = useState<number>(1.0);
  const [stopSequences, setStopSequences] = useState<string>('');

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-assistant',
      role: 'assistant',
      content:
        'Welcome to the Antigravity AI Playground! Choose your frontier model, configure prompt parameters, and test completions with real-time telemetry.',
      timestamp: Date.now(),
      model: 'Antigravity Gateway',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');

  // Streaming / Typewriter State
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [displayedStreamingText, setDisplayedStreamingText] = useState<string>('');
  const streamingTargetRef = useRef<string>('');
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<PlaygroundRunOutput | null>(null);

  // View Code Modal
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bottom scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set default model once models catalog is loaded
  useEffect(() => {
    if (models.length > 0 && !models.some((m) => m.id === selectedModel)) {
      const preferred =
        models.find((m) => m.id.includes('claude-3-7') || m.id.includes('gemini-2.5-flash')) ||
        models[0];
      setSelectedModel(preferred.id);
    }
  }, [models, selectedModel]);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedStreamingText]);

  // Handle Preset Selection
  const handleApplyPreset = (presetName: string) => {
    setSelectedPresetName(presetName);
    const preset = PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setSystemPrompt(preset.system);
    setTemperature(preset.temperature);
    setMaxTokens(preset.maxTokens);
    setTopP(preset.topP);
    toast({
      title: `Preset applied: ${preset.name}`,
      description: preset.description,
    });
  };

  // Stop typewriter animation and instantly show full text
  const stopStreaming = () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (streamingMessageId && streamingTargetRef.current) {
      const fullText = streamingTargetRef.current;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === streamingMessageId ? { ...msg, content: fullText } : msg)),
      );
    }
    setIsTyping(false);
    setStreamingMessageId(null);
    setDisplayedStreamingText('');
  };

  // Run the prompt
  const handleRun = async () => {
    const trimmedInput = inputPrompt.trim();
    if (!trimmedInput && messages.length === 0) {
      toast({
        title: 'Empty prompt',
        description: 'Please type a prompt or question first.',
        variant: 'destructive',
      });
      return;
    }

    if (isTyping) {
      stopStreaming();
      return;
    }

    // Add user message to conversation
    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');

    // Prepare API input payload
    const apiMessages = newMessages
      .filter((m) => m.id !== 'welcome-assistant')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const output = await runMutation.mutateAsync({
        model: selectedModel,
        messages: apiMessages,
        system: systemPrompt.trim() || undefined,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
      });

      setTelemetry(output);

      // Create placeholder assistant message for streaming
      const assistantMessageId = `asst-${Date.now()}`;
      const placeholderMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: output.model,
      };

      setMessages((prev) => [...prev, placeholderMessage]);
      setStreamingMessageId(assistantMessageId);
      setIsTyping(true);
      streamingTargetRef.current = output.content;

      // Typewriter streaming simulation: reveal chunks every 18ms
      const fullContent = output.content;
      let currentIndex = 0;
      const chunkSize = Math.max(1, Math.floor(fullContent.length / 50)); // stream over ~1-1.5 seconds

      typingTimerRef.current = setInterval(() => {
        currentIndex += chunkSize;
        if (currentIndex >= fullContent.length) {
          if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg,
            ),
          );
          setIsTyping(false);
          setStreamingMessageId(null);
          setDisplayedStreamingText('');
        } else {
          const slice = fullContent.slice(0, currentIndex);
          setDisplayedStreamingText(slice);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: slice } : msg,
            ),
          );
        }
      }, 18);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown execution error';
      toast({
        title: 'Playground Execution Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
  };

  const handleClearChat = () => {
    if (isTyping) {
      stopStreaming();
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Chat history cleared. Send a prompt to start a fresh thread.',
        timestamp: Date.now(),
        model: selectedModel,
      },
    ]);
    setTelemetry(null);
    toast({
      title: 'Conversation Cleared',
      description: 'The playground thread has been reset.',
    });
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
    toast({
      title: 'Copied to Clipboard',
      description: 'Message content has been copied.',
    });
  };

  // Find active model details
  const currentModelInfo: ModelInfo | undefined = models.find((m) => m.id === selectedModel);

  // Primary active API key for code snippets
  const activeKeyStr = keys[0]?.key || keys[0]?.apiKey || 'sk-ant-live-••••••••••••';

  // Dynamic code snippets
  const codeSnippets = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8045';
    const baseUrl = `${origin}/v1`;

    const payload = {
      model: selectedModel,
      messages: [
        ...(systemPrompt.trim() ? [{ role: 'system', content: systemPrompt.trim() }] : []),
        ...messages
          .filter((m) => m.id !== 'welcome-assistant' && !m.id.startsWith('welcome-'))
          .map((m) => ({ role: m.role, content: m.content })),
        ...(inputPrompt.trim() ? [{ role: 'user', content: inputPrompt.trim() }] : []),
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    };

    if (payload.messages.length === 0) {
      payload.messages.push({ role: 'user', content: 'Explain quantum superposition in 2 sentences.' });
    }

    const jsonPayload = JSON.stringify(payload, null, 2);

    const curl = `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${activeKeyStr}" \\
  -d '${JSON.stringify(payload)}'`;

    const python = `from openai import OpenAI

# Initialize client pointed at Antigravity Gateway
client = OpenAI(
    base_url="${baseUrl}",
    api_key="${activeKeyStr}",
)

response = client.chat.completions.create(
    model="${selectedModel}",
    messages=${JSON.stringify(payload.messages, null, 4)},
    temperature=${temperature},
    max_tokens=${maxTokens},
    top_p=${topP},
)

print(response.choices[0].message.content)
print(f"Usage: {response.usage}")`;

    const nodejs = `import OpenAI from "openai";

// Initialize OpenAI SDK targeting Antigravity Gateway
const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "${activeKeyStr}",
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "${selectedModel}",
    messages: ${JSON.stringify(payload.messages, null, 4)},
    temperature: ${temperature},
    max_tokens: ${maxTokens},
    top_p: ${topP},
  });

  console.log(completion.choices[0].message.content);
}

main().catch(console.error);`;

    return { curl, python, nodejs };
  }, [selectedModel, systemPrompt, messages, inputPrompt, temperature, maxTokens, topP, activeKeyStr]);

  return (
    <div className="w-full h-full flex flex-col font-sans bg-[#FAF8F5] text-stone-900 dark:bg-[#161514] dark:text-[#EFECE6] min-h-[calc(100vh-3.5rem)]">
      {/* Header bar */}
      <header className="border-b border-[#E8E4DC] bg-[#FAF8F5]/90 dark:border-[#34312C] dark:bg-[#161514]/90 backdrop-blur px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4ECE7] text-[#C85A32] border border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]">
              Model Evaluation
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-600">•</span>
            <span className="text-xs font-mono text-[#4D7C5F] dark:text-[#6EA885] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4D7C5F] animate-pulse"></span>
              Gateway Direct Pipe Active
            </span>
          </div>
          <h1 className="font-serif text-2xl lg:text-3xl text-stone-900 tracking-tight dark:text-[#EFECE6]">
            Interactive AI Playground
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCodeModalOpen(true)}
            className="h-9 px-3.5 rounded-xl border-[#E8E4DC] bg-white hover:bg-[#F4ECE7] text-stone-800 shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C] dark:text-[#EFECE6] dark:hover:bg-[#2A201C]"
          >
            <Code2 className="h-4 w-4 mr-1.5 text-[#C85A32] dark:text-[#E28567]" />
            View Code
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="h-9 px-3 rounded-xl border-[#E8E4DC] bg-white hover:bg-stone-50 text-stone-600 shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C] dark:text-stone-300 dark:hover:bg-[#282622]"
            title="Clear Chat History"
          >
            <Trash2 className="h-4 w-4 mr-1.5 text-stone-400" />
            Reset
          </Button>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        {/* Left/Main Column: Chat Thread & Input */}
        <main className="flex flex-col h-full overflow-hidden border-r border-[#E8E4DC] dark:border-[#34312C] bg-[#FAF8F5] dark:bg-[#161514]">
          {/* System Prompt Pill Banner */}
          <div className="border-b border-[#E8E4DC]/80 bg-[#F4ECE7]/40 dark:border-[#34312C] dark:bg-[#2A201C]/30 px-6 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[#C85A32] dark:text-[#E28567] shrink-0">
                System Context:
              </span>
              <span className="text-[#6E6A64] dark:text-[#9E988F] truncate font-sans italic">
                {systemPrompt.trim() ? systemPrompt : 'Default balanced assistant context'}
              </span>
            </div>
            <button
              onClick={() => setIsSystemExpanded(!isSystemExpanded)}
              className="text-[#C85A32] hover:text-[#A44422] dark:text-[#E28567] text-[11px] font-medium shrink-0 ml-2 underline"
            >
              {isSystemExpanded ? 'Collapse' : 'Edit Prompt'}
            </button>
          </div>

          {/* Expandable System Prompt Bar (inline) */}
          {isSystemExpanded && (
            <div className="border-b border-[#E8E4DC] bg-white p-4 shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 font-mono uppercase tracking-wider">
                  System Instructions
                </label>
                <span className="text-[11px] text-stone-400 font-mono">
                  {systemPrompt.length} chars
                </span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={3}
                placeholder="Specify instructions, persona, and constraints for the model..."
                className="w-full text-xs p-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#C85A32] text-stone-900 dark:border-[#34312C] dark:bg-[#161514] dark:text-[#EFECE6] font-mono resize-y"
              />
            </div>
          )}

          {/* Conversation Messages Thread */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 max-w-4xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border shadow-soft-sm ${
                      isUser
                        ? 'bg-stone-900 text-white border-stone-800 dark:bg-[#EFECE6] dark:text-stone-900'
                        : 'bg-[#F4ECE7] text-[#C85A32] border-[#E8D6CC] dark:bg-[#2A201C] dark:text-[#E28567] dark:border-[#3D2C24]'
                    }`}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    className={`group relative rounded-2xl p-4 sm:p-5 border shadow-soft-sm max-w-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-white border-[#E8E4DC] text-stone-900 dark:bg-[#1E1D1A] dark:border-[#34312C] dark:text-[#EFECE6]'
                        : 'bg-[#FFFFFF] border-[#E8E4DC] text-stone-900 dark:bg-[#1E1D1A] dark:border-[#34312C] dark:text-[#EFECE6]'
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between gap-3 mb-2 border-b border-stone-100 dark:border-stone-800/80 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          {isUser ? 'User' : msg.model || selectedModel}
                        </span>
                        {!isUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EAF3ED] text-[#4D7C5F] font-mono font-medium dark:bg-[#203126] dark:text-[#6EA885]">
                            Frontier
                          </span>
                        )}
                      </div>

                      {/* Copy Action */}
                      <button
                        onClick={() => handleCopyMessage(msg.content, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        title="Copy message"
                      >
                        {copiedKey === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Message Body */}
                    <div className="whitespace-pre-wrap font-sans text-stone-800 dark:text-[#EFECE6] leading-relaxed">
                      {msg.content}
                      {isTyping && msg.id === streamingMessageId && (
                        <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-[#C85A32] dark:bg-[#E28567] animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Live Telemetry Bar */}
          {telemetry && (
            <div className="border-t border-[#E8E4DC] bg-white px-6 py-2.5 shadow-soft-sm dark:bg-[#1E1D1A] dark:border-[#34312C] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 font-mono text-stone-600 dark:text-stone-400">
                  <Clock className="h-3.5 w-3.5 text-[#C85A32] dark:text-[#E28567]" />
                  <span>Latency:</span>
                  <span className="font-semibold text-stone-900 dark:text-[#EFECE6]">
                    {telemetry.latencyMs} ms
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-stone-600 dark:text-stone-400">
                  <Zap className="h-3.5 w-3.5 text-[#4D7C5F] dark:text-[#6EA885]" />
                  <span>Tokens:</span>
                  <span className="font-semibold text-stone-900 dark:text-[#EFECE6]">
                    {telemetry.promptTokens} in / {telemetry.completionTokens} out ({telemetry.totalTokens} total)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-stone-600 dark:text-stone-400">
                  <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Cost:</span>
                  <span className="font-semibold text-stone-900 dark:text-[#EFECE6]">
                    ${telemetry.costUsd.toFixed(6)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#4D7C5F] border border-[#C5DEC9] dark:bg-[#203126] dark:text-[#6EA885] dark:border-[#2C4A35]">
                  200 OK • Antigravity Gateway Pooled
                </span>
              </div>
            </div>
          )}

          {/* Prompt Input Box */}
          <div className="p-4 sm:p-6 border-t border-[#E8E4DC] bg-white/90 dark:bg-[#1E1D1A]/90 dark:border-[#34312C] shrink-0">
            <div className="relative rounded-2xl border border-[#E8E4DC] bg-white shadow-soft-sm focus-within:border-[#C85A32] focus-within:ring-1 focus-within:ring-[#C85A32] transition-all dark:bg-[#161514] dark:border-[#34312C] dark:focus-within:border-[#E28567]">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Enter prompt or follow-up question... (Enter to send, Shift+Enter for newline)"
                className="w-full resize-none bg-transparent p-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-[#EFECE6] dark:placeholder:text-stone-500"
              />

              <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                  <span>Enter ↵ to send</span>
                  <span>•</span>
                  <span>Shift + Enter for new line</span>
                </div>

                <div className="flex items-center gap-2">
                  {isTyping && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={stopStreaming}
                      className="h-8 px-2.5 rounded-xl border-[#E8E4DC] text-stone-600 hover:bg-stone-100 dark:border-[#34312C] dark:text-stone-300"
                    >
                      <Square className="h-3 w-3 mr-1 fill-current text-[#C85A32]" />
                      Stop
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={handleRun}
                    disabled={runMutation.isPending && !isTyping}
                    className="h-8 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A44422] text-white font-medium shadow-soft-sm transition-all dark:bg-[#E28567] dark:hover:bg-[#C85A32] dark:text-[#161514]"
                  >
                    {runMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Run Prompt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Model & Generation Parameters */}
        <aside className="h-full overflow-y-auto p-6 bg-[#FAF8F5] border-l border-[#E8E4DC] dark:bg-[#161514] dark:border-[#34312C] space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-3 dark:border-[#34312C]">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#C85A32] dark:text-[#E28567]" />
              <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-[#EFECE6]">
                Configuration
              </h2>
            </div>
            <span className="text-[11px] font-mono text-stone-400">Frontier API</span>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center justify-between">
              <span>Model Architecture</span>
              {currentModelInfo && (
                <span className="text-[10px] text-[#4D7C5F] font-mono">
                  {currentModelInfo.contextWindow}
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isModelsLoading}
                className="w-full appearance-none rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-2.5 text-xs text-stone-900 font-mono shadow-soft-sm focus:outline-none focus:ring-1 focus:ring-[#C85A32] dark:border-[#34312C] dark:bg-[#1E1D1A] dark:text-[#EFECE6]"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-stone-400" />
            </div>
            {currentModelInfo && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                {currentModelInfo.description}
              </p>
            )}
          </div>

          {/* Preset Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 text-[#C85A32] dark:text-[#E28567]" />
              <span>Prompt Presets</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset.name)}
                  className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                    selectedPresetName === preset.name
                      ? 'border-[#C85A32] bg-[#F4ECE7] text-[#A44422] font-semibold dark:border-[#E28567] dark:bg-[#2A201C] dark:text-[#E28567]'
                      : 'border-[#E8E4DC] bg-white hover:bg-stone-50 text-stone-700 dark:bg-[#1E1D1A] dark:border-[#34312C] dark:text-stone-300 dark:hover:bg-[#282622]'
                  }`}
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal truncate">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* System Prompt TextArea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                System Prompt
              </label>
              <button
                onClick={() => setSystemPrompt('')}
                className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                Clear
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="System prompt instructions..."
              className="w-full text-xs p-3 rounded-xl border border-[#E8E4DC] bg-white text-stone-900 shadow-soft-sm focus:outline-none focus:ring-1 focus:ring-[#C85A32] dark:border-[#34312C] dark:bg-[#1E1D1A] dark:text-[#EFECE6] font-mono resize-y"
            />
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2 pt-2 border-t border-[#E8E4DC] dark:border-[#34312C]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Temperature
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-[#EFECE6]">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400 font-mono">
              <span>0.0 (Deterministic)</span>
              <span>1.0</span>
              <span>2.0 (Creative)</span>
            </div>
          </div>

          {/* Max Tokens Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Max Tokens
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-[#EFECE6]">
                {maxTokens}
              </span>
            </div>
            <input
              type="range"
              min="64"
              max="8192"
              step="64"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400 font-mono">
              <span>64</span>
              <span>4096</span>
              <span>8192</span>
            </div>
          </div>

          {/* Top-P Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Top P (Nucleus)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-[#EFECE6]">
                {topP.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400 font-mono">
              <span>0.0</span>
              <span>0.5</span>
              <span>1.0</span>
            </div>
          </div>

          {/* Stop Sequences Input */}
          <div className="space-y-2 pt-2 border-t border-[#E8E4DC] dark:border-[#34312C]">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center justify-between">
              <span>Stop Sequences</span>
              <span className="text-[10px] text-stone-400 font-normal">Optional</span>
            </label>
            <input
              type="text"
              value={stopSequences}
              onChange={(e) => setStopSequences(e.target.value)}
              placeholder="e.g. \n\n, </stop>, Human:"
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E8E4DC] bg-white text-stone-900 shadow-soft-sm focus:outline-none focus:ring-1 focus:ring-[#C85A32] dark:border-[#34312C] dark:bg-[#1E1D1A] dark:text-[#EFECE6] font-mono"
            />
            <p className="text-[10px] text-stone-500 dark:text-stone-400">
              Comma-separated strings at which the model will cease generating.
            </p>
          </div>
        </aside>
      </div>

      {/* View Code Dialog */}
      <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-[#E8E4DC] shadow-soft-float dark:bg-[#1E1D1A] dark:border-[#34312C] rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-serif text-2xl text-stone-900 dark:text-[#EFECE6]">
              API Integration Code
            </DialogTitle>
            <DialogDescription className="text-stone-600 dark:text-[#9E988F] text-xs">
              Execute this playground query directly via standard OpenAI-compatible SDKs or cURL.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="curl" className="w-full mt-4">
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl p-1 dark:bg-[#161514] dark:border-[#34312C]">
                <TabsTrigger
                  value="curl"
                  className="text-xs px-3 py-1 rounded-lg data-[state=active]:bg-[#F4ECE7] data-[state=active]:text-[#C85A32] font-mono"
                >
                  cURL
                </TabsTrigger>
                <TabsTrigger
                  value="python"
                  className="text-xs px-3 py-1 rounded-lg data-[state=active]:bg-[#F4ECE7] data-[state=active]:text-[#C85A32] font-mono"
                >
                  Python (OpenAI)
                </TabsTrigger>
                <TabsTrigger
                  value="nodejs"
                  className="text-xs px-3 py-1 rounded-lg data-[state=active]:bg-[#F4ECE7] data-[state=active]:text-[#C85A32] font-mono"
                >
                  Node.js SDK
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const activeSnippet =
                    document.querySelector('[data-state="active"][role="tabpanel"] pre code')
                      ?.textContent || codeSnippets.curl;
                  navigator.clipboard.writeText(activeSnippet);
                  toast({
                    title: 'Snippet Copied',
                    description: 'Code snippet copied to clipboard.',
                  });
                }}
                className="h-8 text-xs rounded-xl border-[#E8E4DC] bg-white hover:bg-stone-50 dark:bg-[#1E1D1A] dark:border-[#34312C]"
              >
                <Copy className="h-3.5 w-3.5 mr-1 text-[#C85A32] dark:text-[#E28567]" />
                Copy Code
              </Button>
            </div>

            <TabsContent value="curl" className="mt-0">
              <pre className="p-4 rounded-xl bg-stone-950 text-stone-100 font-mono text-xs overflow-x-auto max-h-[350px] leading-relaxed border border-stone-800">
                <code>{codeSnippets.curl}</code>
              </pre>
            </TabsContent>

            <TabsContent value="python" className="mt-0">
              <pre className="p-4 rounded-xl bg-stone-950 text-stone-100 font-mono text-xs overflow-x-auto max-h-[350px] leading-relaxed border border-stone-800">
                <code>{codeSnippets.python}</code>
              </pre>
            </TabsContent>

            <TabsContent value="nodejs" className="mt-0">
              <pre className="p-4 rounded-xl bg-stone-950 text-stone-100 font-mono text-xs overflow-x-auto max-h-[350px] leading-relaxed border border-stone-800">
                <code>{codeSnippets.nodejs}</code>
              </pre>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};
