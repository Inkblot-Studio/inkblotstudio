/**
 * Contact form: flip `LOCAL_DRY_RUN` to `true` when tuning UI/UX so submissions are
 * validated locally and the success state runs with **no** Web3Forms call.
 * Set back to `false` before production deploy (or set `VITE_CONTACT_FORM_DRY_RUN=false` in .env).
 *
 * `VITE_CONTACT_FORM_DRY_RUN` in .env, when set, overrides this file (`"true"` / `"false"`).
 */
const LOCAL_DRY_RUN = true;

const env = import.meta.env.VITE_CONTACT_FORM_DRY_RUN;
export const contactFormDryRun: boolean =
  env !== undefined && env !== '' ? env === 'true' : LOCAL_DRY_RUN;
