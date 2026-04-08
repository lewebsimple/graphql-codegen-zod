import type { DirectiveRegistry } from "../pipeline/directive-helpers";

import { decodeHTMLDirective } from "./decode-html";
import { emailDirective } from "./email";
import { enumDirective } from "./enum";
import { filterNullItemsDirective } from "./filter-null-items";
import { nonNullDirective } from "./non-null";
import { nullToDirective } from "./null-to";
import { nullToEmptyDirective } from "./null-to-empty";
import { nullToUndefinedDirective } from "./null-to-undefined";

/** Shared directive registry consumed by schema extension and rendering. */
export const directiveRegistry: DirectiveRegistry = {
  [decodeHTMLDirective.name]: decodeHTMLDirective,
  [enumDirective.name]: enumDirective,
  [emailDirective.name]: emailDirective,
  [filterNullItemsDirective.name]: filterNullItemsDirective,
  [nonNullDirective.name]: nonNullDirective,
  [nullToDirective.name]: nullToDirective,
  [nullToEmptyDirective.name]: nullToEmptyDirective,
  [nullToUndefinedDirective.name]: nullToUndefinedDirective,
};

export const directiveNames: ReadonlySet<string> = new Set(Object.keys(directiveRegistry));
