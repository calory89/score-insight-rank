import { describe, it, expect } from "vitest";
import { answerText } from "../community/shareAnswer";

describe("answerText", () => {
  it("joins the question, the short answer, the rule and the link", () => {
    expect(answerText("Can Americans buy property in Italy?", "Yes", "Americans can buy on the same terms as Italians.", "https://realhunt.co/can-i-buy/american-in-italy"))
      .toBe("Can Americans buy property in Italy? Yes. Americans can buy on the same terms as Italians.\nhttps://realhunt.co/can-i-buy/american-in-italy");
  });
  it("cuts a long rule at a word and keeps the link whole", () => {
    const out = answerText("Q?", "Yes", "word ".repeat(100).trim(), "https://realhunt.co/x");
    expect(out.split("\n")[0].length).toBeLessThan(260);
    expect(out).toMatch(/word…\nhttps:\/\/realhunt\.co\/x$/);
  });
});
