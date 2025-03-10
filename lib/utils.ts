import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formata um nome para ter apenas a primeira letra de cada palavra maiúscula
 */
export function formatName(name: string): string {
  if (!name) return '';
  
  // Divide o nome em palavras e formata cada uma individualmente
  return name
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Primeira letra maiúscula, resto minúsculo
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Formata um número de telefone brasileiro para o padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Remove caracteres não numéricos
  let numbers = phone.replace(/\D/g, '');
  
  // Se não houver números, retorna traço
  if (!numbers) return '-';
  
  // Tratamento para números que começam com 55 (código do Brasil)
  if (numbers.startsWith('55') && numbers.length >= 12) {
    // Remove o prefixo 55
    numbers = numbers.substring(2);
  }

  // Caso seja um número muito curto (menos de 10 dígitos)
  if (numbers.length < 10) {
    // Se for um número curto com pelo menos 6 dígitos, tenta formatar com hífen
    if (numbers.length >= 6) {
      return `${numbers.slice(0, numbers.length-4)}-${numbers.slice(numbers.length-4)}`;
    }
    return numbers;
  }

  // Extrai o DDD (2 dígitos)
  const ddd = numbers.substring(0, 2);
  
  // Caso para celular (normalmente 11 dígitos no total)
  if (numbers.length === 11) {
    const part1 = numbers.substring(2, 7);
    const part2 = numbers.substring(7, 11);
    return `(${ddd}) ${part1}-${part2}`;
  } 
  // Caso para telefone fixo (normalmente 10 dígitos no total)
  else if (numbers.length === 10) {
    const part1 = numbers.substring(2, 6);
    const part2 = numbers.substring(6, 10);
    return `(${ddd}) ${part1}-${part2}`;
  }
  // Caso para números mais longos (preserva todos os dígitos)
  else {
    // Exibe os primeiros dois dígitos como DDD e o resto
    return `(${ddd}) ${numbers.substring(2)}`;
  }
}
