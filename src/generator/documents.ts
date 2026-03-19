import type { Types } from "@graphql-codegen/plugin-helpers";
import { sortBy } from "es-toolkit/array";
import type {
  FragmentDefinitionNode,
  GraphQLEnumType,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode,
} from "graphql";
import { Kind, isEnumType, visit } from "graphql";

import { directiveNames } from "../directives/index";

/**
 * Collects non-introspection enum types from the schema.

 * @param schema GraphQL schema to inspect.
 * @returns Enum types sorted by name.
 */
export function getEnumTypes(schema: GraphQLSchema): GraphQLEnumType[] {
  const enumTypes = Object.values(schema.getTypeMap()).filter(
    (type): type is GraphQLEnumType => isEnumType(type) && !type.name.startsWith("__"),
  );

  return sortBy(enumTypes, ["name"]);
}

/**
 * Looks up an enum type by name.

 * @param schema GraphQL schema to inspect.
 * @param enumName Enum type name.
 * @returns Matching enum type or `null` when absent.
 */
export function getEnumType(schema: GraphQLSchema, enumName: string): GraphQLEnumType | null {
  const type = schema.getType(enumName);
  return isEnumType(type) ? type : null;
}

/**
 * Collects unique fragment definitions from parsed documents.

 * @param documents Parsed GraphQL documents.
 * @returns Fragment definitions sorted by fragment name.
 */
export function getFragmentDefinitions(documents: Types.DocumentFile[]): FragmentDefinitionNode[] {
  const fragments = new Set<FragmentDefinitionNode>();
  const seen = new Set<string>();

  for (const { document, location } of documents) {
    if (!document) {
      continue;
    }

    for (const definition of document.definitions) {
      if (definition.kind !== Kind.FRAGMENT_DEFINITION) {
        continue;
      }

      const fragmentName = definition.name.value;
      if (seen.has(fragmentName)) {
        throw new Error(
          `Duplicate fragment definition for ${fragmentName} found in document ${location}`,
        );
      }

      seen.add(fragmentName);
      fragments.add(definition);
    }
  }

  return Array.from(fragments).sort((left, right) =>
    left.name.value.localeCompare(right.name.value),
  );
}

/**
 * Resolves a fragment definition by name.

 * @param documents Parsed GraphQL documents.
 * @param fragmentName Fragment name to locate.
 * @returns Matching fragment definition or `null` when absent.
 */
export function getFragmentDefinition(
  documents: Types.DocumentFile[],
  fragmentName: string,
): FragmentDefinitionNode | null {
  const fragments = getFragmentDefinitions(documents);
  return fragments.find(({ name }) => name.value === fragmentName) || null;
}

/**
 * Collects unique named operation definitions from parsed documents.

 * @param documents Parsed GraphQL documents.
 * @returns Operation definitions sorted by operation name.
 */
export function getOperationDefinitions(
  documents: Types.DocumentFile[],
): OperationDefinitionNode[] {
  const operations = new Set<OperationDefinitionNode>();
  const seen = new Set<string>();

  for (const { document, location } of documents) {
    if (!document) {
      continue;
    }

    for (const definition of document.definitions) {
      if (definition.kind !== Kind.OPERATION_DEFINITION) {
        continue;
      }

      const operationType = definition.operation;
      if (!["query", "mutation", "subscription"].includes(operationType)) {
        continue;
      }

      const operationName = definition.name?.value;
      if (!operationName) {
        throw new Error(`Unnamed operation definition found in document ${location}`);
      }

      if (seen.has(operationName)) {
        throw new Error(
          `Duplicate operation definition for ${operationName} found in document ${location}`,
        );
      }

      seen.add(operationName);
      operations.add(definition);
    }
  }

  return Array.from(operations).sort((left, right) =>
    left.name!.value.localeCompare(right.name!.value),
  );
}

/**
 * Resolves an operation definition by type and name.

 * @param documents Parsed GraphQL documents.
 * @param operationType Operation kind to match.
 * @param operationName Operation name to match.
 * @returns Matching operation definition or `null` when absent.
 */
export function getOperationDefinition(
  documents: Types.DocumentFile[],
  operationType: OperationTypeNode,
  operationName: string,
): OperationDefinitionNode | null {
  const operations = getOperationDefinitions(documents);

  return (
    operations.find(
      ({ operation, name }) => operation === operationType && name?.value === operationName,
    ) || null
  );
}

/**
 * Removes codegen-only directives from every parsed document file.
 *
 * @param documents Parsed GraphQL documents.
 * @returns Document files ready for runtime artifact generation.
 */
export function stripDirectivesFromDocuments(
  documents: Types.DocumentFile[],
): Types.DocumentFile[] {
  if (directiveNames.size === 0) {
    return documents;
  }

  return documents.map((documentFile) => {
    if (!documentFile.document) {
      return documentFile;
    }

    return {
      ...documentFile,
      document: visit(documentFile.document, {
        Directive(node) {
          return directiveNames.has(node.name.value) ? null : undefined;
        },
      }),
    };
  });
}
