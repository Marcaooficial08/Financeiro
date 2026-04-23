import { isAlwaysDebitCategory } from "@/lib/defaults";

export function getTransactionEffect(type: "INCOME" | "EXPENSE", amount: number) {
  return type === "INCOME" ? amount : -amount;
}

/**
 * Variante que considera o systemKey da categoria. Usada para regras especiais
 * como Uber, que SEMPRE debita (independente do tipo da transação).
 */
export function getTransactionEffectForCategory(
  type: "INCOME" | "EXPENSE",
  amount: number,
  categorySystemKey: string | null | undefined,
) {
  if (isAlwaysDebitCategory(categorySystemKey)) {
    return -Math.abs(amount);
  }
  return getTransactionEffect(type, amount);
}
