import { describe, expect, it } from "vitest";

import { splitChatLinks as splitDriverLinks } from "../../mobile/src/lib/chatLinks";
import { splitChatLinks as splitDispatcherLinks } from "../../mobile-dispatcher/src/lib/chatLinks";

const parsers = [splitDriverLinks, splitDispatcherLinks];

describe.each(parsers)("native chat links", (splitChatLinks) => {
  it("recognizes HTTPS, www and bare domains", () => {
    expect(splitChatLinks("A https://kuryr4you.cz/x?y=1 B").find((part) => part.url)?.url)
      .toBe("https://kuryr4you.cz/x?y=1");
    expect(splitChatLinks("www.kuryr4you.cz/track/123").find((part) => part.url)?.url)
      .toBe("https://www.kuryr4you.cz/track/123");
    expect(splitChatLinks("kuryr4you.cz").find((part) => part.url)?.url)
      .toBe("https://kuryr4you.cz");
  });

  it("keeps sentence punctuation outside the clickable URL", () => {
    expect(splitChatLinks("Otevři https://kuryr4you.cz/test.")).toEqual([
      { text: "Otevři " },
      { text: "https://kuryr4you.cz/test", url: "https://kuryr4you.cz/test" },
      { text: "." },
    ]);
  });

  it("does not linkify the domain inside an e-mail address", () => {
    expect(splitChatLinks("dispecink@kuryr4you.cz").some((part) => part.url)).toBe(false);
  });
});
