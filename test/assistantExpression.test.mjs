import test from "node:test";
import assert from "node:assert/strict";
import { expressionForAssistantText } from "../src/lib/assistantExpression.js";

test("assistant expression reflects urgency, concern, reassurance, and neutral replies", () => {
  assert.equal(expressionForAssistantText("This reading is critical and needs urgent review."), "alert");
  assert.equal(expressionForAssistantText("One reading is flagged and needs review."), "frown");
  assert.equal(expressionForAssistantText("No alerts; all readings are within configured ranges."), "smile");
  assert.equal(expressionForAssistantText("Most readings are in range, but one is critical."), "alert");
  assert.equal(expressionForAssistantText("The latest measurement was recorded today."), "neutral");
});
