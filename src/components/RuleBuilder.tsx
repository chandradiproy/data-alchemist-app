// src/components/RuleBuilder.tsx
"use client";

import React, { useState } from 'react';
import { AppData, BusinessRule, CoRunRule, LoadLimitRule, PhaseWindowRule, SlotRestrictionRule } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PlusCircle, Trash2, Wand2, Loader2 } from 'lucide-react';
import { getAiResponse } from '../lib/ai';
import { useToast } from './ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface RuleBuilderProps {
  appData: AppData;
  onRulesChange: (rules: BusinessRule[]) => void;
}

export function RuleBuilder({ appData, onRulesChange }: RuleBuilderProps) {
  const { toast } = useToast();
  const [aiRuleText, setAiRuleText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // State for manual rule inputs
  const [coRunTasks, setCoRunTasks] = useState('');
  const [loadLimitGroup, setLoadLimitGroup] = useState('');
  const [loadLimitMax, setLoadLimitMax] = useState('');
  const [phaseWindowTask, setPhaseWindowTask] = useState('');
  const [phaseWindowPhases, setPhaseWindowPhases] = useState('');
  const [slotRestrictionGroup, setSlotRestrictionGroup] = useState('');
  const [slotRestrictionMin, setSlotRestrictionMin] = useState('');


  const createRulePrompt = (naturalLanguageRule: string) => {
    const dataSummary = {
      clientColumns: Object.keys(appData.clients[0] || {}),
      workerColumns: Object.keys(appData.workers[0] || {}),
      taskColumns: Object.keys(appData.tasks[0] || {}),
      existingTaskIds: appData.tasks.map(t => t.TaskID).slice(0, 10),
    };

    return `
      You are an intelligent rule-parsing assistant. Your task is to convert a natural language rule into a structured JSON object.
      The user will provide a rule in plain English. You must analyze it and create a JSON object that represents this rule.
      The JSON object must conform to one of the following types: 'coRun', 'slotRestriction', 'loadLimit', 'phaseWindow'.

      Here is the context of the available data:
      - Clients have columns: ${dataSummary.clientColumns.join(', ')}
      - Workers have columns: ${dataSummary.workerColumns.join(', ')}
      - Tasks have columns: ${dataSummary.taskColumns.join(', ')}
      - Some available Task IDs are: ${dataSummary.existingTaskIds.join(', ')}

      Rule Type Schemas:
      1. CoRunRule: { "type": "coRun", "taskIds": ["T1", "T2"], "description": "User-friendly description" }
      2. LoadLimitRule: { "type": "loadLimit", "workerGroup": "GroupA", "maxSlotsPerPhase": 2, "description": "..." }
      3. PhaseWindowRule: { "type": "phaseWindow", "taskId": "T15", "allowedPhases": [1, 2, 3], "description": "..." }
      4. SlotRestrictionRule: { "type": "slotRestriction", "groupTag": "GroupA", "minCommonSlots": 2, "description": "..." }

      User's rule: "${naturalLanguageRule}"

      Based on the user's rule, generate ONLY the JSON object for the rule. Do not include any other text or explanations. If the rule is ambiguous or cannot be mapped to a known type, return an object like: { "error": "Rule is ambiguous or not supported." }
    `;
  };

  const handleAiRuleCreation = async () => {
    if (!aiRuleText) return;
    setIsAiLoading(true);
    try {
        const prompt = createRulePrompt(aiRuleText);
        const response = await getAiResponse(prompt);
        
        const jsonString = response.match(/\{.*\}/s)?.[0];
        if (!jsonString) {
            throw new Error("AI did not return a valid JSON object.");
        }

        let newRule = JSON.parse(jsonString) as BusinessRule | { error: string };

        if ('error' in newRule) {
            toast({ variant: "destructive", title: "AI Error", description: newRule.error });
        } else {
            newRule.id = `ai-${Date.now()}`;
            onRulesChange([...appData.rules, newRule]);
            setAiRuleText('');
            toast({ title: "Rule Created", description: "The AI has successfully created a new rule." });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create rule with AI.";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleAddRule = (rule: BusinessRule) => {
    onRulesChange([...appData.rules, rule]);
  };
  
  const handleRemoveRule = (ruleId: string) => {
    onRulesChange(appData.rules.filter(rule => rule.id !== ruleId));
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Business Rules</CardTitle>
        <CardDescription>
          Define business logic manually or use AI to convert natural language into rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Rule Creator */}
        <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
            <label htmlFor="aiRuleText" className="text-sm font-medium text-slate-800 flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-purple-600" />
                Create a rule with AI
            </label>
            <p className="text-xs text-slate-500 mb-2">
                Example: "Make sure tasks T12 and T14 always run at the same time."
            </p>
            <div className="flex items-center gap-2">
                <Input 
                    id="aiRuleText"
                    placeholder="Type a rule in plain English..."
                    value={aiRuleText}
                    onChange={(e) => setAiRuleText(e.target.value)}
                    disabled={isAiLoading}
                />
                <Button onClick={handleAiRuleCreation} disabled={isAiLoading}>
                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
            </div>
        </div>
        
        {/* Rule Display */}
        <div className="space-y-2">
            <h4 className="font-medium">Active Rules</h4>
            {appData.rules.length === 0 ? (
                <p className="text-sm text-slate-500">No rules defined yet.</p>
            ) : (
                <ul className="space-y-2">
                    {appData.rules.map((rule, index) => (
                        <li key={rule.id || index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md border">
                            <span className="text-sm text-slate-800">{rule.description}</span>
                             <Button variant="ghost" size="icon" onClick={() => handleRemoveRule(rule.id)} className="h-7 w-7">
                                <Trash2 className="h-4 w-4 text-slate-500" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>

        {/* Manual Rule Creation Accordion */}
        <div className="space-y-4">
            <h4 className="font-medium">Add Manually</h4>
            <Accordion type="single" collapsible className="w-full">
              {/* Co-Run Rule */}
              <AccordionItem value="item-1">
                <AccordionTrigger>Co-run Tasks</AccordionTrigger>
                <AccordionContent>
                  <div className="p-2 space-y-2">
                    <p className="text-xs text-slate-500">Specify Task IDs that must run concurrently.</p>
                    <div className="flex items-center gap-2">
                      <Input placeholder="e.g., T1, T5, T12" value={coRunTasks} onChange={(e) => setCoRunTasks(e.target.value)} />
                      <Button onClick={() => {
                        const taskIds = coRunTasks.split(',').map(t => t.trim()).filter(Boolean);
                        if (taskIds.length < 2) { toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter at least two Task IDs.' }); return; }
                        handleAddRule({ id: `corun-${Date.now()}`, type: 'coRun', taskIds, description: `Tasks ${taskIds.join(', ')} must run together.` });
                        setCoRunTasks('');
                      }}>Add</Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Load Limit Rule */}
              <AccordionItem value="item-2">
                <AccordionTrigger>Load Limit</AccordionTrigger>
                <AccordionContent>
                  <div className="p-2 space-y-2">
                    <p className="text-xs text-slate-500">Set a max workload for a worker group.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Worker Group (e.g., GroupA)" value={loadLimitGroup} onChange={(e) => setLoadLimitGroup(e.target.value)} />
                      <Input type="number" placeholder="Max Load Per Phase" value={loadLimitMax} onChange={(e) => setLoadLimitMax(e.target.value)} />
                    </div>
                    <Button className="w-full mt-2" onClick={() => {
                      if (!loadLimitGroup || !loadLimitMax) { toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields.' }); return; }
                      const maxSlots = parseInt(loadLimitMax, 10);
                      handleAddRule({ id: `load-${Date.now()}`, type: 'loadLimit', workerGroup: loadLimitGroup, maxSlotsPerPhase: maxSlots, description: `Workers in ${loadLimitGroup} cannot exceed ${maxSlots} slots per phase.` });
                      setLoadLimitGroup(''); setLoadLimitMax('');
                    }}>Add</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Phase Window Rule */}
              <AccordionItem value="item-3">
                <AccordionTrigger>Phase Window</AccordionTrigger>
                <AccordionContent>
                  <div className="p-2 space-y-2">
                    <p className="text-xs text-slate-500">Restrict a task to specific phases.</p>
                     <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Task ID (e.g., T15)" value={phaseWindowTask} onChange={(e) => setPhaseWindowTask(e.target.value)} />
                      <Input placeholder="Allowed Phases (e.g., 1,2,3)" value={phaseWindowPhases} onChange={(e) => setPhaseWindowPhases(e.target.value)} />
                    </div>
                    <Button className="w-full mt-2" onClick={() => {
                      if (!phaseWindowTask || !phaseWindowPhases) { toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields.' }); return; }
                      const phases = phaseWindowPhases.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
                      handleAddRule({ id: `phase-${Date.now()}`, type: 'phaseWindow', taskId: phaseWindowTask, allowedPhases: phases, description: `Task ${phaseWindowTask} must run in phases: ${phases.join(', ')}.` });
                      setPhaseWindowTask(''); setPhaseWindowPhases('');
                    }}>Add</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Slot Restriction Rule */}
              <AccordionItem value="item-4">
                <AccordionTrigger>Slot Restriction</AccordionTrigger>
                <AccordionContent>
                  <div className="p-2 space-y-2">
                    <p className="text-xs text-slate-500">Ensure workers in a group have common availability.</p>
                     <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Worker Group (e.g., GroupB)" value={slotRestrictionGroup} onChange={(e) => setSlotRestrictionGroup(e.target.value)} />
                      <Input type="number" placeholder="Min. Common Slots" value={slotRestrictionMin} onChange={(e) => setSlotRestrictionMin(e.target.value)} />
                    </div>
                    <Button className="w-full mt-2" onClick={() => {
                      if (!slotRestrictionGroup || !slotRestrictionMin) { toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields.' }); return; }
                      const minSlots = parseInt(slotRestrictionMin, 10);
                      handleAddRule({ id: `slot-${Date.now()}`, type: 'slotRestriction', groupTag: slotRestrictionGroup, minCommonSlots: minSlots, description: `Workers in ${slotRestrictionGroup} must have at least ${minSlots} common slots.` });
                      setSlotRestrictionGroup(''); setSlotRestrictionMin('');
                    }}>Add</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
