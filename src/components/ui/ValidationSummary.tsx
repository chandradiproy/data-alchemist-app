// src/components/ui/ValidationSummary.tsx
import { ValidationError } from '@/lib/types';
import { AlertTriangle, CircleCheck, ShieldAlert, ShieldCheck } from 'lucide-react';

interface ValidationSummaryProps {
  errors: ValidationError[];
}

export function ValidationSummary({ errors }: ValidationSummaryProps) {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const totalIssues = errorCount + warningCount;

  if (totalIssues === 0 && errors.length > 0) {
    // This case handles when validation has run but found no issues.
     return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <ShieldCheck className="h-6 w-6 text-green-600" />
            <div>
                <p className="font-semibold text-green-800">Validation Passed</p>
                <p className="text-sm text-green-700">All checks are clear.</p>
            </div>
        </div>
    );
  }
  
  if (errors.length === 0) {
      // Before validation has run for the first time
      return null;
  }

  return (
    <div className="flex items-center gap-6 p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">{errorCount}</span>
            <span className="text-sm text-slate-600">Errors</span>
        </div>
        <div className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-semibold">{warningCount}</span>
             <span className="text-sm text-slate-600">Warnings</span>
        </div>
    </div>
  );
}
