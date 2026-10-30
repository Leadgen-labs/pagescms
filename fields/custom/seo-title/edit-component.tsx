"use client";

import { UiText } from "@/components/ui-text";
import { ui, useUi } from "@/components/use-ui";
import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Counter, effectiveTitle, SERP, textWidth, useHydrated, useSibling, useTitleSuffix, type SeoOptions } from "@/fields/custom/seo-shared";

/** SEO titulek: výchozí „Nadpis | brand“ jako placeholder, šířka v px a počet znaků. */
const EditComponent = forwardRef((props: any, ref: React.Ref<HTMLInputElement>) => {
  const ui = useUi();
  const { field, ...restProps } = props;
  const options = (field?.options ?? {}) as SeoOptions;
  const own = typeof restProps.value === "string" ? restProps.value : "";
  const fallback = useSibling(restProps.name, options.fallback);
  const suffix = useTitleSuffix(options);
  const title = effectiveTitle(own, fallback, suffix);
  const width = Math.round(textWidth(title.text, SERP.titleSize));
  const fits = width <= SERP.titlePx;
  const hydrated = useHydrated();

  return (
    <div>
      <Input
        {...restProps}
        value={own}
        ref={ref}
        placeholder={title.isDefault ? title.text : undefined}
        className={cn("text-base", field?.readonly && "focus-visible:border-input focus-visible:ring-0")}
        readOnly={field?.readonly}
      />
      {hydrated && title.text ? (
        <Counter tone={fits ? (title.isDefault ? "muted" : "ok") : "warn"}>
          <span>
            {title.text.length} <UiText text={"znaků,"}/>{width} <UiText text={"z"}/>{SERP.titlePx} px
            {title.isDefault ? ui(" (výchozí titulek)") : ""}
          </span>
          {!fits && <span><UiText text={"Google titulek nejspíš zkrátí, důležité slovo dejte na začátek."}/></span>}
        </Counter>
      ) : null}
    </div>
  );
});

EditComponent.displayName = "SeoTitleEditComponent";

export { EditComponent };
