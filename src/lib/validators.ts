// src/lib/validators.ts

import { AppData, Client, Task, ValidationError, Worker, CoRunRule } from "./types";

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

  // **NEW**: Rule-based validations
  errors.push(...validateRules(data));

  return errors;
}

// --- NEW Validation Function for Business Rules ---

/**
 * Validates data against the defined business rules.
 * @param {AppData} data - The entire application's data state.
 * @returns {ValidationError[]} An array of validation errors.
 */
function validateRules(data: AppData): ValidationError[] {
    const errors: ValidationError[] = [];
    const { clients, rules } = data;

    // 1. Check for Co-run rule violations
    const coRunRules = rules.filter(rule => rule.type === 'coRun') as CoRunRule[];

    coRunRules.forEach(rule => {
        clients.forEach(client => {
            const requestedTasks = new Set(client.RequestedTaskIDs);
            
            // Count how many of the rule's tasks this client has requested
            const intersection = rule.taskIds.filter(taskId => requestedTasks.has(taskId));

            // If the client requested some, but not all, of the co-run tasks, it's a violation.
            if (intersection.length > 0 && intersection.length < rule.taskIds.length) {
                errors.push({
                    rowId: client.ClientID,
                    field: 'RequestedTaskIDs',
                    message: `Rule violation: This client requested some, but not all, of the required co-run tasks: ${rule.taskIds.join(', ')}.`,
                    severity: 'warning',
                });
            }
        });
    });

    // More rule validations can be added here...

    return errors;
}


// --- Existing Validation Functions ---

/**
 * Validates client data.
 * @param {Client[]} clients - Array of clients.
 * @param {Task[]} tasks - Array of tasks, for cross-referencing.
 * @returns {ValidationError[]} An array of validation errors.
 */
function validateClients(clients: Client[], tasks: Task[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const taskIds = new Set(tasks.map(t => t.TaskID));

  clients.forEach(client => {
    // Check for out-of-range PriorityLevel
    if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
      errors.push({
        rowId: client.ClientID,
        field: 'PriorityLevel',
        message: `PriorityLevel must be between 1 and 5, but is ${client.PriorityLevel}.`,
        severity: 'error',
      });
    }

    // Check for broken JSON in AttributesJSON
    if (client.AttributesJSON && (client.AttributesJSON as any).error) {
        errors.push({
            rowId: client.ClientID,
            field: 'AttributesJSON',
            message: 'The JSON format is invalid.',
            severity: 'error',
        });
    }

    // Check if requested tasks exist
    if (Array.isArray(client.RequestedTaskIDs)) {
        client.RequestedTaskIDs.forEach(reqTaskId => {
            if (reqTaskId && !taskIds.has(reqTaskId)) {
                errors.push({
                    rowId: client.ClientID,
                    field: 'RequestedTaskIDs',
                    message: `Requested TaskID "${reqTaskId}" does not exist in the tasks list.`,
                    severity: 'warning',
                });
            }
        });
    }
  });

  return errors;
}

/**
 * Validates worker data.
 * @param {Worker[]} workers - Array of workers.
 * @returns {ValidationError[]} An array of validation errors.
 */
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
        if (worker.Skills.length === 0) {
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

/**
 * Validates task data.
 * @param {Task[]} tasks - Array of tasks.
 * @returns {ValidationError[]} An array of validation errors.
 */
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

/**
 * Validates that every required skill for a task is provided by at least one worker.
 * @param {Task[]} tasks - Array of tasks.
 * @param {Worker[]} workers - Array of workers.
 * @returns {ValidationError[]} An array of validation errors.
 */
function validateSkillCoverage(tasks: Task[], workers: Worker[]): ValidationError[] {
    const errors: ValidationError[] = [];
    if (workers.length === 0 || tasks.length === 0) return [];

    const allWorkerSkills = new Set(workers.flatMap(w => w.Skills));

    tasks.forEach(task => {
        if (Array.isArray(task.RequiredSkills)) {
            task.RequiredSkills.forEach(requiredSkill => {
                if (!allWorkerSkills.has(requiredSkill)) {
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

/**
 * Checks for duplicate IDs across all entities.
 * @param {AppData} data - The entire application's data state.
 * @returns {ValidationError[]} An array of validation errors.
 */
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
