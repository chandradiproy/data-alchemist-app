// src/lib/validators.ts

import { AppData, Client, Task, ValidationError, Worker, CoRunRule, SlotRestrictionRule, LoadLimitRule, PhaseWindowRule } from "./types";

/**
 * A wrapper function to run all validation checks.
 * @param {AppData} data - The entire application's data state.
 * @returns {ValidationError[]} An array of all found validation errors.
 */
export function validateAllData(data: AppData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Individual entity validations
  errors.push(...validateClients(data.clients, data.tasks));
  errors.push(...validateWorkers(data.workers));
  errors.push(...validateTasks(data.tasks));

  // Cross-entity validations
  errors.push(...validateSkillCoverage(data.tasks, data.workers));
  errors.push(...validateDuplicateIds(data));

  // Rule-based validations
  errors.push(...validateRules(data));

  return errors;
}


/**
 * Validates data against the defined business rules.
 * @param {AppData} data - The entire application's data state.
 * @returns {ValidationError[]} An array of validation errors.
 */
function validateRules(data: AppData): ValidationError[] {
    const errors: ValidationError[] = [];
    const { clients, workers, tasks, rules } = data;

    rules.forEach(rule => {
        // --- Co-run Rule Validation ---
        if (rule.type === 'coRun') {
            const coRunRule = rule as CoRunRule;
            const taskIds = coRunRule.taskIds || (coRunRule as any).tasks;
            if (Array.isArray(taskIds)) {
                clients.forEach(client => {
                    if (Array.isArray(client.RequestedTaskIDs)) {
                        const requestedTasks = new Set(client.RequestedTaskIDs);
                        const intersection = taskIds.filter(taskId => requestedTasks.has(taskId));
                        if (intersection.length > 0 && intersection.length < taskIds.length) {
                            errors.push({
                                rowId: client.ClientID,
                                field: 'RequestedTaskIDs',
                                message: `Rule Violation: Client requested some, but not all, required co-run tasks: ${taskIds.join(', ')}.`,
                                severity: 'warning',
                            });
                        }
                    }
                });
            }
        }

        // --- Slot Restriction Rule Validation (Now more robust) ---
        if (rule.type === 'slotRestriction' || rule.type === 'slot' as any) {
            const sr = rule as SlotRestrictionRule;
            // Handle variations from AI response
            const targetGroup = sr.targetGroup || 'WorkerGroup'; // Default to WorkerGroup if not specified
            const groupTag = sr.groupTag || (rule as any).group;
            const minCommonSlots = sr.minCommonSlots || (rule as any).minCount;

            if (groupTag && minCommonSlots) {
                const targetEntities = targetGroup === 'ClientGroup' ? clients.filter(c => c.GroupTag === groupTag) : workers.filter(w => w.WorkerGroup === groupTag);
                if (targetEntities.length >= 2) {
                    const allSlots = targetEntities.map(entity => new Set(entity.AvailableSlots || []));
                    const commonSlots = allSlots.reduce((acc, currentSet) => new Set([...acc].filter(slot => currentSet.has(slot))));
                    
                    if (commonSlots.size < minCommonSlots) {
                        targetEntities.forEach(entity => {
                            errors.push({
                                rowId: entity.id,
                                field: 'AvailableSlots',
                                message: `Rule Violation: Group '${groupTag}' has only ${commonSlots.size} common slots, but rule requires ${minCommonSlots}.`,
                                severity: 'warning',
                            });
                        });
                    }
                }
            }
        }

        // --- Load Limit Rule Validation ---
        if (rule.type === 'loadLimit') {
            const ll = rule as LoadLimitRule;
            if (ll.workerGroup && workers.filter(w => w.WorkerGroup === ll.workerGroup).length === 0) {
                console.warn(`LoadLimit rule for group '${ll.workerGroup}' targets no existing workers.`);
            }
        }

        // --- Phase Window Rule Validation ---
        if (rule.type === 'phaseWindow') {
            const pw = rule as PhaseWindowRule;
            const task = tasks.find(t => t.TaskID === pw.taskId);
            if (task && task.PreferredPhases && task.PreferredPhases.length > 0) {
                const intersection = task.PreferredPhases.filter(p => pw.allowedPhases.includes(p));
                if (intersection.length === 0) {
                    errors.push({
                        rowId: task.TaskID,
                        field: 'PreferredPhases',
                        message: `Conflict: Task prefers [${task.PreferredPhases.join(', ')}] but rule restricts it to [${pw.allowedPhases.join(', ')}].`,
                        severity: 'error',
                    });
                }
            }
        }
    });

    return errors;
}


// --- Existing Validation Functions ---
function validateClients(clients: Client[], tasks: Task[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const taskIds = new Set(tasks.map(t => t.TaskID));

  clients.forEach(client => {
    if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
      errors.push({
        rowId: client.ClientID,
        field: 'PriorityLevel',
        message: `PriorityLevel must be between 1 and 5, but is ${client.PriorityLevel}.`,
        severity: 'error',
      });
    }

    if (client.AttributesJSON && (client.AttributesJSON as any).error) {
        errors.push({
            rowId: client.ClientID,
            field: 'AttributesJSON',
            message: 'The JSON format is invalid.',
            severity: 'error',
        });
    }

    if (Array.isArray(client.RequestedTaskIDs)) {
        client.RequestedTaskIDs.forEach(reqTaskId => {
            if (reqTaskId && !taskIds.has(reqTaskId)) {
                errors.push({
                    rowId: client.ClientID,
                    field: 'RequestedTaskIDs',
                    message: `Requested TaskID "${reqTaskId}" does not exist.`,
                    severity: 'warning',
                });
            }
        });
    }
  });

  return errors;
}

function validateWorkers(workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    workers.forEach(worker => {
        if (!worker.WorkerName) {
            errors.push({
                rowId: worker.WorkerID,
                field: 'WorkerName',
                message: 'WorkerName cannot be empty.',
                severity: 'error',
            });
        }
        if (!worker.Skills || worker.Skills.length === 0) {
            errors.push({
                rowId: worker.WorkerID,
                field: 'Skills',
                message: 'Worker must have at least one skill.',
                severity: 'warning',
            });
        }
    });
    return errors;
}

function validateTasks(tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    tasks.forEach(task => {
        if (task.Duration < 1) {
            errors.push({
                rowId: task.TaskID,
                field: 'Duration',
                message: `Duration must be at least 1, but is ${task.Duration}.`,
                severity: 'error',
            });
        }
    });
    return errors;
}

function validateSkillCoverage(tasks: Task[], workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    if (workers.length === 0 || tasks.length === 0) return [];

    const allWorkerSkills = new Set(workers.flatMap(w => w.Skills));

    tasks.forEach(task => {
        if (Array.isArray(task.RequiredSkills)) {
            task.RequiredSkills.forEach(requiredSkill => {
                if (requiredSkill && !allWorkerSkills.has(requiredSkill)) {
                    errors.push({
                        rowId: task.TaskID,
                        field: 'RequiredSkills',
                        message: `No worker has the required skill: "${requiredSkill}".`,
                        severity: 'error',
                    });
                }
            });
        }
    });

    return errors;
}

function validateDuplicateIds(data: AppData): ValidationError[] {
    const errors: ValidationError[] = [];
    const clientIds = new Set<string>();
    const workerIds = new Set<string>();
    const taskIds = new Set<string>();

    data.clients.forEach(c => {
        if (clientIds.has(c.ClientID)) {
            errors.push({ rowId: c.ClientID, field: 'ClientID', message: `Duplicate ClientID "${c.ClientID}" found.`, severity: 'error' });
        }
        clientIds.add(c.ClientID);
    });

    data.workers.forEach(w => {
        if (workerIds.has(w.WorkerID)) {
            errors.push({ rowId: w.WorkerID, field: 'WorkerID', message: `Duplicate WorkerID "${w.WorkerID}" found.`, severity: 'error' });
        }
        workerIds.add(w.WorkerID);
    });

    data.tasks.forEach(t => {
        if (taskIds.has(t.TaskID)) {
            errors.push({ rowId: t.TaskID, field: 'TaskID', message: `Duplicate TaskID "${t.TaskID}" found.`, severity: 'error' });
        }
        taskIds.add(t.TaskID);
    });

    return errors;
}
