/**
 * Act 2 copy — replace `partners` with teams you are cleared to list.
 */
export interface WorkPartner {
  readonly id: string;
  readonly name: string;
  readonly context: string;
  readonly website?: string;
}

export const WORK_TITLE = 'Selected work & collaborators';

export const WORK_SUBTITLE =
  'A tight slice of the teams and builds we have partnered with.';

export const WORK_TAGLINE =
  'Claude Code · Framer Motion · 21st.dev — production surfaces, not pitch decks.';

export const WORK_PARTNERS: readonly WorkPartner[] = [
  { id: '1', name: 'Aperture Labs', context: 'Product surfaces' },
  { id: '2', name: 'Northline', context: 'Realtime & simulation UX' },
  { id: '3', name: 'Helio', context: 'Fintech design systems' },
  { id: '4', name: 'Lumen', context: 'Health portals' },
  { id: '5', name: 'NOOCAP', context: "Creators' AI stack" },
];
