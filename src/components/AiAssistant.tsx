// src/components/AiAssistant.tsx
"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Lightbulb, Sparkles, Loader2, PlusCircle, Wrench } from 'lucide-react';
import { BusinessRule, Correction, ValidationError } from '@/lib/types';

type AssistantMode = 'analysis' | 'suggestions' | 'correction';

interface AiAssistantProps {
  onRunAssistant: (mode: AssistantMode) => Promise<void>;
  analysisFindings: string[];
  ruleSuggestions: BusinessRule[];
  correctionSuggestions: Correction[];
  validationErrors: ValidationError[];
  onAddRule: (rule: BusinessRule) => void;
  onApplyCorrection: (correction: Correction) => void;
  isLoading: boolean;
}

export function AiAssistant({
  onRunAssistant,
  analysisFindings,
  ruleSuggestions,
  correctionSuggestions,
  validationErrors,
  onAddRule,
  onApplyCorrection,
  isLoading,
}: AiAssistantProps) {

  const handleAddSuggestedRule = (rule: BusinessRule) => {
    const newRule = { ...rule };
    if (!newRule.id) {
        newRule.id = `ai-sugg-${Date.now()}`;
    }
    onAddRule(newRule);
    toast.success("Suggested rule has been added!");
  };

  const getSuggestionForError = (error: ValidationError) => {
    return correctionSuggestions.find(c => c.rowId === error.rowId && c.field === error.field);
  }

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Sparkles className="h-6 w-6 text-blue-500" />
          AI Assistant
        </CardTitle>
        <CardDescription>
          Use AI to analyze your data, get rule recommendations, and fix errors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis"><Lightbulb className="mr-2 h-4 w-4" />Analysis</TabsTrigger>
            <TabsTrigger value="suggestions"><PlusCircle className="mr-2 h-4 w-4" />Suggestions</TabsTrigger>
            <TabsTrigger value="correction"><Wrench className="mr-2 h-4 w-4" />Corrections</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis" className="mt-4">
            <p className="text-sm text-slate-600 mb-4">Get high-level insights on potential bottlenecks and strategic inconsistencies.</p>
            <Button onClick={() => onRunAssistant('analysis')} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Run Analysis
            </Button>
            {analysisFindings.length > 0 && (
              <div className="mt-4 w-full space-y-2">
                <h4 className="font-semibold text-slate-800">Analysis Findings:</h4>
                <ul className="list-disc space-y-2 rounded-lg border bg-white/50 p-4 pl-8 text-sm text-slate-700">
                  {analysisFindings.map((finding, index) => <li key={index}>{finding}</li>)}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4">
            <p className="text-sm text-slate-600 mb-4">Let the AI scan for patterns and suggest new rules to improve your configuration.</p>
            <Button onClick={() => onRunAssistant('suggestions')} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Get Suggestions
            </Button>
            {ruleSuggestions.length > 0 && (
              <div className="mt-4 w-full space-y-2">
                <h4 className="font-semibold text-slate-800">Suggested Rules:</h4>
                <ul className="space-y-2">
                  {ruleSuggestions.map((rule, index) => (
                    <li key={index} className="flex items-center justify-between p-3 bg-white/50 border rounded-lg">
                      <span className="text-sm text-slate-700">{rule.description}</span>
                      <Button size="sm" variant="outline" onClick={() => handleAddSuggestedRule(rule)}><PlusCircle className="mr-2 h-4 w-4"/> Add</Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="correction" className="mt-4">
            <p className="text-sm text-slate-600 mb-4">Find validation errors in your data and let the AI suggest how to fix them.</p>
            <Button onClick={() => onRunAssistant('correction')} disabled={isLoading || validationErrors.length === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Suggest Fixes
            </Button>
            {validationErrors.length > 0 ? (
                <div className="mt-4 w-full space-y-2">
                    <h4 className="font-semibold text-slate-800">Detected Errors:</h4>
                    <ul className="space-y-2">
                        {validationErrors.map((error, index) => {
                            const suggestion = getSuggestionForError(error);
                            return (
                                <li key={index} className="p-3 bg-white/50 border rounded-lg">
                                    <p className="text-sm font-medium text-red-600">{error.message}</p>
                                    <p className="text-xs text-slate-500">In row <span className="font-semibold">{error.rowId}</span>, field <span className="font-semibold">{error.field}</span></p>
                                    {suggestion && (
                                        <div className="mt-2 flex items-center justify-between p-3 bg-green-50 border-green-200 rounded-md">
                                            <div>
                                                <p className="text-sm font-medium text-green-800">Suggestion: {suggestion.reason}</p>
                                                <p className="text-xs text-slate-600">Change value to: <code className="bg-slate-200 px-1 py-0.5 rounded">{JSON.stringify(suggestion.newValue)}</code></p>
                                            </div>
                                            <Button size="sm" variant="outline" className="border-green-300" onClick={() => onApplyCorrection(suggestion)}>Apply Fix</Button>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ) : (
                <p className="text-sm text-slate-500 mt-4">No validation errors found!</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
