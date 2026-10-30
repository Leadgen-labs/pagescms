"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Config } from "@/types/config";

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config | null) => void;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const useOptionalConfig = () => useContext(ConfigContext);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};

export const ConfigProvider = ({
  value,
  children,
}: {
  value: Config | null;
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<Config | null>(value);

  const displayConfig = useMemo(() => {
    if (!config?.repo.startsWith("webs-obsah-")) return config;
    const rename = (items: any[]): any[] => items.map((item) => ({
      ...item,
      ...(item.type === "collection" && item.name === "kontrola-presmerovani" ? { label: "Kontrola přesměrování" } : {}),
      ...(item.type === "collection" && item.name.startsWith("blog-") && Array.isArray(item.fields) ? { fields: item.fields.map((field: any) => field.name === "published_at" ? { ...field, label: "Datum vydání", description: field.description || "Pražský čas. Prázdné datum znamená vydat hned, budoucí datum naplánuje zveřejnění." } : field) } : {}),
      ...(Array.isArray(item.items) ? { items: rename(item.items) } : {}),
    }));
    return { ...config, object: { ...config.object, content: rename(config.object.content ?? []) } };
  }, [config]);

  return (
    <ConfigContext.Provider value={{ config: displayConfig, setConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};