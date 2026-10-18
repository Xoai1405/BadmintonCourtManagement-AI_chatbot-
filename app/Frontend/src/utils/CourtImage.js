import.meta.glob;
const courtImages = import.meta.glob(
  "../assets/CourtImage/**/*.{webp,png,jpg,jpeg}",
  {
    eager: true,
    import: "default",
  }
);

const imageMap = Object.entries(courtImages).reduce(
  (map, [path, imageUrl]) => {
    const fileName = path.split("/").pop();
    map[fileName] = imageUrl;
    return map;
  },
  {}
);
export function getCourtImage(imageName) {
  return imageMap[imageName] ?? imageMap["StandardIndoor_1.webp"];
}