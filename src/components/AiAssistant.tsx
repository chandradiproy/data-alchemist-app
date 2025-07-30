// src/components/AiAssistant.tsx
"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Lightbulb, Sparkles, Loader2, PlusCircle } from 'lucide-react';
import { BusinessRule } from '@/lib/types';

type AssistantMode = 'analysis' | 'suggestions';

interface AiAssistantProps {
  onRunAssistant: (mode: AssistantMode) => Promise<void>;
  analysisFindings: string[];
  ruleSuggestions: BusinessRule[];
  onAddRule: (rule: BusinessRule) => void;
  isLoading: boolean;
}

export function AiAssistant({
  onRunAssistant,
  analysisFindings,
  ruleSuggestions,
  onAddRule,
  isLoading,
}: AiAssistantProps) {

  const handleAddSuggestedRule = (rule: BusinessRule) => {
    // We add a unique ID and a description if the AI didn't provide one.
    const newRule = { ...rule };
    if (!newRule.id) {
        newRule.id = `ai-sugg-${Date.now()}`;
    }
    onAddRule(newRule);
    toast.success("Suggested rule has been added!");
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Sparkles className="h-6 w-6 text-blue-500" />
          AI Assistant
        </CardTitle>
        <CardDescription>
          Use AI to analyze your data, get rule recommendations, and more.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">
              <Lightbulb className="mr-2 h-4 w-4" />
              Strategic Analysis
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <PlusCircle className="mr-2 h-4 w-4" />
              Rule Suggestions
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis" className="mt-4">
            <p className="text-sm text-slate-600 mb-4">
              Get high-level insights on potential bottlenecks, skill gaps, and strategic inconsistencies in your data.
            </p>
            <Button onClick={() => onRunAssistant('analysis')} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run Analysis
            </Button>
            {analysisFindings.length > 0 && (
                <div className="mt-4 w-full space-y-2">
                    <h4 className="font-semibold text-slate-800">Analysis Findings:</h4>
                    <ul className="list-disc space-y-2 rounded-lg border border-slate-200 bg-white/50 p-4 pl-8 text-sm text-slate-700">
                        {analysisFindings.map((finding, index) => <li key={index}>{finding}</li>)}
                    </ul>
                </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4">
            <p className="text-sm text-slate-600 mb-4">
                Let the AI scan for common patterns in your data and suggest new rules to improve your configuration.
            </p>
            <Button onClick={() => onRunAssistant('suggestions')} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Get Suggestions
            </Button>
            {ruleSuggestions.length > 0 && (
                <div className="mt-4 w-full space-y-2">
                    <h4 className="font-semibold text-slate-800">Suggested Rules:</h4>
                    <ul className="space-y-2">
                        {ruleSuggestions.map((rule, index) => (
                            <li key={index} className="flex items-center justify-between p-3 bg-white/50 border border-slate-200 rounded-lg">
                                <span className="text-sm text-slate-700">{rule.description}</span>
                                <Button size="sm" variant="outline" onClick={() => handleAddSuggestedRule(rule)}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Add Rule
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
