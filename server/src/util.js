// Small shared helpers.
const sanitizeHtml = require("sanitize-html");

function slugify(text) {
  return String(text).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180) || "item";
}

// Blog article body written in the admin editor
function cleanBlogHtml(html) {
  return sanitizeHtml(String(html || ""), {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "blockquote",
      "ul", "ol", "li", "a", "img", "figure", "figcaption", "hr", "span", "code", "pre"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"], span: ["class"], "*": [] },
    allowedClasses: { span: ["ql-size-small", "ql-size-large"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    // relative links such as /uploads/public/... (images uploaded in the admin) are allowed
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener", target: "_blank" }) },
  });
}

// Job description: a paragraph with optional bold / highlighted words
function cleanJobHtml(html) {
  return sanitizeHtml(String(html || ""), {
    allowedTags: ["strong", "b", "em", "br", "span"],
    allowedAttributes: {},
  });
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

module.exports = { slugify, cleanBlogHtml, cleanJobHtml, isEmail, str };
