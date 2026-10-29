> Historical PresencePal document retained for reference. MyGamesThing architecture and current behavior are documented in README.md.

# Product

## Register

product

## Users

Anyone who has ever looked at their Discord status and wanted it to be different. Two groups, weighted equally:

- **Casual mobile players** who want Clash Royale or Brawl Stars to show up alongside their PC friends. They open PresencePal once, find their game, hit Launch, and forget about it.
- **Discord power users** who manage their presence deliberately — care what their profile says, tweak it often, know exactly which exe Discord expects.

Both groups share the same context: the app is open in the background while they play. They interact with it briefly, then leave. Density is fine; interruption is not.

## Product Purpose

PresencePal sets your Discord game activity to any game Discord can't detect on its own — mobile titles, console ports, anything. It works by spawning a renamed stub process that Discord's scanner picks up by name. The companion mobile web app lets users control their status from their phone over local WiFi.

Success looks like: open, find game, launch, see Discord update. Under ten seconds.

## Brand Personality

Quiet confidence. Polished and capable, but never showy. Like a well-made mechanical keyboard — you notice the quality, not the branding. Three words: **precise, understated, reliable**.

Voice: direct and informative. No hype copy, no exclamation marks, no "amazing" or "powerful." Tells the user what's happening, not how to feel about it.

## Anti-references

- **Discord clone.** No blurple, no pill buttons, no server-sidebar DNA. PresencePal works next to Discord, not inside it. It should look like it belongs to a different, quieter category.
- **RGB gaming aesthetic.** No neon gradients, no glow grids, no Razer-style visual noise. The user's gaming setup is already loud — PresencePal is the calm instrument they reach for.
- **Generic SaaS dashboard.** No hero metrics, no blue-on-white card grids, no Figma-template energy.

## Design Principles

1. **Tool, not toy.** Every element exists to move the user toward "now playing." Decorative chrome is waste. If it doesn't communicate state or enable action, cut it.
2. **Status earns attention.** Feedback (live, scanning, stopped) should be immediately readable at a glance — not buried, not animated for drama. The status IS the product.
3. **Distance from Discord.** Own visual language. The app sits beside Discord all day; if it looks like Discord's cousin, it disappears into the noise. Different palette, different geometry.
4. **Motion is a cost.** With reduced-motion users in mind, every animation needs a functional justification. Transitions communicate state change; they don't entertain.
5. **Confidence without authority.** The tone is matter-of-fact, never commanding. The app doesn't instruct the user — it responds to them.

## Accessibility & Inclusion

- Reduced motion is a first-class concern. No ambient loops, no auto-playing animations. State changes may use short transitions (under 200ms) when they communicate meaning.
- Readable contrast as a baseline — dark theme with sufficient text contrast.
- Keyboard navigability for core actions (search, launch, stop).
- No specific WCAG level mandated, but reduced-motion `prefers-reduced-motion` support is expected.
