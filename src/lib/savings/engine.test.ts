import { describe, expect, it } from "vitest";
import {
  computeGoalState,
  dailyQuotaFor,
  paceLabel,
  splitByShares,
  suggestRounding,
  type GoalPlan,
} from "./engine";
import { addDays, daysBetween, inclusiveDays } from "./dates";

const plan = (over: Partial<GoalPlan> = {}): GoalPlan => ({
  targetAmount: 100_000, // $1,000
  startDate: "2026-01-01",
  dueDate: "2026-01-10", // 10 días
  surplusMode: "buffer",
  roundingStep: 0,
  ...over,
});

const solo = [{ userId: "u1", shareBps: 10000 }];

describe("fechas", () => {
  it("cuenta días inclusive", () => {
    expect(inclusiveDays("2026-01-01", "2026-01-10")).toBe(10);
    expect(inclusiveDays("2026-01-01", "2026-01-01")).toBe(1);
  });
  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1); // 2026 no es bisiesto
  });
});

describe("cuota diaria", () => {
  it("redondea hacia arriba para no quedar corto", () => {
    expect(dailyQuotaFor(100_000, plan())).toBe(10_000);
    expect(dailyQuotaFor(100_001, plan())).toBe(10_001);
  });
  it("aplica el paso de redondeo configurado", () => {
    expect(dailyQuotaFor(100_000, plan({ roundingStep: 2_500 }))).toBe(10_000);
    expect(dailyQuotaFor(100_100, plan({ roundingStep: 2_500 }))).toBe(12_500);
  });
});

describe("reparto entre colaboradores", () => {
  it("divide 50/50 sin perder centavos", () => {
    const s = splitByShares(299_901, [
      { userId: "a", shareBps: 5000 },
      { userId: "b", shareBps: 5000 },
    ]);
    expect(s.a + s.b).toBe(299_901);
  });
  it("respeta proporciones 70/30", () => {
    const s = splitByShares(299_900, [
      { userId: "a", shareBps: 7000 },
      { userId: "b", shareBps: 3000 },
    ]);
    expect(s).toEqual({ a: 209_930, b: 89_970 });
  });
});

describe("modo buffer (adelanto de días)", () => {
  const input = {
    plan: plan({ surplusMode: "buffer" as const }),
    members: solo,
    contributions: [{ userId: "u1", amount: 30_000, occurredOn: "2026-01-01" }],
    today: "2026-01-03",
  };

  it("no cobra los días cubiertos por el excedente", () => {
    const s = computeGoalState(input);
    expect(s.members.u1.todayCharge).toBe(0);
    expect(s.members.u1.todayCovered).toBe(true);
  });

  it("protege la racha en los días cubiertos", () => {
    const s = computeGoalState(input);
    expect(s.members.u1.streak).toBe(3);
  });

  it("vuelve a cobrar cuando el buffer se agota", () => {
    const s = computeGoalState({ ...input, today: "2026-01-04" });
    expect(s.members.u1.todayCharge).toBe(10_000);
    expect(s.members.u1.buffer).toBe(0);
  });
});

describe("modo aceleración (reducción de plazo)", () => {
  const input = {
    plan: plan({ surplusMode: "accelerate" as const }),
    members: solo,
    contributions: [{ userId: "u1", amount: 30_000, occurredOn: "2026-01-01" }],
    today: "2026-01-03",
  };

  it("mantiene la cuota diaria intacta", () => {
    const s = computeGoalState(input);
    expect(s.members.u1.dailyQuota).toBe(10_000);
    expect(s.members.u1.todayCharge).toBe(10_000);
  });

  it("adelanta la fecha proyectada de término", () => {
    const s = computeGoalState(input);
    // faltan $700 a $100/día => 7 días contando hoy => termina el 09, un día antes
    expect(s.projectedEndDate).toBe("2026-01-09");
    expect(s.projectedDaysDelta).toBe(1);
  });

  it("no protege la racha con el excedente", () => {
    const s = computeGoalState(input);
    expect(s.members.u1.streak).toBe(0);
  });
});

describe("atrasos", () => {
  it("acumula el faltante sin penalizar", () => {
    const s = computeGoalState({
      plan: plan(),
      members: solo,
      contributions: [{ userId: "u1", amount: 5_000, occurredOn: "2026-01-01" }],
      today: "2026-01-03",
    });
    expect(s.members.u1.arrears).toBe(25_000); // esperado 30k, ahorrado 5k
    expect(s.members.u1.daysDelta).toBe(-2);
    expect(paceLabel(s, s.members.u1)).toBe("Vas 2 días atrasado");
  });
});

describe("metas compartidas", () => {
  const shared = {
    plan: plan({ targetAmount: 200_000 }),
    members: [
      { userId: "a", shareBps: 7000 },
      { userId: "b", shareBps: 3000 },
    ],
    contributions: [{ userId: "a", amount: 14_000, occurredOn: "2026-01-01" }],
    today: "2026-01-01",
  };

  it("cobra a cada quien sólo su parte", () => {
    const s = computeGoalState(shared);
    expect(s.members.a.dailyQuota).toBe(14_000);
    expect(s.members.b.dailyQuota).toBe(6_000);
    expect(s.members.a.todayCharge).toBe(0);
    expect(s.members.b.todayCharge).toBe(6_000);
  });

  it("suma el progreso de todos", () => {
    const s = computeGoalState(shared);
    expect(s.saved).toBe(14_000);
    expect(s.progress).toBeCloseTo(0.07);
  });
});

describe("hitos", () => {
  it("desbloquea 25/50/75/100", () => {
    const s = computeGoalState({
      plan: plan(),
      members: solo,
      contributions: [{ userId: "u1", amount: 60_000, occurredOn: "2026-01-01" }],
      today: "2026-01-01",
    });
    expect(s.milestonesReached).toEqual([25, 50]);
    expect(s.nextMilestone).toBe(75);
  });

  it("marca completada al 100%", () => {
    const s = computeGoalState({
      plan: plan(),
      members: solo,
      contributions: [{ userId: "u1", amount: 100_000, occurredOn: "2026-01-01" }],
      today: "2026-01-05",
    });
    expect(s.isComplete).toBe(true);
    expect(s.members.u1.todayCharge).toBe(0);
    expect(s.members.u1.streak).toBe(5); // objetivo alcanzado => días cumplidos
  });
});

describe("sugerencia de redondeo", () => {
  it("propone $40/día cuando la cuota es $33.40 (ejemplo del PRD)", () => {
    const s = suggestRounding(100_200, plan({ dueDate: "2026-01-30" }));
    expect(s).not.toBeNull();
    expect(s!.quota).toBe(3_340);
    expect(s!.suggested).toBe(4_000);
    expect(s!.daysSaved).toBe(4);
  });

  it("no sugiere nada si la cuota ya es redonda", () => {
    expect(suggestRounding(100_000, plan())).toBeNull();
  });
});
