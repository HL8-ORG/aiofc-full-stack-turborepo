// import { glob } from "glob";
// import path from "path";

// export const dynamic = "force-static";
// export default function sitemap() {
//   const baseUrl = process.env.BASE_URL;
//   const defaultChangeFrequency = "monthly";
//   const defaultPriority = 0.5;

//   const pageFiles = glob.sync("app/**/page.tsx");

//   const paths = pageFiles.map((file) => {
//     const relativePath = path.relative("app", file);
//     const urlPath = `/${relativePath.replace(/\/page\.tsx$/, "")}`;
//     return urlPath === "/index" ? "/" : urlPath;
//   });

//   return paths.map((path) => {
//     let changeFrequency = defaultChangeFrequency;
//     let priority = defaultPriority;

//     if (path === "/") {
//       changeFrequency = "monthly";
//       priority = 1;
//     } else if (path === "/about") {
//       changeFrequency = "monthly";
//       priority = 1;
//     } else if (path === "/blog") {
//       changeFrequency = "weekly";
//       priority = 0.8;
//     } else {
//       changeFrequency = "yearly";
//       priority = 0.8;
//     }

//     return {
//       url: `${baseUrl}${path}`,
//       lastModified: new Date(),
//       changeFrequency,
//       priority,
//     };
//   });
// }
