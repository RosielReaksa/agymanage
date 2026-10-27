import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Check, Terminal, Code2 } from 'lucide-react';

interface QuickstartCardProps {
  apiKey?: string;
}

export const QuickstartCard: React.FC<QuickstartCardProps> = ({
  apiKey = 'sk-ant-live-••••••••••••',
}) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const { toast } = useToast();

  const getBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/v1`;
    }
    return 'http://localhost:8045/v1';
  };

  const baseUrl = getBaseUrl();

  const snippets = {
    curl: `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      { "role": "user", "content": "Explain quantum entanglement in 2 sentences." }
    ],
    "temperature": 0.7
  }'`,

    python: `from openai import OpenAI

# Initialize OpenAI client with Antigravity Gateway endpoint
client = OpenAI(
    base_url="${baseUrl}",
    api_key="${apiKey}",
)

completion = client.chat.completions.create(
    model="gemini-2.5-pro",
    messages=[
        {"role": "system", "content": "You are a concise engineering assistant."},
        {"role": "user", "content": "Write a TypeScript function to debounce an API call."},
    ],
)

print(completion.choices[0].message.content)`,

    nodejs: `import OpenAI from "openai";

// Initialize OpenAI SDK pointing to your Antigravity Gateway
const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "${apiKey}",
});

const response = await client.chat.completions.create({
  model: "claude-3-5-sonnet",
  messages: [
    { role: "user", content: "Implement a rate limiter token bucket in TypeScript." }
  ],
});

console.log(response.choices[0].message.content);`,
  };

  const handleCopy = (tabKey: keyof typeof snippets) => {
    navigator.clipboard.writeText(snippets[tabKey]);
    setCopiedTab(tabKey);
    setTimeout(() => setCopiedTab(null), 2000);
    toast({
      title: 'Snippet Copied',
      description: `Copied ${tabKey.toUpperCase()} quickstart snippet.`,
    });
  };

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-2xl shadow-soft-card overflow-hidden dark:bg-[#1E1D1A] dark:border-[#34312C]">
      <Tabs defaultValue="curl" className="w-full">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#E8E4DC] flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5]/80 dark:bg-[#161514]/60 dark:border-[#34312C]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#F4ECE7] text-[#C85A32] dark:bg-[#2A201C] dark:text-[#E28567]">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-[#EFECE6]">
                Quickstart Integration
              </h2>
              <p className="text-xs text-[#6E6A64] dark:text-[#9E988F]">
                Drop-in compatible with standard OpenAI SDKs and agents
              </p>
            </div>
          </div>

          <TabsList className="bg-[#EFECE6] p-1 rounded-xl dark:bg-[#282622]">
            <TabsTrigger
              value="curl"
              className="rounded-lg text-xs font-mono px-3 py-1 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-soft-sm dark:data-[state=active]:bg-[#1E1D1A] dark:data-[state=active]:text-[#EFECE6]"
            >
              cURL
            </TabsTrigger>
            <TabsTrigger
              value="python"
              className="rounded-lg text-xs font-mono px-3 py-1 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-soft-sm dark:data-[state=active]:bg-[#1E1D1A] dark:data-[state=active]:text-[#EFECE6]"
            >
              Python
            </TabsTrigger>
            <TabsTrigger
              value="nodejs"
              className="rounded-lg text-xs font-mono px-3 py-1 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-soft-sm dark:data-[state=active]:bg-[#1E1D1A] dark:data-[state=active]:text-[#EFECE6]"
            >
              Node.js
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Code Content Tabs */}
        {(['curl', 'python', 'nodejs'] as const).map((lang) => (
          <TabsContent key={lang} value={lang} className="m-0 p-0 relative group">
            <div className="absolute top-4 right-4 z-10">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(lang)}
                className="rounded-lg text-xs border-stone-700 bg-stone-900/80 text-stone-300 hover:bg-stone-800 hover:text-white backdrop-blur-sm shadow-soft-sm px-2.5 py-1 h-7"
              >
                {copiedTab === lang ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <pre className="p-6 bg-[#1C1A18] text-[#EFECE6] font-mono text-xs leading-relaxed overflow-x-auto select-all rounded-b-2xl border-t border-stone-800">
              <code>{snippets[lang]}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
