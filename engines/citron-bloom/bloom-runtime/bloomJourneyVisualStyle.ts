/**
 * Style index for {@link CitronBloomComposer.setJourneyVisual} — matches `journeyVisualPass` shader branches.
 * Journey sections 0–5: scroll story. Experience ids 20–22: standalone bloom demos / stomp.
 */
export function resolveBloomJourneyVisualStyle(experienceId: string, journeySection?: number): number {
  if (experienceId === 'flower' && journeySection !== undefined) {
    return journeySection;
  }
  if (experienceId === 'stomp') return 20;
  if (experienceId === 'particleforest') return 21;
  if (experienceId === 'particleinterior') return 22;
  return 20;
}
