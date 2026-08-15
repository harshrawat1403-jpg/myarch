export class CoordinatorNotFoundError extends Error {
  constructor() {
    super("Coordinator not found");
    this.name = "CoordinatorNotFoundError";
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account with email "${email}" already exists`);
    this.name = "DuplicateEmailError";
  }
}

export class BatchNotFoundError extends Error {
  constructor() {
    super("Batch not found");
    this.name = "BatchNotFoundError";
  }
}

export class CoordinatorAlreadyActiveError extends Error {
  constructor() {
    super("Coordinator is already active");
    this.name = "CoordinatorAlreadyActiveError";
  }
}

export class CoordinatorAlreadyDisabledError extends Error {
  constructor() {
    super("Coordinator is already disabled");
    this.name = "CoordinatorAlreadyDisabledError";
  }
}

export class BatchAlreadyAssignedError extends Error {
  constructor() {
    super("This batch is already assigned to the coordinator");
    this.name = "BatchAlreadyAssignedError";
  }
}

export class BatchNotAssignedError extends Error {
  constructor() {
    super("This batch is not assigned to the coordinator");
    this.name = "BatchNotAssignedError";
  }
}

/** MYARCH Phase 1 — roadmap §2.1: "Maximum ACTIVE Coordinators = 2," enforced server-side. */
export class MaxActiveCoordinatorsError extends Error {
  constructor() {
    super("MYARCH allows a maximum of 2 active Coordinators at a time");
    this.name = "MaxActiveCoordinatorsError";
  }
}

/** MYARCH Phase 1 — UpdateCoordinatorPermissionsUseCase rejects any key outside COORDINATOR_PERMISSION_KEYS. */
export class InvalidCoordinatorPermissionError extends Error {
  constructor(key: string) {
    super(`"${key}" is not a recognized coordinator permission`);
    this.name = "InvalidCoordinatorPermissionError";
  }
}

/** MYARCH Maintenance functional hierarchy — at most one active Coordinator may hold each MaintenanceCoordinatorRole value at a time. */
export class MaxActiveMaintenanceRoleError extends Error {
  constructor(role: "MAINTENANCE_SECRETARY" | "MAINTENANCE_COORDINATOR") {
    const label = role === "MAINTENANCE_SECRETARY" ? "Maintenance Secretary" : "Maintenance Coordinator";
    super(`MYARCH allows only one active ${label} at a time`);
    this.name = "MaxActiveMaintenanceRoleError";
  }
}

/** SetCoordinatorMaintenanceRoleUseCase — the target must be an active Coordinator to hold a Maintenance functional role. */
export class InactiveCoordinatorError extends Error {
  constructor() {
    super("Only an active Coordinator can be assigned a Maintenance functional role");
    this.name = "InactiveCoordinatorError";
  }
}

/** UpdateMaintenanceCoordinatorPermissionsUseCase — no Coordinator is currently designated MAINTENANCE_COORDINATOR. */
export class NoMaintenanceCoordinatorDesignatedError extends Error {
  constructor() {
    super("No Maintenance Coordinator is currently designated");
    this.name = "NoMaintenanceCoordinatorDesignatedError";
  }
}
