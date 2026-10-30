"use client";
import {useState,useEffect} from "react";
import { useLanguage } from "@/contexts/language-context";
export function RelativeTime({date}: {date:Date|string|number}) {
 const {language}=useLanguage();
 const value=new Date(date);
 const timestamp=value.getTime();
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>setNow(Date.now()),[timestamp]);
 if(!Number.isFinite(timestamp))return <>-</>;
 if(now===null)return <>{new Intl.DateTimeFormat(language === "cs"?"cs-CZ":"en-GB").format(value)}</>;
 const seconds=(timestamp-now)/1000;
 if(!Number.isFinite(seconds))return <>-</>;
 const units: [Intl.RelativeTimeFormatUnit,number][]=[['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60],['second',1]];
 const [unit,divisor]=units.find(([,size])=>Math.abs(seconds)>=size)??units[units.length-1];
 return <>{new Intl.RelativeTimeFormat(language==='cs'?'cs-CZ':'en-GB',{numeric:'always'}).format(Math.round(seconds/divisor),unit)}</>;
}
