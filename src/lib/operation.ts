export type OperationKind = "query" | "mutation" | "subscription";
export type OperationDescriptor = { kind: OperationKind; operationName: string };
