import { mount } from "svelte";
import "@slides/deck/deck.css";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/eb-garamond/wght-italic.css";
import "@fontsource-variable/jetbrains-mono";
import "./theme.css";
import App from "./App.svelte";

mount(App, { target: document.body });
