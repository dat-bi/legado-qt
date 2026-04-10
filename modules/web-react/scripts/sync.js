import { URL } from "node:url";
import fs from "node:fs";
import process from "node:process";

if (!process.env.GITHUB_ENV) {
  console.log("Local environment detected, proceeding with file copy...");
}

const LEGADO_ASSETS_WEB_REACT_DIR = new URL(
  "../../../app/src/main/assets/web/react",
  import.meta.url,
);
const REACT_DIST_DIR = new URL("../dist", import.meta.url);

console.log("> delete", LEGADO_ASSETS_WEB_REACT_DIR.pathname);
// Xóa thư mục cũ nếu có
fs.rm(
  LEGADO_ASSETS_WEB_REACT_DIR,
  {
    force: true,
    recursive: true,
  },
  (error) => {
    if (error) console.log(error);
    console.log("> mkdir", LEGADO_ASSETS_WEB_REACT_DIR.pathname);
    fs.mkdir(LEGADO_ASSETS_WEB_REACT_DIR, { recursive: true }, (error) => {
      if (error) return console.error(error);
      console.log("> cp dist files from", REACT_DIST_DIR.pathname);
      fs.cp(
        REACT_DIST_DIR,
        LEGADO_ASSETS_WEB_REACT_DIR,
        {
          recursive: true,
        },
        (error) => {
          if (error) {
            console.warn("> cp error, you may copy files yourself");
            throw error;
          }
          console.log("> cp success");
        },
      );
    });
  },
);
