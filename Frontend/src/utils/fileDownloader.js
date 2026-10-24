/**
 * Utility function to trigger browser download of code files.
 */
export const downloadCodeFile = (content, filename = "file", language = "txt") => {
  let mimeType = "text/plain";
  let fileExtension = "txt";

  switch (language) {
    case "python":
      mimeType = "text/x-python";
      fileExtension = "py";
      break;
    case "javascript":
      mimeType = "application/javascript";
      fileExtension = "js";
      break;
    case "c":
      mimeType = "text/x-c";
      fileExtension = "c";
      break;
    case "cpp":
      mimeType = "text/x-c++src";
      fileExtension = "cpp";
      break;
    case "java":
      mimeType = "text/x-java";
      fileExtension = "java";
      break;
    case "csharp":
      mimeType = "application/x-csharp";
      fileExtension = "cs";
      break;
    case "go":
      mimeType = "text/x-go";
      fileExtension = "go";
      break;
    case "rust":
      mimeType = "text/x-rust";
      fileExtension = "rs";
      break;
    case "verilog":
      mimeType = "text/x-verilog";
      fileExtension = "v";
      break;
    case "sql":
      mimeType = "application/sql";
      fileExtension = "sql";
      break;
    case "mongodb":
      mimeType = "application/javascript";
      fileExtension = "js";
      break;
    case "swift":
      mimeType = "application/x-swift";
      fileExtension = "swift";
      break;
    case "ruby":
      mimeType = "text/x-ruby";
      fileExtension = "rb";
      break;
    case "typescript":
      mimeType = "application/typescript";
      fileExtension = "ts";
      break;
    case "dart":
      mimeType = "application/dart";
      fileExtension = "dart";
      break;
    case "kotlin":
      mimeType = "application/x-java";
      fileExtension = "kt";
      break;
    case "perl":
      mimeType = "application/x-perl";
      fileExtension = "pl";
      break;
    case "scala":
      mimeType = "application/scala";
      fileExtension = "scala";
      break;
    case "julia":
      mimeType = "application/x-julia";
      fileExtension = "jl";
      break;
    case "html":
      mimeType = "text/html";
      fileExtension = "html";
      break;
    case "css":
      mimeType = "text/css";
      fileExtension = "css";
      break;
    default:
      mimeType = "application/octet-stream";
      fileExtension = "txt";
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${fileExtension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default downloadCodeFile;
