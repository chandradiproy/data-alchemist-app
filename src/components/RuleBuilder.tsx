// src/components/RuleBuilder.tsx
"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { AppData, BusinessRule, CoRunRule, SlotRestrictionRule, LoadLimitRule, PhaseWindowRule, Rule } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PlusCircle, Trash2, Wand2, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RuleBuilderProps {
  appData: AppData;
  onRulesChange: (rules: BusinessRule[]) => void;
}

const generateRuleDescription = (rule: BusinessRule): string => {
    // This function is now more robust to handle variations from the AI
    switch (rule.type) {
        case 'coRun':
            const taskIds = (rule as CoRunRule).taskIds || (rule as any).tasks || [];
            return `Tasks ${taskIds.join(', ')} must run together.`;
        case 'slotRestriction':
        case 'slot' as any: // Handle the AI's incorrect type
            const sr = rule as SlotRestrictionRule;
            const groupTag = sr.groupTag || (rule as any).group;
            const minSlots = sr.minCommonSlots || (rule as any).minCount;
            return `${sr.targetGroup || 'Group'} '${groupTag}' must have at least ${minSlots} common slots.`;
        case 'loadLimit':
            const ll = rule as LoadLimitRule;
            return `Workers in group '${ll.workerGroup}' have a load limit of ${ll.maxSlotsPerPhase} per phase.`;
        case 'phaseWindow':
            const pw = rule as PhaseWindowRule;
            return `Task '${pw.taskId}' can only run in phases: ${pw.allowedPhases.join(', ')}.`;
        default:
            return "A new rule has been created.";
    }
};


export function RuleBuilder({ appData, onRulesChange }: RuleBuilderProps) {
  const [naturalLanguageRule, setNaturalLanguageRule] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State for manual rule inputs
  const [newCoRunTasks, setNewCoRunTasks] = useState('');
  const [newSlotRestriction, setNewSlotRestriction] = useState({ targetGroup: 'WorkerGroup' as 'ClientGroup' | 'WorkerGroup', groupTag: '', minCommonSlots: '' });
  const [newLoadLimit, setNewLoadLimit] = useState({ workerGroup: '', maxSlotsPerPhase: '' });
  const [newPhaseWindow, setNewPhaseWindow] = useState({ taskId: '', allowedPhases: '' });


  const handleAiRuleCreation = async () => {
    if (!naturalLanguageRule) {
      toast.error("Please enter a rule description.");
      return;
    }
    setIsLoading(true);
    try {
        // --- FIX: A much more detailed prompt for the AI ---
        const prompt = `
            You are an intelligent rule-parsing assistant. Convert the user's natural language rule into a structured JSON object.
            You MUST use one of the following schemas. Do NOT invent new property names.

            Rule Type Schemas:
            1. Co-run Rule: For tasks that must run together.
               Schema: { "type": "coRun", "taskIds": ["T1", "T2"] }

            2. Slot Restriction Rule: To ensure a group has common available slots.
               Schema: { "type": "slotRestriction", "targetGroup": "WorkerGroup", "groupTag": "GroupA", "minCommonSlots": 1 }
               Note: 'targetGroup' should be 'WorkerGroup' if the rule mentions workers, otherwise assume 'WorkerGroup'.

            3. Load Limit Rule: To limit the workload for a worker group.
               Schema: { "type": "loadLimit", "workerGroup": "GroupB", "maxSlotsPerPhase": 2 }

            4. Phase Window Rule: To restrict a task to specific phases.
               Schema: { "type": "phaseWindow", "taskId": "T5", "allowedPhases": [1, 2, 3] }

            User's rule: "${naturalLanguageRule}"

            Generate ONLY the JSON object for the rule. Do not include any other text or explanations.
        `;

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        if (response.status === 429) toast.error("Too many requests. Please wait.");
        else if (response.status >= 500) toast.error("The AI service is currently unavailable.");
        else toast.error("An unexpected error occurred.");
        return;
      }

      const data = await response.json();
      try {
        const newRule = JSON.parse(data.text) as BusinessRule;
        
        newRule.description = generateRuleDescription(newRule);
        newRule.id = `ai-${Date.now()}`;
        
        onRulesChange([...appData.rules, newRule]);
        setNaturalLanguageRule('');
        toast.success("AI-powered rule added successfully!");
      } catch (parseError) {
        toast.error("AI returned an invalid rule format. Try rephrasing.");
      }
    } catch (error) {
      toast.error("Network error. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRule = (rule: BusinessRule) => {
      onRulesChange([...appData.rules, rule]);
  }

  // ... (rest of the manual rule creation functions remain the same)
  const handleAddCoRunRule = () => {
    const taskIds = newCoRunTasks.split(',').map(t => t.trim()).filter(Boolean);
    if (taskIds.length < 2) {
      toast.error("Please enter at least two comma-separated Task IDs.");
      return;
    }
    handleAddRule({
      id: `corun-${Date.now()}`,
      type: 'coRun',
      taskIds,
      description: `Tasks ${taskIds.join(', ')} must run together.`,
    });
    setNewCoRunTasks('');
  };

  const handleAddSlotRestrictionRule = () => {
    const { targetGroup, groupTag, minCommonSlots } = newSlotRestriction;
    if (!groupTag || !minCommonSlots || parseInt(minCommonSlots, 10) < 1) {
        toast.error("Please provide a valid group tag and a minimum number of common slots (> 0).");
        return;
    }
    handleAddRule({
        id: `slot-${Date.now()}`,
        type: 'slotRestriction',
        targetGroup,
        groupTag,
        minCommonSlots: parseInt(minCommonSlots, 10),
        description: `${targetGroup} '${groupTag}' must have at least ${minCommonSlots} common slots.`
    });
    setNewSlotRestriction({ targetGroup: 'WorkerGroup', groupTag: '', minCommonSlots: '' });
  };

  const handleAddLoadLimitRule = () => {
      const { workerGroup, maxSlotsPerPhase } = newLoadLimit;
      if (!workerGroup || !maxSlotsPerPhase || parseInt(maxSlotsPerPhase, 10) < 1) {
          toast.error("Please provide a worker group and a valid max load per phase (> 0).");
          return;
      }
      handleAddRule({
          id: `load-${Date.now()}`,
          type: 'loadLimit',
          workerGroup,
          maxSlotsPerPhase: parseInt(maxSlotsPerPhase, 10),
          description: `Workers in group '${workerGroup}' have a load limit of ${maxSlotsPerPhase} per phase.`
      });
      setNewLoadLimit({ workerGroup: '', maxSlotsPerPhase: '' });
  };

  const handleAddPhaseWindowRule = () => {
      const { taskId, allowedPhases } = newPhaseWindow;
      const phases = allowedPhases.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p > 0);
      if (!taskId || phases.length === 0) {
          toast.error("Please provide a Task ID and at least one valid, comma-separated phase number.");
          return;
      }
      handleAddRule({
          id: `phase-${Date.now()}`,
          type: 'phaseWindow',
          taskId,
          allowedPhases: phases,
          description: `Task '${taskId}' can only run in phases: ${phases.join(', ')}.`
      });
      setNewPhaseWindow({ taskId: '', allowedPhases: '' });
  };

  const handleRemoveRule = (ruleId: string) => {
    onRulesChange(appData.rules.filter(rule => rule.id !== ruleId));
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Business Rules</CardTitle>
        <CardDescription>Define logic manually or use AI to convert natural language into rules.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Rule Creator */}
        <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <label htmlFor="aiRuleText" className="text-sm font-medium text-slate-800 flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600" /> Create a rule with AI
          </label>
          <p className="text-xs text-slate-500 mb-2">e.g., "Tasks T12 and T14 must run at the same time."</p>
          <div className="flex items-center gap-2">
            <Input id="aiRuleText" placeholder="Type a rule in plain English..." value={naturalLanguageRule} onChange={(e) => setNaturalLanguageRule(e.target.value)} disabled={isLoading} onKeyDown={(e) => e.key === 'Enter' && handleAiRuleCreation()} />
            <Button onClick={handleAiRuleCreation} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>

        {/* Rule Display */}
        <div className="space-y-2">
          <h4 className="font-medium">Active Rules</h4>
          {appData.rules.length === 0 ? <p className="text-sm text-slate-500">No rules defined yet.</p> : (
            <ul className="space-y-2">
              {appData.rules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md border">
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
            <AccordionItem value="co-run">
              <AccordionTrigger>Co-run Rule</AccordionTrigger>
              <AccordionContent className="p-4 border-t">
                <p className="text-xs text-slate-500 mb-2">Specify Task IDs that must run concurrently.</p>
                <div className="flex items-center gap-2">
                  <Input placeholder="e.g., T1, T5, T12" value={newCoRunTasks} onChange={(e) => setNewCoRunTasks(e.target.value)} />
                  <Button onClick={handleAddCoRunRule}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="slot-restriction">
              <AccordionTrigger>Slot Restriction Rule</AccordionTrigger>
              <AccordionContent className="p-4 border-t space-y-3">
                 <p className="text-xs text-slate-500">Ensure entities in a group have a minimum number of common available slots.</p>
                 <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Select value={newSlotRestriction.targetGroup} onValuechange={(value: 'ClientGroup' | 'WorkerGroup') => setNewSlotRestriction({...newSlotRestriction, targetGroup: value})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ClientGroup">Client Group</SelectItem>
                            <SelectItem value="WorkerGroup">Worker Group</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input placeholder="Group Tag (e.g., 'Sales')" value={newSlotRestriction.groupTag} onChange={(e) => setNewSlotRestriction({...newSlotRestriction, groupTag: e.target.value})} />
                    <Input type="number" placeholder="Min Common Slots" value={newSlotRestriction.minCommonSlots} onChange={(e) => setNewSlotRestriction({...newSlotRestriction, minCommonSlots: e.target.value})} />
                    <Button onClick={handleAddSlotRestrictionRule} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                 </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="load-limit">
              <AccordionTrigger>Load Limit Rule</AccordionTrigger>
              <AccordionContent className="p-4 border-t space-y-3">
                <p className="text-xs text-slate-500">Set a maximum workload for a group of workers in any given phase.</p>
                <div className="flex items-center gap-2">
                    <Input placeholder="Worker Group Tag" value={newLoadLimit.workerGroup} onChange={(e) => setNewLoadLimit({...newLoadLimit, workerGroup: e.target.value})}/>
                    <Input type="number" placeholder="Max Slots Per Phase" value={newLoadLimit.maxSlotsPerPhase} onChange={(e) => setNewLoadLimit({...newLoadLimit, maxSlotsPerPhase: e.target.value})}/>
                    <Button onClick={handleAddLoadLimitRule}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="phase-window">
              <AccordionTrigger>Phase Window Rule</AccordionTrigger>
              <AccordionContent className="p-4 border-t space-y-3">
                <p className="text-xs text-slate-500">Restrict a specific task to a list of allowed phases.</p>
                <div className="flex items-center gap-2">
                    <Input placeholder="Task ID (e.g., T20)" value={newPhaseWindow.taskId} onChange={(e) => setNewPhaseWindow({...newPhaseWindow, taskId: e.target.value})}/>
                    <Input placeholder="Allowed Phases (e.g., 1, 3, 5)" value={newPhaseWindow.allowedPhases} onChange={(e) => setNewPhaseWindow({...newPhaseWindow, allowedPhases: e.target.value})}/>
                    <Button onClick={handleAddPhaseWindowRule}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
