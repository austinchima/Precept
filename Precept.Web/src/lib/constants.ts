import type { Testimonial } from '../components/ui/sign-in';

/**
 * Success stories from real Precept users.
 * Add new entries here as users land roles using the platform.
 *
 * Each entry needs:
 *   - avatarSrc:  URL to a headshot (ideally ≤150px, square crop)
 *   - name:       Full name
 *   - handle:     Role title or short descriptor
 *   - text:       One- or two-sentence quote about their experience
 *
 * The sign-in page displays up to 3 testimonials on the right panel.
 * They are hidden automatically when the array is empty.
 */
export const SUCCESS_STORIES: Testimonial[] = [
  // Example (uncomment and replace when you have a real story):
  // {
  //   avatarSrc: "https://example.com/photo.jpg",
  //   name: "Jane Doe",
  //   handle: "Software Engineer @ Google",
  //   text: "Precept helped me organize my interview prep and I landed my dream role in 3 weeks.",
  // },
];
