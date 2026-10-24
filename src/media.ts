/**
 * Stock media, all under the Pexels license. Videos stream from the Pexels CDN; each has a poster
 * so the page still looks finished on a slow connection or before playback starts.
 */
const photo = (id: number, w = 1400) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export type Clip = { src: string; poster: string };

export const VIDEO = {
  dunes: {
    src: "https://videos.pexels.com/video-files/26346980/11948956_1920_1080_60fps.mp4",
    poster: "https://images.pexels.com/videos/26346980/4k-video-aerial-aerial-footage-aerial-shot-26346980.jpeg?auto=compress&w=1600",
  },
  mosquePool: {
    src: "https://videos.pexels.com/video-files/9557205/9557205-hd_1280_720_60fps.mp4",
    poster: "https://images.pexels.com/videos/9557205/pexels-photo-9557205.jpeg?auto=compress&w=1600",
  },
  lab: {
    src: "https://videos.pexels.com/video-files/31767898/13534097_1280_720_25fps.mp4",
    poster: "https://images.pexels.com/videos/31767898/man-working-in-a-laboratory-31767898.jpeg?auto=compress&w=1400",
  },
  hands: {
    src: "https://videos.pexels.com/video-files/34740733/14727068_1280_720_25fps.mp4",
    poster: "https://images.pexels.com/videos/34740733/pexels-photo-34740733.jpeg?auto=compress&w=1400",
  },
  arches: {
    src: "https://videos.pexels.com/video-files/16998220/16998220-hd_1920_1080_30fps.mp4",
    poster: "https://images.pexels.com/videos/16998220/abu-dhabi-mosque-sheikh-zayed-grand-mosque-16998220.jpeg?auto=compress&w=1600",
  },
} satisfies Record<string, Clip>;

export const PHOTO = {
  coupleDesert: photo(20734803, 1000),
  walkingAway: photo(10720914, 1000),
  celebration: photo(36152165, 1000),
  counselling: photo(7578798, 1000),
  readingAlone: photo(8121991, 1000),
  phoneStreet: photo(6084425, 900),
  generations: photo(7854107, 1000),
  lab: photo(6183247, 1000),
};

export const CREDITS =
  "Lukas Rodriguez, Atif Dar, Dominik Zítka, Dishant Babariya, Denon Studio, Oussama Zidane, Omzi, cottonbro studio, MART PRODUCTION, Kampus Production, Keira Burton, Katarzyna Modrzejewska";
