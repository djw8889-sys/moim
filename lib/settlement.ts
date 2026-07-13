// 정산 계산 로직 (서버에서만 사용)
//
// 1. 각 멤버의 순잔액 = (내가 결제한 총액) - (내가 분담해야 할 총액)
// 2. 순잔액 (+)인 사람(받을 사람)과 (-)인 사람(보낼 사람)을 큰 금액끼리 매칭해
//    최소 횟수의 송금 목록을 만든다. (멤버 n명이면 최대 n-1회)

export type SettlementInput = {
  expenses: {
    payerMemberId: string;
    amount: number;
    shares: { memberId: string; shareAmount: number }[];
  }[];
};

export type Transfer = {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
};

export function computeBalances(
  input: SettlementInput
): Map<string, number> {
  const net = new Map<string, number>();
  const add = (id: string, v: number) => net.set(id, (net.get(id) ?? 0) + v);

  for (const e of input.expenses) {
    add(e.payerMemberId, e.amount);
    for (const s of e.shares) {
      add(s.memberId, -s.shareAmount);
    }
  }
  return net;
}

export function computeTransfers(input: SettlementInput): Transfer[] {
  const net = computeBalances(input);

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];
  for (const [id, v] of net) {
    if (v > 0) creditors.push({ id, amount: v });
    else if (v < 0) debtors.push({ id, amount: -v });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    if (amount > 0) {
      transfers.push({ fromMemberId: d.id, toMemberId: c.id, amount });
    }
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount === 0) ci++;
    if (d.amount === 0) di++;
  }
  return transfers;
}

// 1/N 분담액 계산: 원 단위 내림 후 남는 잔돈은 결제자에게 귀속
// (결제자가 분담 대상이 아니면 첫 번째 대상에게 귀속)
export function splitEqually(
  amount: number,
  memberIds: string[],
  payerMemberId: string
): { memberId: string; shareAmount: number }[] {
  const n = memberIds.length;
  if (n === 0) return [];
  const base = Math.floor(amount / n);
  const remainder = amount - base * n;
  const shares = memberIds.map((memberId) => ({
    memberId,
    shareAmount: base,
  }));
  if (remainder > 0) {
    const target =
      shares.find((s) => s.memberId === payerMemberId) ?? shares[0];
    target.shareAmount += remainder;
  }
  return shares;
}
