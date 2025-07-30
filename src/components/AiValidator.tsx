// src/components/AiValidator.tsx
"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';

interface AiValidatorProps {
  // A function that will be called to trigger the AI analysis.
  // It's expected to return a promise that resolves with an array of strings (the AI's findings).
  onValidate: () => Promise<string[]>;
}

export function AiValidator({ onValidate }: AiValidatorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiFindings, setAiFindings] = useState<string[]>([]);

  const handleAiValidation = async () => {
    setIsLoading(true);
    setAiFindings([]); // Clear previous results
    try {
      // Call the parent function to handle the API call
      const findings = await onValidate();
      setAiFindings(findings);
    } catch (error) {
      // The parent component is expected to handle toast notifications for errors.
      console.error("AI Validation trigger failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          AI-Powered Strategic Analysis
        </CardTitle>
        <CardDescription>
          Let AI analyze your entire dataset for strategic insights, inconsistencies, or potential problems that standard validators might miss.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4">
          <Button onClick={handleAiValidation} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Dataset...
              </>
            ) : (
              'Run AI Analysis'
            )}
          </Button>
          {aiFindings.length > 0 && (
            <div className="mt-4 w-full space-y-2">
              <h4 className="font-semibold text-slate-800">AI Findings:</h4>
              <ul className="list-disc space-y-2 rounded-lg border border-slate-200 bg-white/50 p-4 pl-8 text-sm text-slate-700">
                {aiFindings.map((finding, index) => (
                  <li key={index}>{finding}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
