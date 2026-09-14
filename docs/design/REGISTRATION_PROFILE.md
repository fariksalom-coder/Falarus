# Partner questionnaire moved to registration — 2026-09-10

New registrations already enter /onboarding from RegisterPage. The existing
six learning questions now lead to a seventh step containing PartnerProfileForm.
Profile data is saved through the existing /api/partner/profile upsert, then
/api/onboarding marks the learning questionnaire complete. Navigation home
happens only after both requests succeed. Retrying after the second request
fails safely updates the same profile. Existing onboarding save failures were
previously ignored; they now appear in the form and keep the user on this step.
The login-screen Google new-user path now also enters onboarding.

PartnerPage no longer renders a creation form or edit-form overlay. Legacy
users without a profile and users editing their profile navigate to
/profile/anketa. That standalone page loads existing answers before rendering
an editable form. Read errors show a retry action rather than an empty form;
this avoids overwriting saved answers. Existing browsing and chat functionality
stays in place. Existing accounts are not globally redirected to onboarding.

No schema migration, student-record rewrite, new provider or backend change.
The questionnaire's existing fields, visibility and save endpoint are retained.
Form submission is guarded against duplicates; onboarding back navigation is
disabled while saving, including the initial profile request.

Validation: local TypeScript and production build passed. Browser tests used
intercepted synthetic API responses only: seven steps, profile-before-onboarding
write order, failed completion stays on form, retry succeeds, no form in chat,
prefilled existing answers, failed read cannot overwrite, successful read retry.
No runtime errors. See registration-profile-check.json.

Deployment backup: /home/ubuntu/backups/registration-profile-before-20260910.tar.gz.
The nine-file manifest includes only the new route/setup page, questionnaire
integration, auth redirect, profile API reader, chat form removal and PWA v45.
