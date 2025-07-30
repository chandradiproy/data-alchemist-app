// src/components/ui/FileUploadCard.tsx
"use client";

import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, Loader2, Users, Briefcase, ListChecks } from 'lucide-react';
import { EntityType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface FileUploadCardProps {
  entityType: EntityType;
  onFileUpload: (file: File, entityType: EntityType) => void;
  onFileClear: (entityType: EntityType) => void;
  fileData: any[];
  isLoading: boolean;
}

const entityDetails = {
    clients: {
        title: "Clients Data",
        icon: <Users className="h-8 w-8 text-blue-500" />,
        color: "blue"
    },
    workers: {
        title: "Workers Data",
        icon: <Briefcase className="h-8 w-8 text-green-500" />,
        color: "green"
    },
    tasks: {
        title: "Tasks Data",
        icon: <ListChecks className="h-8 w-8 text-purple-500" />,
        color: "purple"
    }
}

export function FileUploadCard({ entityType, onFileUpload, onFileClear, fileData, isLoading }: FileUploadCardProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const details = entityDetails[entityType];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileUpload(file, entityType);
    }
  };

  const handleClear = () => {
    setFileName(null);
    onFileClear(entityType);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleCardClick = () => {
    if (!fileName) {
      inputRef.current?.click();
    }
  };
  
  const hasData = fileData.length > 0;

  return (
    <div className={cn(
        "border-2 border-dashed rounded-xl p-6 transition-all duration-300 ease-in-out flex flex-col justify-between h-full",
        `border-${details.color}-200 bg-${details.color}-50/50`,
        { 'hover:border-blue-500 hover:bg-blue-50 cursor-pointer': !hasData },
        { 'border-solid': hasData },
        { 'bg-slate-100 animate-pulse': isLoading }
    )}
    onClick={handleCardClick}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        disabled={isLoading}
      />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
            {details.icon}
            <h3 className="text-lg font-semibold text-slate-700">{details.title}</h3>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />}
      </div>

      {!hasData ? (
        <div className="text-center flex-grow flex flex-col items-center justify-center">
            <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">
                Click to browse or drag & drop
            </p>
            <p className="text-xs text-slate-400 mt-1">
                CSV or XLSX file
            </p>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center">
            <div className="w-full bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-5 w-5 text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate" title={fileName || ""}>
                        {fileName}
                    </span>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleClear(); }} className="h-7 w-7 flex-shrink-0">
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">{fileData.length} records loaded.</p>
        </div>
      )}
    </div>
  );
}
