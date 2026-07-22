## 2024-07-22 - Prevent CSV Injection with Tab

**Vulnerability:** User inputs formatted for CSV exports used a single quote (`'`) to mitigate Formula Injection, which displays an apostrophe to the end user.
**Learning:** Prepending a tab character (`\t`) to fields starting with dangerous characters (`=`, `+`, `-`, `@`, `\t`, `\r`) safely mitigates Formula Injection in spreadsheet applications like Excel without visibly displaying an apostrophe to the end user.
**Prevention:** Use a tab character (`\t`) instead of a single quote (`'`) when escaping fields for CSV exports.