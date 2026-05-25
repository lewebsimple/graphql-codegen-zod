import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export enum GqlUserRole {
  Admin = "ADMIN",
  User = "USER",
}

export type GqlViewerFragment = {
  __typename?: "User";
  id: string;
  email: string;
  role: GqlUserRole;
  name: string | null;
};

export type GqlGetUserQueryVariables = Exact<{
  id: Scalars["ID"]["input"];
  email?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type GqlGetUserQuery = {
  __typename?: "Query";
  getUser: {
    __typename?: "User";
    id: string;
    email: string;
    role: GqlUserRole;
    name: string | null;
  };
};

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>["__apiType"]>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const ViewerFragmentDoc = new TypedDocumentString(
  `
    fragment Viewer on User {
  id
  email
  role
  name @coerceNull(value: "Unknown")
}
    `,
  { fragmentName: "Viewer" },
) as unknown as TypedDocumentString<GqlViewerFragment, unknown>;
export const GetUserDocument = new TypedDocumentString(`
    query GetUser($id: ID!, $email: String) {
  getUser(id: $id) {
    ...Viewer
  }
}
    fragment Viewer on User {
  id
  email
  role
  name @coerceNull(value: "Unknown")
}`) as unknown as TypedDocumentString<GqlGetUserQuery, GqlGetUserQueryVariables>;
