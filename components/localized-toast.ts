"use client";
import { toast as originalToast } from "sonner";
import { ui } from "@/components/use-ui";
import { errorText } from "@/lib/ui-error";
export const toast: typeof originalToast = new Proxy(originalToast, {
  apply(target, receiver, args) {
    return Reflect.apply(target,receiver,args.map((arg,index)=>index===0&&typeof arg==="string"?ui(arg):arg));
  },
  get(target,property,receiver) {
    const value = Reflect.get(target,property,receiver);
    if (typeof value !== "function" || !["error","success","info","warning","loading","message"].includes(String(property))) return value;
    return (...args: unknown[]) => Reflect.apply(value,target,args.map((arg,index)=>index===0&&typeof arg==="string"?(property==="error"?errorText(arg,typeof document!=="undefined"&&document.documentElement.lang==="en"?"en":"cs"):ui(arg)):arg));
  },
});
