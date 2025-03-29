"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export default function CountAnimation({
  number,
  className,
  formatValue
}: {
  number: number;
  className?: string;
  formatValue?: (value: number) => string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  
  // Cria uma transformação formatada se uma função de formatação for fornecida
  const formattedValue = formatValue 
    ? useTransform(rounded, (value) => formatValue(value))
    : rounded;

  useEffect(() => {
    const animation = animate(count, number, { duration: 2 });

    return animation.stop;
  }, [number, count]);

  return <motion.span className={cn(className)}>{formattedValue}</motion.span>;
}
