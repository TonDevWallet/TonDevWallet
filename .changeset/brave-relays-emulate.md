---
'ton_dev_wallet': patch
---

Fixed transaction emulation not re-running when the input message cell changes. Stale transactions from a previous emulation no longer leak into the new result.
