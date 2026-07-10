import assert from "node:assert/strict";
import test from "node:test";

import { decodeXmlAttributeValue, parseXmlNodes } from "./parse-metadata-xml.mjs";

test("decodeXmlAttributeValue > unescapes ampersand entities last", () => {
  assert.equal(decodeXmlAttributeValue("Brand=McDonald&#39;s"), "Brand=McDonald's");
  assert.equal(decodeXmlAttributeValue("foo &amp; bar"), "foo & bar");
  assert.equal(decodeXmlAttributeValue("&amp;quot;"), "&quot;");
  assert.equal(decodeXmlAttributeValue("&quot;"), '"');
});

test("parseXmlNodes > decodes entity-encoded symbol names", () => {
  const xml =
    '<frame id="31:469" name="Shop cards"><symbol id="31:450" name="Brand=McDonald&#39;s, Cover=False"/></frame>';
  const nodes = parseXmlNodes(xml);
  const symbol = nodes.find((node) => node.type === "symbol");
  assert.equal(symbol?.name, "Brand=McDonald's, Cover=False");
});
