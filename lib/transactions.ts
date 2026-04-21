export function getTransactionEffect(type: "INCOME" | "EXPENSE", amount: number) {
  return type === "INCOME" ? amount : -amount
}
