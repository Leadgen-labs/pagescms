import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";
import { ViewComponent } from "./view-component";
import { parse, parseISO, format, isValid, isBefore, isAfter } from "date-fns";

const defaultValue = (field: Field) => {
  const inputType = field?.options?.time ? "datetime-local" : "date";
  const inputFormat = inputType === "datetime-local" ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd";
  return format(new Date(), inputFormat);
};

const read = (value: any, field: Field, config?: { repo?: string }) => {
  const inputType = field?.options?.time ? "datetime-local" : "date";
  const inputFormat = inputType === "datetime-local" ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd";
  const saveFormat = field?.options?.format as string || inputFormat;

  if (!value) return "";

  const display = (date: Date) => {
    if (!config?.repo?.startsWith("webs-obsah-")) return format(date, inputFormat);
    // Editorial publication dates are Prague wall times, independent of the server TZ.
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
    const day = part("year") + "-" + part("month") + "-" + part("day");
    return inputType === "datetime-local" ? day + "T" + part("hour") + ":" + part("minute") : day;
  };

  // YAML !!timestamp values are Date objects, while CMS values are strings.
  // Calling date-fns parse on a Date throws and used to blank the entire row.
  if (value instanceof Date) return isValid(value) ? display(value) : "";
  if (typeof value !== "string") return "";

  let parsedDate = parse(value, saveFormat, new Date());
  if (!isValid(parsedDate) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    parsedDate = parseISO(value);
    return isValid(parsedDate) ? display(parsedDate) : "";
  }

  if (isValid(parsedDate)) {
    return format(parsedDate, inputFormat);
  } else {
    console.warn(`Invalid date for field ${field.name}: "${value}" does not match format "${saveFormat}".`);
    return "";
  }
};

const write = (value: any, field: Field) => {
  const inputType = field?.options?.time ? "datetime-local" : "date";
  const inputFormat = inputType === "datetime-local" ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd";
  const saveFormat = field?.options?.format as string || inputFormat;

  if (value == null || value === "") return "";
  if (typeof value !== "string") return "";
  const parsedDate = parse(value, inputFormat, new Date(0, 0));

  if (isValid(parsedDate)) {
    return format(parsedDate, saveFormat);
  } else {
    console.warn(`Invalid date for field ${field.name}: "${value}".`);
    return "";
  }
};

const schema = (field: Field) => {
  const inputType = field?.options?.time ? "datetime-local" : "date";
  const inputFormat = inputType === "datetime-local" ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd";

  let zodSchema = z.string()
    .refine(val => {
      if (!val) return !field.required;
      return isValid(parse(val, inputFormat, new Date()));
    }, "Invalid date")
    .refine(val => {
      if (!val || !field.options?.min) return true;
      const date = parse(val, inputFormat, new Date());
      const minDate = parse(field.options.min as string, inputFormat, new Date());
      return isValid(minDate) && !isBefore(date, minDate);
    }, `Date must be after ${field.options?.min}`)
    .refine(val => {
      if (!val || !field.options?.max) return true;
      const date = parse(val, inputFormat, new Date());
      const maxDate = parse(field.options.max as string, inputFormat, new Date());
      return isValid(maxDate) && !isAfter(date, maxDate);
    }, `Date must be before ${field.options?.max}`);
  
  return zodSchema;
};

export { EditComponent, ViewComponent, schema, read, write, defaultValue };
