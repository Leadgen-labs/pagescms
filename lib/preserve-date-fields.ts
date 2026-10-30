/** Preserve timestamp precision and timezone when a form did not change a date. */
export function preserveUnchangedDateFields(
  original: Record<string, unknown>,
  submitted: Record<string, unknown>,
  written: Record<string, unknown>,
  fields: Array<{ name: string; type?: string }>,
  readDate: (value: unknown, field: any) => unknown,
) {
  const result = { ...written };
  for (const field of fields) {
    const value = original[field.name];
    if (field.type === "date" && value != null && submitted[field.name] !== "" && submitted[field.name] === readDate(value, field)) result[field.name] = value;
  }
  return result;
}
