SEA FARM STAGE 2 - TEST BEFORE LIVE DEPLOYMENT

Stage 1 SQL must already be installed. Upload the changed files to GitHub only after testing on a staging branch/site.
Changed: index.html, assets/02-supabase.js, assets/personal-sync.js; new assets/farm-ui.js.
The app uses the same existing calculators and UI with a separate data slice per farm.
Admin: select Sea Farm in the farm bar (or animal form) before adding an animal or recipe.
Test: verify Main Farm 172 animals / 5622 recipes; Sea Farm initially 0/0; add a sea tier-1 animal; switch back and confirm Main Farm unchanged; check both inventories and cloud sync on two devices.
WARNING: The older website version does not understand the new farms cloud-sync payload. Do not run old and new versions on different devices while cloud sync is enabled. Disable sync on older devices until all are updated.
For rollback, restore previous website files and disable cloud sync before switching back. Database migration is additive.
