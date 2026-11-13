/** @type {import('next').NextConfig} */
const nextConfig = {
  // The sample-fixture PDFs are read from disk inside the API route, so they
  // must be traced into the serverless function bundle.
  outputFileTracingIncludes: {
    "/api/analyze-sample/**": ["./public/samples/**"],
    "/api/status": ["./public/samples/**"],
  },
};
export default nextConfig;
