## 2024-05-10 - Missing lazy loading in custom list components
**Learning:** Found multiple list and grid components (GameCard, ArticleCard, ShopCrates) using native `<img>` tags without `loading="lazy"` instead of the Next.js `<Image>` component, which can negatively impact initial page load time on catalog and feed pages.
**Action:** When adding or auditing image-heavy lists, ensure native `<img>` tags include `loading="lazy"` and `decoding="async"` if `<Image>` is not appropriate or available.
