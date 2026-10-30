/** Keep authored text on the server; client display components apply the account language. */
export const ui = (source: string, ...values: unknown[]) => source.replace(/\{(\d+)\}/g,(token,index)=>Number(index)<values.length?String(values[Number(index)]):token);
