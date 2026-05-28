import { NextResponse } from "next/server";

type Rule =
  | { type: "required" }
  | { type: "string"; min?: number; max?: number }
  | { type: "number"; min?: number; max?: number }
  | { type: "enum"; values: string[] }
  | { type: "email" }
  | { type: "date" }  // YYYY-MM-DD
  | { type: "time" }; // HH:MM

type FieldRules = Rule[];

type Schema = Record<string, FieldRules>;

function applyRules(field: string, value: unknown, rules: FieldRules): string | null {
  for (const rule of rules) {
    if (rule.type === "required") {
      if (value === undefined || value === null || value === "") {
        return `${field} é obrigatório.`;
      }
    }
    if (value === undefined || value === null || value === "") continue;

    if (rule.type === "string") {
      if (typeof value !== "string") return `${field} deve ser texto.`;
      if (rule.min && value.trim().length < rule.min) return `${field} deve ter ao menos ${rule.min} caractere(s).`;
      if (rule.max && value.trim().length > rule.max) return `${field} deve ter no máximo ${rule.max} caractere(s).`;
    }
    if (rule.type === "number") {
      const n = Number(value);
      if (isNaN(n)) return `${field} deve ser um número.`;
      if (rule.min !== undefined && n < rule.min) return `${field} deve ser pelo menos ${rule.min}.`;
      if (rule.max !== undefined && n > rule.max) return `${field} deve ser no máximo ${rule.max}.`;
    }
    if (rule.type === "enum") {
      if (!rule.values.includes(String(value))) return `${field} deve ser um de: ${rule.values.join(", ")}.`;
    }
    if (rule.type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return `${field} deve ser um e-mail válido.`;
    }
    if (rule.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return `${field} deve estar no formato YYYY-MM-DD.`;
    }
    if (rule.type === "time") {
      if (!/^\d{2}:\d{2}$/.test(String(value))) return `${field} deve estar no formato HH:MM.`;
    }
  }
  return null;
}

export function validate(data: unknown, schema: Schema): string[] {
  if (typeof data !== "object" || data === null) return ["Corpo da requisição inválido."];
  const body = data as Record<string, unknown>;
  const errors: string[] = [];
  for (const [field, rules] of Object.entries(schema)) {
    const err = applyRules(field, body[field], rules);
    if (err) errors.push(err);
  }
  return errors;
}

export function validationError(errors: string[]) {
  return NextResponse.json({ error: errors[0], errors }, { status: 400 });
}
