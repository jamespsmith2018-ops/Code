import { defineConfig } from 'vite';

// BASE_PATH lets the same build work at a domain root ("/") or under a
// sub-path such as GitHub Pages project sites ("/<repo>/").
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
});
