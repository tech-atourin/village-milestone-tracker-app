export type BaselineFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "boolean";

export type BaselineField = {
  key: string;
  label: string;
  type: BaselineFieldType;
  required?: boolean;
  options?: string[];
  hint?: string;
};

export type BaselineSection = {
  section: string;
  fields: BaselineField[];
};

export type BaselineSchema = BaselineSection[];

export type BaselineSchemaRow = {
  id: string;
  name: string;
  version: string;
  fields: BaselineSchema;
};
