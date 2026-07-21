export type BaselineFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "boolean"
  | "repeater";

export type BaselineField = {
  key: string;
  label: string;
  type: BaselineFieldType;
  required?: boolean;
  options?: string[];
  hint?: string;
  // For repeater fields - the shape of each row.
  subfields?: BaselineField[];
  // For repeater fields - short noun for the "Tambah X" button (e.g. "tahun",
  // "penghargaan"). Defaults to "entri".
  itemLabel?: string;
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
