import assert from "node:assert/strict";
import test from "node:test";

import { linkifyMessage as linkifyDispatcher } from "../mobile-dispatcher/src/lib/linkify.ts";
import { linkifyMessage as linkifyDriver } from "../mobile/src/lib/linkify.ts";

const implementations = [
  ["řidičská aplikace", linkifyDriver],
  ["dispečerská aplikace", linkifyDispatcher],
];

for (const [name, linkify] of implementations) {
  test(`${name}: rozpozná kompletní HTTPS odkaz`, () => {
    assert.deepEqual(linkify("Sledujte https://kuryr4you.cz/track/ABC?lang=cs#detail"), [
      { kind: "text", text: "Sledujte " },
      {
        kind: "link",
        text: "https://kuryr4you.cz/track/ABC?lang=cs#detail",
        url: "https://kuryr4you.cz/track/ABC?lang=cs#detail",
      },
    ]);
  });

  test(`${name}: doplní HTTPS pro www a holou doménu`, () => {
    assert.deepEqual(linkify("www.gotty.cz a 3dtiskprofi.cz/kontakt"), [
      { kind: "link", text: "www.gotty.cz", url: "https://www.gotty.cz" },
      { kind: "text", text: " a " },
      { kind: "link", text: "3dtiskprofi.cz/kontakt", url: "https://3dtiskprofi.cz/kontakt" },
    ]);
  });

  test(`${name}: ponechá okolní interpunkci mimo odkaz`, () => {
    assert.deepEqual(linkify("Otevřete (https://example.com/trasa). Hotovo."), [
      { kind: "text", text: "Otevřete (" },
      { kind: "link", text: "https://example.com/trasa", url: "https://example.com/trasa" },
      { kind: "text", text: ")." },
      { kind: "text", text: " Hotovo." },
    ]);
  });

  test(`${name}: zachová závorku, která je součástí URL`, () => {
    const segments = linkify("https://example.com/wiki/Foo_(bar)");
    assert.deepEqual(segments, [
      {
        kind: "link",
        text: "https://example.com/wiki/Foo_(bar)",
        url: "https://example.com/wiki/Foo_(bar)",
      },
    ]);
  });

  test(`${name}: podporuje e-mail a více odkazů v jedné zprávě`, () => {
    const segments = linkify("Napište na info@kuryr4you.cz nebo otevřete kuryr4you.cz.");
    assert.deepEqual(segments, [
      { kind: "text", text: "Napište na " },
      { kind: "link", text: "info@kuryr4you.cz", url: "mailto:info@kuryr4you.cz" },
      { kind: "text", text: " nebo otevřete " },
      { kind: "link", text: "kuryr4you.cz", url: "https://kuryr4you.cz" },
      { kind: "text", text: "." },
    ]);
  });

  test(`${name}: obyčejný text ponechá beze změny`, () => {
    assert.deepEqual(linkify("Řidič dorazí za deset minut."), [
      { kind: "text", text: "Řidič dorazí za deset minut." },
    ]);
  });
}
