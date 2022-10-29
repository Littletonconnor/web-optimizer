import gradientString from "gradient-string";

const gradient = gradientString([
  "#B94C98",
  "#C24189",
  "#CB3579",
  "#D52A6A",
  "#DE1E5A",
  "#E7134B",
  "#F0073B",
]);

const TITLE = "Web Optimizer";

const ASSETS = {
  svg: ["svg"],
  image: ["jpg", "png", "webp"],
  video: ["mp4", "webm"],
};

const DEVICE_SIZES = [
  "640",
  "750",
  "828",
  "1080",
  "1200",
  "1920",
  "2048",
  "3840",
];

const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384];

export { gradient, TITLE, ASSETS, DEVICE_SIZES, IMAGE_SIZES };
