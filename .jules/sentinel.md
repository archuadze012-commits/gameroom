## 2024-07-21 - CSV Injection via formatting evasion
**Vulnerability:** A primitive CSV escaping logic added a single quote to fields starting with `=, +, -, @`, but this logic fails if the character sequence forces Excel to interpret a formula starting immediately after a tab/space.
**Learning:** Preventing formula injection (CSV injection) simply by prepending an apostrophe is sometimes bypassed or results in bad UX.
**Prevention:** Using a tab character (`\t`) prefix handles edge cases across Excel versions robustly and avoids displaying an awkward stray quote in standard view.
