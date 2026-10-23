import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryMultiSelect } from "../app/components/category-multi-select.tsx";

test("shared category dropdown shows only available choices and a multi-selection summary",()=>{
  const html=renderToStaticMarkup(createElement(CategoryMultiSelect,{
    label:"Categories to find together",
    available:["Eat","Movies","Culture"],
    selected:["Eat","Culture"],
    onChange:()=>{},
  }));
  assert.match(html,/<details class="category-multi-select">/);
  assert.match(html,/aria-label="Selected categories"/);
  assert.match(html,/>Food<\/span>/);
  assert.match(html,/>Culture<\/span>/);
  assert.equal((html.match(/type="checkbox"/g)??[]).length,3);
  assert.equal((html.match(/checked=""/g)??[]).length,2);
  assert.doesNotMatch(html,/Music/);
  assert.match(html,/>Done<\/button>/);
});
