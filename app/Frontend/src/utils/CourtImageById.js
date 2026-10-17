import { getCourtImage } from "./CourtImage";

const imagesByType = {
  STANDARD_INDOOR: [
    "StandardIndoor_1.webp",
    "StandardIndoor_2.webp",
    "StandardIndoor_3.webp",
    "StandardIndoor_4.webp",
    "StandardIndoor_5.webp",
  ],
  STANDARD_OUTDOOR: [
    "StandardOutdoor_1.webp",
    "StandardOutdoor_2.webp",
    "StandardOutdoor_3.webp",
  ],
  VIP_INDOOR: [
    "VipIndoor_1.webp",
    "VipIndoor_2.webp",
    "VipIndoor_3.webp",
  ],
};

export function getCourtImageById(court) {
  const images =
    imagesByType[court?.courtType] ?? imagesByType.STANDARD_INDOOR;

  const id = Number(court?.id) || 0;
  const imageName = images[id % images.length];

  return getCourtImage(imageName);
}