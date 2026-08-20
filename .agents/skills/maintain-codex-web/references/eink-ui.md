# E-ink UI Reference

Use the E-ink theme as a presentation layer over the native Light theme. Do not
create a separate application mode or parallel persisted state.

## Design Rules

- Prefer pure white surfaces and black structure for interactive regions. E Ink
  documents two-level black/white updates as the fast path for menus, typing,
  cursors, and pen interaction; reserve multi-level gray for images,
  anti-aliased text, and secondary information.
- Do not distinguish navigation regions with large gray fills. Use white space,
  a black separator, and a black active marker instead.
- Keep text fields and the composer visibly bounded at rest. Use a complete
  one-pixel black border and a two-pixel focus outline that does not change the
  control's layout.
- Keep essential text at least WCAG 2.2 AA contrast. Keep control boundaries and
  state indicators at least 3:1 against adjacent colors. `#767676` on white is
  the lightest reference border in this theme; use black for primary inputs.
- Remove transparency, blur, shadows, and nonessential motion. An opaque modal
  backdrop is acceptable; translucent material effects are not.
- Do not erase selected, hover, or focus state merely to remove gray. Replace
  fill-only state with borders, outlines, underlines, or monochrome markers.

## Primary Sources

- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- W3C Understanding Non-text Contrast:
  https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html
- E Ink 10.3-inch ePaper Display User Manual:
  https://shopkits.eink.com/en/download/0223011714tb217020/User%20Manual%20-%2010.3%C3%8B%C2%9D%20ePaper%20Display%20%28VB3300-KCA%29.pdf
