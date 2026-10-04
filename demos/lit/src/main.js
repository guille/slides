import "@slides/deck/deck.css";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/public-sans";
import "@fontsource/noto-sans-tagalog";
import "./theme.css";
import "./components/ph-count.js";
import "./components/ph-timeline.js";
import "./components/ph-eras.js";
import "./components/ph-galleon.js";
import "./components/ph-baybayin.js";
import "./components/ph-sun.js";
import { deck } from "@slides/deck";

deck(document.querySelector(".deck"));
