> **THE CHARTER GOVERNS.** Read `~/Bastion/THE-CHARTER.md` in full before the
> first action of this session — the four ground laws (resolve never report ·
> research primary sources · always exceed · open with what is working), the
> product standard, the board, and the architecture doctrine. It is also the
> head of `~/Bastion/STANDING_ORDERS.md` = `~/CLAUDE.md`. When a default and a
> law disagree, the law wins. Anything in this file that conflicts loses.

# Project Instructions

## Docs Image Workflow

When updating documentation that involves new screenshots or images:

1. Prompt the user to copy the image to their clipboard (Cmd+C)
2. Run: `python scripts/save_clipboard.py <target_path>`
3. Example: `python scripts/save_clipboard.py docs/images/agent-step.png`

This saves the clipboard image directly to the docs folder without manual file management.
