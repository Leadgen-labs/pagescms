import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";

// Délka je doporučení, ne limit: uložení nikdy neblokuje.
const schema = (field: Field) => {
  let zodSchema = z.string();
  if (field.required) zodSchema = zodSchema.min(1, "This field is required");
  return zodSchema;
};

const label = "SEO titulek";

export { label, schema, EditComponent };
