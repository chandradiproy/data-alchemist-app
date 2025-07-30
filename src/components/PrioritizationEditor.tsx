// src/components/PrioritizationEditor.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

// Define the criteria that can be prioritized
const prioritizationCriteria = [
    { id: 'PriorityLevel', label: 'Client Priority', description: 'How much to prioritize tasks for high-priority clients.' },
    { id: 'RequestedTaskIds', label: 'Request Fulfillment', description: 'How important it is to complete all requested tasks.' },
    { id: 'Fairness', label: 'Workload Fairness', description: 'How evenly to distribute tasks among workers.' },
];

interface PrioritizationEditorProps {
    priorities: Record<string, number>;
    onPrioritiesChange: (priorities: Record<string, number>) => void;
}

export function PrioritizationEditor({ priorities, onPrioritiesChange }: PrioritizationEditorProps) {

    const handleSliderChange = (id: string, value: number[]) => {
        onPrioritiesChange({
            ...priorities,
            [id]: value[0],
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Prioritization & Weights</CardTitle>
                <CardDescription>
                    Assign relative importance to different allocation goals.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                {prioritizationCriteria.map(criterion => (
                    <div key={criterion.id} className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <Label htmlFor={criterion.id} className="text-base font-medium">{criterion.label}</Label>
                            <span className="text-sm font-bold text-blue-600 w-12 text-center">
                                {priorities[criterion.id] || 50}
                            </span>
                        </div>
                         <p className="text-xs text-slate-500 -mt-1">{criterion.description}</p>
                        <Slider
                            id={criterion.id}
                            min={0}
                            max={100}
                            step={1}
                            value={[priorities[criterion.id] || 50]}
                            onValueChange={(value) => handleSliderChange(criterion.id, value)}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
