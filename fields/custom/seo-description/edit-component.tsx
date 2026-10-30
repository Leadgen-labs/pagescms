"use client";

import { UiText } from "@/components/ui-text";
import { ui, useUi } from "@/components/use-ui";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Counter, DESCRIPTION_MIN, GooglePreview, SERP, textWidth, useHydrated, usePreview, useSibling, type SeoOptions } from "@/fields/custom/seo-shared";

const plain = (text: string) => text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** SEO popis: výchozí perex jako placeholder, počet znaků a živý náhled v Googlu. */
const EditComponent = forwardRef((props: any, ref) => {
  const ui = useUi();
  const { field, ...restProps } = props;
  const options = (field?.options ?? {}) as SeoOptions;
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => internalRef.current);

  const own = typeof restProps.value === "string" ? restProps.value : "";
  const fallback = plain(useSibling(restProps.name, options.fallback));
  const description = own.trim() || fallback;
  const isDefault = !own.trim();
  const fits = textWidth(description, SERP.descriptionSize) <= SERP.descriptionPx;
  const tooShort = description.length > 0 && description.length < DESCRIPTION_MIN;
  const preview = usePreview(restProps.name, options, description);
  const hydrated = useHydrated();

  return (
    <div>
      <Textarea
        {...restProps}
        value={own}
        ref={internalRef}
        placeholder={isDefault && fallback ? fallback : undefined}
        className={cn("text-base min-h-19.5", field?.readonly && "focus-visible:border-input focus-visible:ring-0")}
        readOnly={field?.readonly}
      />
      {!hydrated ? null : description ? (
        <Counter tone={tooShort || !fits ? "warn" : isDefault ? "muted" : "ok"}>
          <span>
            {description.length} <UiText text={"znaků, doporučeno zhruba 120 až 160"}/>{isDefault ? ui(" (výchozí popis)") : ""}
          </span>
          {tooShort && <span><UiText text={"Popis je krátký, Google ho nejspíš nahradí úryvkem z textu."}/></span>}
          {!fits && <span><UiText text={"Google popis nejspíš zkrátí."}/></span>}
        </Counter>
      ) : (
        <Counter tone="muted">
          <span><UiText text={"Bez popisu Google vybere úryvek z textu sám."}/></span>
        </Counter>
      )}
      {hydrated && preview && <GooglePreview {...preview} />}
    </div>
  );
});

EditComponent.displayName = "SeoDescriptionEditComponent";

export { EditComponent };
